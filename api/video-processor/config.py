"""
Configuration management for video processing backend
"""
import os
from pathlib import Path
from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with validation"""
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    
    # Database Configuration
    DATABASE_URL: str = "sqlite:///./video_processor.db"
    
    # Redis Configuration for Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-vision-preview"
    OPENAI_MAX_TOKENS: int = 1000
    
    # Video Processing Configuration
    MAX_VIDEO_DURATION: int = 600  # 10 minutes in seconds
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    SUPPORTED_VIDEO_FORMATS: list = [".mp4", ".avi", ".mov", ".mkv", ".webm"]
    
    # Frame Extraction Configuration
    FRAME_EXTRACTION_INTERVAL: int = 30  # Extract frame every 30 seconds
    MAX_FRAMES_PER_VIDEO: int = 20
    FRAME_QUALITY: int = 95  # JPEG quality 0-100
    
    # Audio Configuration
    WHISPER_MODEL: str = "base"  # tiny, base, small, medium, large
    AUDIO_SAMPLE_RATE: int = 16000
    
    # Storage Configuration
    UPLOAD_DIR: Path = Path("./uploads")
    PROCESSED_DIR: Path = Path("./processed")
    TEMP_DIR: Path = Path("./temp")
    
    # Video Download Configuration
    YOUTUBE_DL_OPTIONS: dict = {
        'format': 'best[height<=720]',
        'extractaudio': True,
        'audioformat': 'wav',
        'outtmpl': '%(title)s.%(ext)s',
        'noplaylist': True,
    }
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 10
    RATE_LIMIT_PER_HOUR: int = 100
    
    # Security
    MAX_CONCURRENT_PROCESSES: int = 5
    PROCESS_TIMEOUT: int = 1800  # 30 minutes
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "video_processor.log"
    
    @field_validator('UPLOAD_DIR', 'PROCESSED_DIR', 'TEMP_DIR', mode='before')
    @classmethod
    def create_directories(cls, v):
        """Create directories if they don't exist"""
        path = Path(v)
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    @field_validator('OPENAI_API_KEY')
    @classmethod
    def validate_openai_key(cls, v):
        """Validate OpenAI API key is provided"""
        if not v:
            raise ValueError("OPENAI_API_KEY must be set")
        return v
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


class DevelopmentSettings(Settings):
    """Development environment settings"""
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_PER_HOUR: int = 1000


class ProductionSettings(Settings):
    """Production environment settings"""
    DEBUG: bool = False
    LOG_LEVEL: str = "WARNING"
    MAX_CONCURRENT_PROCESSES: int = 10
    
    # Production database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://user:password@localhost/video_processor"
    )


def get_settings() -> Settings:
    """Get settings based on environment"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionSettings()
    else:
        return DevelopmentSettings()


# Global settings instance
settings = get_settings()

# Video downloader configurations for different platforms
PLATFORM_CONFIGS = {
    "youtube": {
        "ydl_opts": {
            'format': 'best[height<=720]',
            'extractaudio': True,
            'audioformat': 'wav',
            'writesubtitles': True,
            'writeautomaticsub': True,
        },
        "url_patterns": [
            r'youtube\.com/watch',
            r'youtu\.be/',
            r'm\.youtube\.com'
        ]
    },
    "instagram": {
        "ydl_opts": {
            'format': 'best',
            'extractaudio': True,
            'audioformat': 'wav',
        },
        "url_patterns": [
            r'instagram\.com/p/',
            r'instagram\.com/reel/',
            r'instagram\.com/tv/'
        ]
    },
    "tiktok": {
        "ydl_opts": {
            'format': 'best',
            'extractaudio': True,
            'audioformat': 'wav',
        },
        "url_patterns": [
            r'tiktok\.com/@.*?/video/',
            r'vm\.tiktok\.com/',
            r'm\.tiktok\.com/'
        ]
    }
}

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    'video': ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'],
    'audio': ['.wav', '.mp3', '.m4a', '.aac', '.ogg'],
    'image': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
}

# Error messages
ERROR_MESSAGES = {
    'UNSUPPORTED_FORMAT': 'Unsupported video format',
    'FILE_TOO_LARGE': 'File size exceeds maximum limit',
    'DOWNLOAD_FAILED': 'Failed to download video from URL',
    'PROCESSING_FAILED': 'Video processing failed',
    'INVALID_URL': 'Invalid or unsupported video URL',
    'RATE_LIMIT_EXCEEDED': 'Rate limit exceeded',
    'PROCESSING_TIMEOUT': 'Processing timeout exceeded'
}