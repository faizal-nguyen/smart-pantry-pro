"""
Celery tasks for async video processing queue
"""
import os
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from celery import Celery
from celery.exceptions import Retry
from kombu import Queue

from config import settings
from video_processor import VideoProcessor, create_video_id, ProcessingResult
from frame_extractor import FrameExtractor
from audio_transcriber import AudioTranscriber
from text_extractor import TextExtractor


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    'video_processor',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['celery_tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.PROCESS_TIMEOUT,
    task_soft_time_limit=settings.PROCESS_TIMEOUT - 60,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=50,
    result_expires=3600,  # Results expire after 1 hour
)

# Define task queues
celery_app.conf.task_routes = {
    'celery_tasks.process_video_from_url': {'queue': 'video_download'},
    'celery_tasks.process_video_from_file': {'queue': 'video_processing'},
    'celery_tasks.extract_frames': {'queue': 'frame_extraction'},
    'celery_tasks.transcribe_audio': {'queue': 'audio_processing'},
    'celery_tasks.extract_text': {'queue': 'text_extraction'},
    'celery_tasks.cleanup_video_files': {'queue': 'cleanup'},
}

# Task queues configuration
celery_app.conf.task_queues = (
    Queue('video_download', routing_key='video_download'),
    Queue('video_processing', routing_key='video_processing'),
    Queue('frame_extraction', routing_key='frame_extraction'),
    Queue('audio_processing', routing_key='audio_processing'),
    Queue('text_extraction', routing_key='text_extraction'),
    Queue('cleanup', routing_key='cleanup'),
)


# Task status constants
TASK_STATUS = {
    'PENDING': 'PENDING',
    'PROCESSING': 'PROCESSING', 
    'SUCCESS': 'SUCCESS',
    'FAILURE': 'FAILURE',
    'RETRY': 'RETRY'
}


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def process_video_from_url(self, url: str, video_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Complete video processing pipeline from URL
    
    Args:
        url: Video URL to download and process
        video_id: Optional video ID (will be generated if not provided)
        
    Returns:
        Processing result dictionary
    """
    if not video_id:
        video_id = create_video_id()
    
    try:
        logger.info(f"Starting video processing from URL: {url} (ID: {video_id})")
        
        # Update task state
        self.update_state(
            state=TASK_STATUS['PROCESSING'],
            meta={
                'video_id': video_id,
                'step': 'downloading',
                'progress': 10,
                'message': 'Downloading video from URL'
            }
        )
        
        # Initialize processor
        processor = VideoProcessor()
        
        # Download video (run in executor since it's async)
        success, video_path_or_error, video_info = asyncio.run(processor.download_video(url, video_id))
        if not success:
            raise Exception(f"Download failed: {video_path_or_error}")
        
        video_path = video_path_or_error
        
        # Update progress
        self.update_state(
            state=TASK_STATUS['PROCESSING'],
            meta={
                'video_id': video_id,
                'step': 'processing',
                'progress': 30,
                'message': 'Processing downloaded video',
                'video_info': video_info.dict() if video_info else None
            }
        )
        
        # Chain to video processing
        result = asyncio.run(process_video_pipeline(video_path, video_id, self))
        
        logger.info(f"Video processing completed for {video_id}")
        return result
        
    except Exception as exc:
        logger.error(f"Video processing from URL failed: {str(exc)}")
        
        # Cleanup on failure
        cleanup_video_files.delay(video_id)
        
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task, attempt {self.request.retries + 1}")
            raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
        
        return {
            'video_id': video_id,
            'status': TASK_STATUS['FAILURE'],
            'error': str(exc),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def process_video_from_file(self, file_path: str, video_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Complete video processing pipeline from uploaded file
    
    Args:
        file_path: Path to uploaded video file
        video_id: Optional video ID (will be generated if not provided)
        
    Returns:
        Processing result dictionary
    """
    if not video_id:
        video_id = create_video_id()
    
    try:
        logger.info(f"Starting video processing from file: {file_path} (ID: {video_id})")
        
        # Update task state
        self.update_state(
            state=TASK_STATUS['PROCESSING'],
            meta={
                'video_id': video_id,
                'step': 'initializing',
                'progress': 10,
                'message': 'Initializing video processing'
            }
        )
        
        # Process video pipeline
        result = asyncio.run(process_video_pipeline(file_path, video_id, self))
        
        logger.info(f"Video processing completed for {video_id}")
        return result
        
    except Exception as exc:
        logger.error(f"Video processing from file failed: {str(exc)}")
        
        # Cleanup on failure
        cleanup_video_files.delay(video_id)
        
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task, attempt {self.request.retries + 1}")
            raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
        
        return {
            'video_id': video_id,
            'status': TASK_STATUS['FAILURE'],
            'error': str(exc),
            'timestamp': datetime.utcnow().isoformat()
        }


async def process_video_pipeline(video_path: str, video_id: str, task_instance) -> Dict[str, Any]:
    """
    Main video processing pipeline
    
    Args:
        video_path: Path to video file
        video_id: Unique video identifier
        task_instance: Celery task instance for progress updates
        
    Returns:
        Complete processing result
    """
    try:
        result = ProcessingResult(
            video_id=video_id,
            status=TASK_STATUS['PROCESSING'],
            video_path=video_path
        )
        
        # Step 1: Extract frames
        task_instance.update_state(
            state=TASK_STATUS['PROCESSING'],
            meta={
                'video_id': video_id,
                'step': 'frame_extraction',
                'progress': 40,
                'message': 'Extracting frames from video'
            }
        )
        
        frame_extractor = FrameExtractor()
        success, frame_paths, error = asyncio.run(frame_extractor.extract_frames(video_path, video_id))
        
        if not success:
            logger.warning(f"Frame extraction failed: {error}")
            frame_paths = []
        else:
            result.frames_path = str(settings.PROCESSED_DIR / video_id / "frames")
        
        # Step 2: Audio transcription
        task_instance.update_state(
            state=TASK_STATUS['PROCESSING'],
            meta={
                'video_id': video_id,
                'step': 'audio_transcription',
                'progress': 60,
                'message': 'Transcribing audio'
            }
        )
        
        transcriber = AudioTranscriber()
        success, transcription, error = asyncio.run(transcriber.transcribe_video(video_path, video_id))
        
        if success and transcription:
            result.transcription = transcription.dict()
            result.audio_path = str(settings.PROCESSED_DIR / video_id / "audio.wav")
        else:
            logger.warning(f"Audio transcription failed: {error}")
        
        # Step 3: Text extraction (OCR)
        task_instance.update_state(
            state=TASK_STATUS['PROCESSING'],
            meta={
                'video_id': video_id,
                'step': 'text_extraction',
                'progress': 80,
                'message': 'Extracting text from frames'
            }
        )
        
        if frame_paths:
            text_extractor = TextExtractor()
            success, ocr_result, error = asyncio.run(text_extractor.extract_text_from_frames(frame_paths, video_id))
            
            if success and ocr_result:
                result.extracted_text = [detection.dict() for detection in ocr_result.detections]
            else:
                logger.warning(f"Text extraction failed: {error}")
        
        # Step 4: Finalization
        task_instance.update_state(
            state=TASK_STATUS['PROCESSING'],
            meta={
                'video_id': video_id,
                'step': 'finalizing',
                'progress': 95,
                'message': 'Finalizing processing results'
            }
        )
        
        # Save complete result
        asyncio.run(save_processing_result(result))
        
        # Mark as completed
        result.status = TASK_STATUS['SUCCESS']
        
        # Schedule cleanup
        cleanup_video_files.apply_async(
            args=[video_id],
            countdown=3600  # Clean up after 1 hour
        )
        
        return {
            'video_id': video_id,
            'status': TASK_STATUS['SUCCESS'],
            'result': result.dict(),
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Video processing pipeline failed: {str(e)}")
        raise


@celery_app.task(bind=True, max_retries=1)
def extract_frames(self, video_path: str, video_id: str) -> Dict[str, Any]:
    """
    Extract frames from video (standalone task)
    
    Args:
        video_path: Path to video file
        video_id: Unique video identifier
        
    Returns:
        Frame extraction result
    """
    try:
        logger.info(f"Extracting frames for video {video_id}")
        
        extractor = FrameExtractor()
        success, frame_paths, error = asyncio.run(extractor.extract_frames(video_path, video_id))
        
        if success:
            return {
                'video_id': video_id,
                'status': TASK_STATUS['SUCCESS'],
                'frame_paths': frame_paths,
                'frame_count': len(frame_paths),
                'timestamp': datetime.utcnow().isoformat()
            }
        else:
            raise Exception(f"Frame extraction failed: {error}")
            
    except Exception as exc:
        logger.error(f"Frame extraction task failed: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)
        
        return {
            'video_id': video_id,
            'status': TASK_STATUS['FAILURE'],
            'error': str(exc),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery_app.task(bind=True, max_retries=1)
def transcribe_audio(self, video_path: str, video_id: str, language: Optional[str] = None) -> Dict[str, Any]:
    """
    Transcribe audio from video (standalone task)
    
    Args:
        video_path: Path to video file
        video_id: Unique video identifier
        language: Language for transcription
        
    Returns:
        Transcription result
    """
    try:
        logger.info(f"Transcribing audio for video {video_id}")
        
        transcriber = AudioTranscriber()
        success, transcription, error = asyncio.run(transcriber.transcribe_video(video_path, video_id, language))
        
        if success and transcription:
            return {
                'video_id': video_id,
                'status': TASK_STATUS['SUCCESS'],
                'transcription': transcription.dict(),
                'timestamp': datetime.utcnow().isoformat()
            }
        else:
            raise Exception(f"Transcription failed: {error}")
            
    except Exception as exc:
        logger.error(f"Audio transcription task failed: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60)
        
        return {
            'video_id': video_id,
            'status': TASK_STATUS['FAILURE'],
            'error': str(exc),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery_app.task(bind=True, max_retries=1)
def extract_text(self, frame_paths: list, video_id: str) -> Dict[str, Any]:
    """
    Extract text from video frames (standalone task)
    
    Args:
        frame_paths: List of frame image paths
        video_id: Unique video identifier
        
    Returns:
        Text extraction result
    """
    try:
        logger.info(f"Extracting text for video {video_id}")
        
        extractor = TextExtractor()
        success, ocr_result, error = asyncio.run(extractor.extract_text_from_frames(frame_paths, video_id))
        
        if success and ocr_result:
            return {
                'video_id': video_id,
                'status': TASK_STATUS['SUCCESS'],
                'ocr_result': ocr_result.dict(),
                'timestamp': datetime.utcnow().isoformat()
            }
        else:
            raise Exception(f"Text extraction failed: {error}")
            
    except Exception as exc:
        logger.error(f"Text extraction task failed: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60)
        
        return {
            'video_id': video_id,
            'status': TASK_STATUS['FAILURE'],
            'error': str(exc),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery_app.task
def cleanup_video_files(video_id: str) -> Dict[str, Any]:
    """
    Clean up temporary files for processed video
    
    Args:
        video_id: Unique video identifier
        
    Returns:
        Cleanup result
    """
    try:
        logger.info(f"Cleaning up files for video {video_id}")
        
        processor = VideoProcessor()
        processor.cleanup_files(video_id)
        
        # Also clean up upload files (optional)
        upload_files = list(settings.UPLOAD_DIR.glob(f"{video_id}*"))
        for file_path in upload_files:
            try:
                file_path.unlink()
                logger.debug(f"Deleted upload file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete upload file {file_path}: {e}")
        
        return {
            'video_id': video_id,
            'status': 'SUCCESS',
            'message': 'Files cleaned up successfully',
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cleanup failed for video {video_id}: {str(e)}")
        return {
            'video_id': video_id,
            'status': 'FAILURE',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery_app.task
def get_task_status(task_id: str) -> Dict[str, Any]:
    """
    Get detailed task status information
    
    Args:
        task_id: Celery task ID
        
    Returns:
        Task status information
    """
    try:
        result = celery_app.AsyncResult(task_id)
        
        status_info = {
            'task_id': task_id,
            'status': result.state,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if result.state == 'PENDING':
            status_info.update({
                'progress': 0,
                'message': 'Task is waiting to be processed'
            })
        elif result.state == 'PROCESSING':
            status_info.update(result.info)
        elif result.state == 'SUCCESS':
            status_info.update({
                'progress': 100,
                'result': result.result,
                'message': 'Task completed successfully'
            })
        elif result.state == 'FAILURE':
            status_info.update({
                'progress': 0,
                'error': str(result.info),
                'message': 'Task failed'
            })
        
        return status_info
        
    except Exception as e:
        return {
            'task_id': task_id,
            'status': 'ERROR',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


# Utility functions
async def save_processing_result(result: ProcessingResult):
    """Save complete processing result to file"""
    try:
        import json
        
        output_dir = settings.PROCESSED_DIR / result.video_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        result_path = output_dir / "processing_result.json"
        
        with open(result_path, 'w', encoding='utf-8') as f:
            json.dump(result.dict(), f, ensure_ascii=False, indent=2)
        
        logger.info(f"Processing result saved for {result.video_id}")
        
    except Exception as e:
        logger.error(f"Failed to save processing result: {str(e)}")


def get_queue_status() -> Dict[str, Any]:
    """Get status of all task queues"""
    try:
        inspect = celery_app.control.inspect()
        
        return {
            'active_tasks': inspect.active(),
            'scheduled_tasks': inspect.scheduled(),
            'reserved_tasks': inspect.reserved(),
            'stats': inspect.stats(),
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get queue status: {str(e)}")
        return {
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


# Periodic tasks
@celery_app.task
def cleanup_old_files():
    """Clean up files older than configured retention period"""
    try:
        cutoff_time = datetime.now() - timedelta(days=1)  # 1 day retention
        
        # Clean up processed files
        for video_dir in settings.PROCESSED_DIR.iterdir():
            if video_dir.is_dir():
                try:
                    # Check if directory is old enough
                    if datetime.fromtimestamp(video_dir.stat().st_mtime) < cutoff_time:
                        import shutil
                        shutil.rmtree(video_dir)
                        logger.info(f"Cleaned up old processed files: {video_dir}")
                except Exception as e:
                    logger.warning(f"Failed to clean up directory {video_dir}: {e}")
        
        # Clean up upload files
        for upload_file in settings.UPLOAD_DIR.iterdir():
            if upload_file.is_file():
                try:
                    if datetime.fromtimestamp(upload_file.stat().st_mtime) < cutoff_time:
                        upload_file.unlink()
                        logger.info(f"Cleaned up old upload file: {upload_file}")
                except Exception as e:
                    logger.warning(f"Failed to clean up upload file {upload_file}: {e}")
        
        logger.info("Periodic cleanup completed")
        
    except Exception as e:
        logger.error(f"Periodic cleanup failed: {str(e)}")


# Setup periodic tasks
celery_app.conf.beat_schedule = {
    'cleanup-old-files': {
        'task': 'celery_tasks.cleanup_old_files',
        'schedule': 3600.0,  # Run every hour
    },
}

celery_app.conf.timezone = 'UTC'