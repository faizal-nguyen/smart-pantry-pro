"""
FastAPI application for video processing backend
"""
import os
import json
import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

import aiofiles
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Depends, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, HttpUrl, validator
import uvicorn

from config import settings, ERROR_MESSAGES
from video_processor import VideoProcessor, VideoInfo, create_video_id
from frame_extractor import FrameExtractor
from audio_transcriber import AudioTranscriber, get_supported_languages
from text_extractor import TextExtractor, estimate_ocr_cost
from celery_tasks import (
    process_video_from_url, process_video_from_file, 
    get_task_status, get_queue_status, celery_app
)


# Initialize FastAPI app
app = FastAPI(
    title="Video Processing API",
    description="Complete video processing pipeline with frame extraction, transcription, and OCR",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)


# Request/Response models
class VideoUrlRequest(BaseModel):
    """Request model for video URL processing"""
    url: HttpUrl
    language: Optional[str] = None
    extract_frames: bool = True
    transcribe_audio: bool = True
    extract_text: bool = True
    
    @validator('language')
    def validate_language(cls, v):
        if v and v not in get_supported_languages():
            raise ValueError(f"Unsupported language: {v}")
        return v


class VideoUploadResponse(BaseModel):
    """Response model for video upload"""
    video_id: str
    task_id: str
    status: str
    message: str
    estimated_completion: Optional[str] = None


class TaskStatusResponse(BaseModel):
    """Response model for task status"""
    task_id: str
    video_id: Optional[str] = None
    status: str
    progress: int
    message: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: str


class ProcessingResultResponse(BaseModel):
    """Response model for processing results"""
    video_id: str
    status: str
    video_info: Optional[Dict[str, Any]] = None
    transcription: Optional[Dict[str, Any]] = None
    extracted_text: Optional[List[Dict[str, Any]]] = None
    frames_info: Optional[Dict[str, Any]] = None
    processing_time: Optional[float] = None
    timestamp: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    version: str
    services: Dict[str, str]


# Dependency functions
async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key if authentication is enabled"""
    # For now, we'll skip authentication in development
    # In production, implement proper API key validation
    if not settings.DEBUG:
        if not credentials or not credentials.credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required"
            )
    return credentials


# API endpoints
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Video Processing API",
        "version": "1.0.0",
        "status": "active",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    
    # Check services
    services_status = {}
    
    # Check Redis/Celery
    try:
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        services_status["celery"] = "healthy" if stats else "unhealthy"
    except Exception:
        services_status["celery"] = "unhealthy"
    
    # Check OpenAI API
    try:
        if settings.OPENAI_API_KEY:
            services_status["openai"] = "configured"
        else:
            services_status["openai"] = "not_configured"
    except Exception:
        services_status["openai"] = "error"
    
    # Check file system
    try:
        settings.UPLOAD_DIR.mkdir(exist_ok=True)
        settings.PROCESSED_DIR.mkdir(exist_ok=True)
        services_status["filesystem"] = "healthy"
    except Exception:
        services_status["filesystem"] = "unhealthy"
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
        services=services_status
    )


@app.post("/process/url", response_model=VideoUploadResponse)
async def process_video_url(
    request: VideoUrlRequest,
    credentials: HTTPAuthorizationCredentials = Depends(verify_api_key)
):
    """Process video from URL"""
    try:
        # Generate video ID
        video_id = create_video_id()
        
        # Submit task to Celery
        task = process_video_from_url.delay(
            url=str(request.url),
            video_id=video_id
        )
        
        # Estimate completion time (rough estimate)
        estimated_completion = datetime.utcnow().timestamp() + 300  # 5 minutes
        
        return VideoUploadResponse(
            video_id=video_id,
            task_id=task.id,
            status="submitted",
            message="Video processing started",
            estimated_completion=datetime.fromtimestamp(estimated_completion).isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit processing task: {str(e)}"
        )


@app.post("/process/upload", response_model=VideoUploadResponse)
async def process_video_upload(
    file: UploadFile = File(...),
    language: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(verify_api_key)
):
    """Process uploaded video file"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided"
            )
        
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in settings.SUPPORTED_VIDEO_FORMATS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported video format: {file_ext}"
            )
        
        # Generate video ID
        video_id = create_video_id()
        
        # Save uploaded file
        file_path = settings.UPLOAD_DIR / f"{video_id}{file_ext}"
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            
            # Check file size
            if len(content) > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=ERROR_MESSAGES['FILE_TOO_LARGE']
                )
            
            await f.write(content)
        
        # Submit task to Celery
        task = process_video_from_file.delay(
            file_path=str(file_path),
            video_id=video_id
        )
        
        return VideoUploadResponse(
            video_id=video_id,
            task_id=task.id,
            status="submitted",
            message="Video processing started"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process upload: {str(e)}"
        )


@app.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_processing_status(task_id: str):
    """Get processing status for a task"""
    try:
        status_info = get_task_status(task_id)
        
        return TaskStatusResponse(
            task_id=task_id,
            video_id=status_info.get('video_id'),
            status=status_info.get('status', 'unknown'),
            progress=status_info.get('progress', 0),
            message=status_info.get('message', ''),
            result=status_info.get('result'),
            error=status_info.get('error'),
            timestamp=status_info.get('timestamp', datetime.utcnow().isoformat())
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task status: {str(e)}"
        )


@app.get("/result/{video_id}", response_model=ProcessingResultResponse)
async def get_processing_result(video_id: str):
    """Get complete processing result for a video"""
    try:
        result_path = settings.PROCESSED_DIR / video_id / "processing_result.json"
        
        if not result_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Processing result not found"
            )
        
        async with aiofiles.open(result_path, 'r', encoding='utf-8') as f:
            content = await f.read()
            result_data = json.loads(content)
        
        return ProcessingResultResponse(
            video_id=video_id,
            status=result_data.get('status', 'unknown'),
            video_info=result_data.get('video_info'),
            transcription=result_data.get('transcription'),
            extracted_text=result_data.get('extracted_text'),
            frames_info=result_data.get('frames_info'),
            processing_time=result_data.get('processing_time'),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get processing result: {str(e)}"
        )


@app.get("/download/{video_id}/{file_type}")
async def download_file(video_id: str, file_type: str):
    """Download processed files"""
    try:
        video_dir = settings.PROCESSED_DIR / video_id
        
        if not video_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )
        
        file_mapping = {
            'transcription': 'transcription.json',
            'transcription_txt': 'transcription.txt', 
            'transcription_srt': 'transcription.srt',
            'ocr_results': 'ocr_results.json',
            'text_summary': 'text_summary.txt',
            'all_text': 'all_detected_text.txt',
            'processing_result': 'processing_result.json'
        }
        
        if file_type not in file_mapping:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Available: {list(file_mapping.keys())}"
            )
        
        file_path = video_dir / file_mapping[file_type]
        
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {file_type}"
            )
        
        return FileResponse(
            path=str(file_path),
            filename=f"{video_id}_{file_mapping[file_type]}",
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download file: {str(e)}"
        )


@app.get("/frames/{video_id}")
async def list_video_frames(video_id: str):
    """List available frames for a video"""
    try:
        frames_dir = settings.PROCESSED_DIR / video_id / "frames"
        
        if not frames_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Frames not found"
            )
        
        frames = []
        for frame_path in sorted(frames_dir.glob("*.jpg")):
            frames.append({
                'filename': frame_path.name,
                'timestamp': extract_timestamp_from_filename(frame_path.name),
                'size': frame_path.stat().st_size,
                'url': f"/frames/{video_id}/{frame_path.name}"
            })
        
        return {
            'video_id': video_id,
            'frame_count': len(frames),
            'frames': frames
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list frames: {str(e)}"
        )


@app.get("/frames/{video_id}/{frame_filename}")
async def get_video_frame(video_id: str, frame_filename: str):
    """Get a specific video frame"""
    try:
        frame_path = settings.PROCESSED_DIR / video_id / "frames" / frame_filename
        
        if not frame_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Frame not found"
            )
        
        return FileResponse(
            path=str(frame_path),
            media_type='image/jpeg'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get frame: {str(e)}"
        )


@app.get("/queue/status")
async def get_queue_status_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(verify_api_key)
):
    """Get status of processing queues"""
    try:
        queue_status = get_queue_status()
        return queue_status
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get queue status: {str(e)}"
        )


@app.get("/info/supported-languages")
async def get_supported_languages_endpoint():
    """Get list of supported languages for transcription"""
    return {
        'languages': get_supported_languages(),
        'default': settings.WHISPER_MODEL
    }


@app.get("/info/pricing")
async def get_pricing_info():
    """Get pricing information for processing"""
    return {
        'frame_extraction': {
            'cost_per_frame': 0.0,  # Free
            'description': 'Frame extraction using OpenCV is free'
        },
        'audio_transcription': {
            'cost_per_minute': 0.0,  # Free with Whisper
            'description': 'Audio transcription using Whisper is free'
        },
        'text_extraction': {
            'cost_per_frame': 0.01,  # Approximate OpenAI Vision API cost
            'description': 'Text extraction using OpenAI Vision API',
            'currency': 'USD'
        }
    }


@app.post("/estimate-cost")
async def estimate_processing_cost(request: Dict[str, Any]):
    """Estimate processing cost for video"""
    try:
        duration = request.get('duration', 0)
        frame_count = request.get('frame_count', 0)
        
        # If only duration provided, estimate frame count
        if duration and not frame_count:
            estimated_frames = min(
                int(duration // settings.FRAME_EXTRACTION_INTERVAL),
                settings.MAX_FRAMES_PER_VIDEO
            )
        else:
            estimated_frames = frame_count
        
        # Calculate costs
        ocr_cost = estimate_ocr_cost(estimated_frames)
        
        return {
            'estimated_frames': estimated_frames,
            'frame_extraction_cost': 0.0,
            'transcription_cost': 0.0,
            'ocr_cost': ocr_cost,
            'total_estimated_cost': ocr_cost['estimated_cost_usd'],
            'currency': 'USD'
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to estimate cost: {str(e)}"
        )


@app.delete("/cleanup/{video_id}")
async def cleanup_video_files_endpoint(
    video_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(verify_api_key)
):
    """Manually trigger cleanup for a video"""
    try:
        from celery_tasks import cleanup_video_files
        
        task = cleanup_video_files.delay(video_id)
        
        return {
            'message': f'Cleanup initiated for video {video_id}',
            'task_id': task.id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate cleanup: {str(e)}"
        )


# Utility functions
def extract_timestamp_from_filename(filename: str) -> float:
    """Extract timestamp from frame filename"""
    import re
    
    match = re.search(r'(\d+\.?\d*)s', filename)
    if match:
        return float(match.group(1))
    
    return 0.0


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not found",
            "message": "The requested resource was not found",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(500)
async def internal_server_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# Development server
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )