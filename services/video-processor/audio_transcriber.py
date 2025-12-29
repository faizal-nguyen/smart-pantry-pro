"""
Whisper-based audio transcription from video files
"""
import os
import logging
import asyncio
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
from concurrent.futures import ThreadPoolExecutor

import whisper
import torch
import librosa
import numpy as np
from pydantic import BaseModel

from config import settings


class TranscriptionSegment(BaseModel):
    """Individual transcription segment"""
    id: int
    start: float
    end: float
    text: str
    confidence: Optional[float] = None
    language: Optional[str] = None


class TranscriptionResult(BaseModel):
    """Complete transcription result"""
    video_id: str
    segments: List[TranscriptionSegment]
    full_text: str
    language: str
    duration: float
    confidence_score: Optional[float] = None


class AudioTranscriber:
    """Whisper-based audio transcription"""
    
    def __init__(self, model_name: Optional[str] = None):
        self.logger = logging.getLogger(__name__)
        self.model_name = model_name or settings.WHISPER_MODEL
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=1)  # Whisper is CPU intensive
        
        # Check if CUDA is available
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.logger.info(f"Using device: {self.device}")
    
    async def load_model(self):
        """Load Whisper model asynchronously"""
        if self.model is None:
            self.logger.info(f"Loading Whisper model: {self.model_name}")
            self.model = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._load_model_sync
            )
            self.logger.info("Whisper model loaded successfully")
    
    def _load_model_sync(self):
        """Synchronous model loading"""
        return whisper.load_model(self.model_name, device=self.device)
    
    async def extract_audio(self, video_path: str, video_id: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Extract audio from video file
        
        Args:
            video_path: Path to video file
            video_id: Unique identifier for video
            
        Returns:
            Tuple of (success, audio_path, error_message)
        """
        try:
            # Create output directory
            output_dir = settings.PROCESSED_DIR / video_id
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Output audio path
            audio_path = output_dir / "audio.wav"
            
            # Extract audio using ffmpeg-python
            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._extract_audio_sync,
                video_path,
                str(audio_path)
            )
            
            if result:
                return True, str(audio_path), None
            else:
                return False, None, "Audio extraction failed"
                
        except Exception as e:
            self.logger.error(f"Audio extraction failed for {video_id}: {str(e)}")
            return False, None, f"Audio extraction failed: {str(e)}"
    
    def _extract_audio_sync(self, video_path: str, audio_path: str) -> bool:
        """Synchronous audio extraction using librosa"""
        try:
            # Load video and extract audio
            y, sr = librosa.load(video_path, sr=settings.AUDIO_SAMPLE_RATE)
            
            # Save as WAV file
            import soundfile as sf
            sf.write(audio_path, y, sr)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Audio extraction error: {str(e)}")
            
            # Fallback to ffmpeg if available
            try:
                import subprocess
                
                cmd = [
                    'ffmpeg', '-i', video_path, '-vn', '-acodec', 'pcm_s16le',
                    '-ar', str(settings.AUDIO_SAMPLE_RATE), '-ac', '1', audio_path, '-y'
                ]
                
                subprocess.run(cmd, check=True, capture_output=True)
                return True
                
            except Exception as ffmpeg_error:
                self.logger.error(f"FFmpeg fallback failed: {str(ffmpeg_error)}")
                return False
    
    async def transcribe_audio(
        self, 
        audio_path: str, 
        video_id: str,
        language: Optional[str] = None
    ) -> Tuple[bool, Optional[TranscriptionResult], Optional[str]]:
        """
        Transcribe audio file using Whisper
        
        Args:
            audio_path: Path to audio file
            video_id: Unique identifier for video
            language: Language code for transcription (auto-detect if None)
            
        Returns:
            Tuple of (success, transcription_result, error_message)
        """
        try:
            # Ensure model is loaded
            await self.load_model()
            
            # Run transcription in executor
            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._transcribe_sync,
                audio_path,
                video_id,
                language
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Transcription failed for {video_id}: {str(e)}")
            return False, None, f"Transcription failed: {str(e)}"
    
    def _transcribe_sync(
        self, 
        audio_path: str, 
        video_id: str,
        language: Optional[str]
    ) -> Tuple[bool, Optional[TranscriptionResult], Optional[str]]:
        """Synchronous transcription implementation"""
        
        try:
            # Transcribe with Whisper
            options = {
                'language': language,
                'task': 'transcribe',
                'fp16': False  # Disable FP16 for better compatibility
            }
            
            result = self.model.transcribe(audio_path, **options)
            
            # Process segments
            segments = []
            for i, segment in enumerate(result['segments']):
                segments.append(TranscriptionSegment(
                    id=i,
                    start=segment['start'],
                    end=segment['end'],
                    text=segment['text'].strip(),
                    confidence=segment.get('confidence'),
                    language=result.get('language')
                ))
            
            # Calculate overall confidence
            confidences = [seg.confidence for seg in segments if seg.confidence is not None]
            avg_confidence = sum(confidences) / len(confidences) if confidences else None
            
            # Create transcription result
            transcription_result = TranscriptionResult(
                video_id=video_id,
                segments=segments,
                full_text=result['text'],
                language=result.get('language', 'unknown'),
                duration=self._get_audio_duration(audio_path),
                confidence_score=avg_confidence
            )
            
            # Save transcription to file
            self._save_transcription(transcription_result)
            
            self.logger.info(f"Transcription completed for {video_id}: {len(segments)} segments")
            return True, transcription_result, None
            
        except Exception as e:
            self.logger.error(f"Transcription processing error: {str(e)}")
            return False, None, str(e)
    
    def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds"""
        try:
            y, sr = librosa.load(audio_path, sr=None)
            return len(y) / sr
        except:
            return 0.0
    
    def _save_transcription(self, transcription: TranscriptionResult):
        """Save transcription result to file"""
        try:
            output_dir = settings.PROCESSED_DIR / transcription.video_id
            
            # Save as JSON
            import json
            json_path = output_dir / "transcription.json"
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(transcription.dict(), f, ensure_ascii=False, indent=2)
            
            # Save as plain text
            txt_path = output_dir / "transcription.txt"
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(transcription.full_text)
            
            # Save as SRT subtitle format
            srt_path = output_dir / "transcription.srt"
            self._save_as_srt(transcription, srt_path)
            
        except Exception as e:
            self.logger.error(f"Failed to save transcription: {str(e)}")
    
    def _save_as_srt(self, transcription: TranscriptionResult, srt_path: Path):
        """Save transcription as SRT subtitle file"""
        try:
            with open(srt_path, 'w', encoding='utf-8') as f:
                for i, segment in enumerate(transcription.segments, 1):
                    start_time = self._seconds_to_srt_time(segment.start)
                    end_time = self._seconds_to_srt_time(segment.end)
                    
                    f.write(f"{i}\n")
                    f.write(f"{start_time} --> {end_time}\n")
                    f.write(f"{segment.text}\n\n")
                    
        except Exception as e:
            self.logger.error(f"Failed to save SRT: {str(e)}")
    
    def _seconds_to_srt_time(self, seconds: float) -> str:
        """Convert seconds to SRT time format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"
    
    async def transcribe_video(
        self, 
        video_path: str, 
        video_id: str,
        language: Optional[str] = None
    ) -> Tuple[bool, Optional[TranscriptionResult], Optional[str]]:
        """
        Complete video transcription pipeline
        
        Args:
            video_path: Path to video file
            video_id: Unique identifier for video
            language: Language code for transcription
            
        Returns:
            Tuple of (success, transcription_result, error_message)
        """
        try:
            # Step 1: Extract audio
            success, audio_path, error = await self.extract_audio(video_path, video_id)
            if not success:
                return False, None, error
            
            # Step 2: Transcribe audio
            success, transcription, error = await self.transcribe_audio(audio_path, video_id, language)
            if not success:
                return False, None, error
            
            return True, transcription, None
            
        except Exception as e:
            self.logger.error(f"Video transcription pipeline failed: {str(e)}")
            return False, None, f"Video transcription failed: {str(e)}"


class TranscriptionAnalyzer:
    """Analyze transcription results for insights"""
    
    @staticmethod
    def extract_keywords(transcription: TranscriptionResult, max_keywords: int = 10) -> List[str]:
        """Extract key terms from transcription"""
        try:
            import re
            from collections import Counter
            
            # Simple keyword extraction (can be enhanced with NLP libraries)
            text = transcription.full_text.lower()
            
            # Remove common stop words
            stop_words = {
                'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
                'in', 'with', 'to', 'for', 'of', 'as', 'by', 'from', 'up', 'into',
                'over', 'after', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
                'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our',
                'their', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
                'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could',
                'can', 'may', 'might', 'must', 'shall', 'ought', 'need'
            }
            
            # Extract words
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text)
            words = [word for word in words if word not in stop_words]
            
            # Count frequency
            word_counts = Counter(words)
            
            return [word for word, _ in word_counts.most_common(max_keywords)]
            
        except Exception as e:
            logging.error(f"Keyword extraction failed: {str(e)}")
            return []
    
    @staticmethod
    def get_transcription_stats(transcription: TranscriptionResult) -> Dict[str, Any]:
        """Get statistics about transcription"""
        try:
            stats = {
                'total_segments': len(transcription.segments),
                'total_duration': transcription.duration,
                'total_words': len(transcription.full_text.split()),
                'words_per_minute': 0,
                'average_segment_duration': 0,
                'language': transcription.language,
                'confidence_score': transcription.confidence_score
            }
            
            if transcription.duration > 0:
                stats['words_per_minute'] = stats['total_words'] / (transcription.duration / 60)
            
            if len(transcription.segments) > 0:
                total_segment_time = sum(seg.end - seg.start for seg in transcription.segments)
                stats['average_segment_duration'] = total_segment_time / len(transcription.segments)
            
            return stats
            
        except Exception as e:
            logging.error(f"Transcription stats failed: {str(e)}")
            return {}
    
    @staticmethod
    def search_transcription(
        transcription: TranscriptionResult, 
        query: str,
        case_sensitive: bool = False
    ) -> List[Dict[str, Any]]:
        """Search for specific terms in transcription"""
        try:
            import re
            
            query_pattern = query if case_sensitive else query.lower()
            matches = []
            
            for segment in transcription.segments:
                text = segment.text if case_sensitive else segment.text.lower()
                
                if query_pattern in text:
                    # Find exact position
                    start_pos = text.find(query_pattern)
                    
                    matches.append({
                        'segment_id': segment.id,
                        'start_time': segment.start,
                        'end_time': segment.end,
                        'text': segment.text,
                        'match_position': start_pos,
                        'context': segment.text  # Could be enhanced with surrounding context
                    })
            
            return matches
            
        except Exception as e:
            logging.error(f"Transcription search failed: {str(e)}")
            return []


# Utility functions
def get_supported_languages() -> List[str]:
    """Get list of supported languages by Whisper"""
    return [
        'af', 'am', 'ar', 'as', 'az', 'ba', 'be', 'bg', 'bn', 'bo', 'br', 'bs', 'ca',
        'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fo', 'fr',
        'gl', 'gu', 'ha', 'haw', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it',
        'ja', 'jw', 'ka', 'kk', 'km', 'kn', 'ko', 'la', 'lb', 'ln', 'lo', 'lt', 'lv',
        'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'nn', 'no',
        'oc', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 'sa', 'sd', 'si', 'sk', 'sl', 'sn',
        'so', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tk', 'tl', 'tr',
        'tt', 'uk', 'ur', 'uz', 'vi', 'yi', 'yo', 'zh'
    ]


def validate_audio_file(file_path: str) -> bool:
    """Validate audio file format and accessibility"""
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            return False
        
        # Try to load with librosa
        y, sr = librosa.load(file_path, sr=None, duration=1.0)  # Load just 1 second for validation
        return len(y) > 0
        
    except Exception:
        return False