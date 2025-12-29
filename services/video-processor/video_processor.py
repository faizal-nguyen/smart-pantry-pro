"""
Core video processing logic with support for YouTube, Instagram, and TikTok
"""
import os
import re
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from urllib.parse import urlparse

import yt_dlp
import aiofiles
from pydantic import BaseModel

from config import settings, PLATFORM_CONFIGS, SUPPORTED_EXTENSIONS, ERROR_MESSAGES


# Data models
class VideoInfo(BaseModel):
    """Video information model"""
    id: str
    title: str
    duration: Optional[float]
    platform: str
    url: str
    thumbnail: Optional[str]
    description: Optional[str]


class ProcessingResult(BaseModel):
    """Video processing result model"""
    video_id: str
    status: str
    video_path: Optional[str] = None
    audio_path: Optional[str] = None
    frames_path: Optional[str] = None
    transcription: Optional[Dict[str, Any]] = None
    extracted_text: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


class VideoProcessor:
    """Main video processor class"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.setup_logging()
        
    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=getattr(logging, settings.LOG_LEVEL),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(settings.LOG_FILE),
                logging.StreamHandler()
            ]
        )
    
    def identify_platform(self, url: str) -> Optional[str]:
        """Identify video platform from URL"""
        for platform, config in PLATFORM_CONFIGS.items():
            for pattern in config['url_patterns']:
                if re.search(pattern, url, re.IGNORECASE):
                    return platform
        return None
    
    def validate_video_file(self, file_path: Path) -> bool:
        """Validate video file format and size"""
        if not file_path.exists():
            return False
            
        # Check file extension
        if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS['video']:
            return False
            
        # Check file size
        if file_path.stat().st_size > settings.MAX_FILE_SIZE:
            return False
            
        return True
    
    async def download_video(self, url: str, video_id: str) -> Tuple[bool, Optional[str], Optional[VideoInfo]]:
        """Download video from URL"""
        platform = self.identify_platform(url)
        if not platform:
            return False, ERROR_MESSAGES['INVALID_URL'], None
            
        try:
            # Get platform-specific configuration
            ydl_opts = PLATFORM_CONFIGS[platform]['ydl_opts'].copy()
            
            # Set output directory and filename
            output_dir = settings.TEMP_DIR / video_id
            output_dir.mkdir(exist_ok=True)
            
            ydl_opts.update({
                'outtmpl': str(output_dir / '%(title)s.%(ext)s'),
                'restrictfilenames': True,
            })
            
            # Download video
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Extract info first
                info = ydl.extract_info(url, download=False)
                
                # Validate duration
                duration = info.get('duration', 0)
                if duration and duration > settings.MAX_VIDEO_DURATION:
                    return False, f"Video too long: {duration}s (max: {settings.MAX_VIDEO_DURATION}s)", None
                
                # Create video info object
                video_info = VideoInfo(
                    id=video_id,
                    title=info.get('title', 'Unknown'),
                    duration=duration,
                    platform=platform,
                    url=url,
                    thumbnail=info.get('thumbnail'),
                    description=info.get('description')
                )
                
                # Download the video
                ydl.download([url])
                
                # Find downloaded video file
                video_files = list(output_dir.glob('*'))
                video_files = [f for f in video_files if f.suffix.lower() in SUPPORTED_EXTENSIONS['video']]
                
                if not video_files:
                    return False, "No video file found after download", None
                    
                video_path = video_files[0]
                
                # Move to uploads directory
                final_path = settings.UPLOAD_DIR / f"{video_id}{video_path.suffix}"
                video_path.rename(final_path)
                
                # Clean up temp directory
                for file in output_dir.glob('*'):
                    file.unlink()
                output_dir.rmdir()
                
                return True, str(final_path), video_info
                
        except Exception as e:
            self.logger.error(f"Download failed for {url}: {str(e)}")
            return False, f"Download failed: {str(e)}", None
    
    async def save_uploaded_file(self, file_content: bytes, filename: str, video_id: str) -> Tuple[bool, str]:
        """Save uploaded file to disk"""
        try:
            # Validate file extension
            file_path = Path(filename)
            if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS['video']:
                return False, ERROR_MESSAGES['UNSUPPORTED_FORMAT']
            
            # Check file size
            if len(file_content) > settings.MAX_FILE_SIZE:
                return False, ERROR_MESSAGES['FILE_TOO_LARGE']
            
            # Save file
            output_path = settings.UPLOAD_DIR / f"{video_id}{file_path.suffix}"
            
            async with aiofiles.open(output_path, 'wb') as f:
                await f.write(file_content)
            
            return True, str(output_path)
            
        except Exception as e:
            self.logger.error(f"File save failed: {str(e)}")
            return False, f"File save failed: {str(e)}"
    
    async def get_video_info_from_file(self, video_path: str, video_id: str) -> VideoInfo:
        """Extract video information from local file"""
        try:
            import cv2
            
            # Get basic info using OpenCV
            cap = cv2.VideoCapture(video_path)
            
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            duration = frame_count / fps if fps > 0 else 0
            
            cap.release()
            
            video_info = VideoInfo(
                id=video_id,
                title=Path(video_path).stem,
                duration=duration,
                platform="upload",
                url=video_path,
                thumbnail=None,
                description=None
            )
            
            return video_info
            
        except Exception as e:
            self.logger.error(f"Failed to get video info: {str(e)}")
            # Return basic info even if extraction fails
            return VideoInfo(
                id=video_id,
                title="Unknown",
                duration=None,
                platform="upload",
                url=video_path,
                thumbnail=None,
                description=None
            )
    
    def cleanup_files(self, video_id: str):
        """Clean up temporary files for a video"""
        try:
            # Clean up temp directory
            temp_dir = settings.TEMP_DIR / video_id
            if temp_dir.exists():
                for file in temp_dir.glob('*'):
                    file.unlink()
                temp_dir.rmdir()
                
            # Clean up processed files (optional - keep for now)
            # processed_dir = settings.PROCESSED_DIR / video_id
            # if processed_dir.exists():
            #     for file in processed_dir.glob('*'):
            #         file.unlink()
            #     processed_dir.rmdir()
                
        except Exception as e:
            self.logger.warning(f"Cleanup failed for {video_id}: {str(e)}")


class VideoAnalyzer:
    """Video analysis utilities"""
    
    @staticmethod
    def extract_video_metadata(video_path: str) -> Dict[str, Any]:
        """Extract comprehensive video metadata"""
        try:
            import cv2
            
            cap = cv2.VideoCapture(video_path)
            
            metadata = {
                'fps': cap.get(cv2.CAP_PROP_FPS),
                'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
                'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
                'duration': cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS),
                'codec': int(cap.get(cv2.CAP_PROP_FOURCC)),
            }
            
            cap.release()
            return metadata
            
        except Exception as e:
            logging.error(f"Metadata extraction failed: {str(e)}")
            return {}
    
    @staticmethod
    def estimate_processing_time(duration: float, frame_count: int) -> int:
        """Estimate processing time in seconds"""
        # Base time for frame extraction (1 second per 30 frames)
        frame_time = frame_count / 30
        
        # Audio transcription time (roughly 1/4 of video duration)
        audio_time = duration / 4
        
        # OCR processing time (2 seconds per extracted frame)
        ocr_time = min(frame_count / settings.FRAME_EXTRACTION_INTERVAL, settings.MAX_FRAMES_PER_VIDEO) * 2
        
        # Add buffer time
        total_time = (frame_time + audio_time + ocr_time) * 1.5
        
        return max(int(total_time), 30)  # Minimum 30 seconds


def create_video_id() -> str:
    """Generate unique video ID"""
    return str(uuid.uuid4())


# Utility functions
async def validate_url(url: str) -> bool:
    """Validate if URL is accessible"""
    try:
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.head(url, timeout=10) as response:
                return response.status == 200
    except:
        return False


def get_file_hash(file_path: str) -> str:
    """Generate file hash for deduplication"""
    import hashlib
    
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()