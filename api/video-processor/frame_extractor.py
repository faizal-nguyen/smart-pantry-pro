"""
OpenCV-based frame extraction from videos
"""
import os
import logging
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np
from PIL import Image
import asyncio

from config import settings


class FrameExtractor:
    """Extract frames from video files using OpenCV"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.executor = ThreadPoolExecutor(max_workers=2)
    
    async def extract_frames(
        self, 
        video_path: str, 
        video_id: str,
        interval: Optional[int] = None,
        max_frames: Optional[int] = None
    ) -> Tuple[bool, List[str], Optional[str]]:
        """
        Extract frames from video at specified intervals
        
        Args:
            video_path: Path to video file
            video_id: Unique identifier for video
            interval: Interval between frames in seconds (default from config)
            max_frames: Maximum number of frames to extract (default from config)
            
        Returns:
            Tuple of (success, frame_paths, error_message)
        """
        try:
            interval = interval or settings.FRAME_EXTRACTION_INTERVAL
            max_frames = max_frames or settings.MAX_FRAMES_PER_VIDEO
            
            # Run extraction in thread pool to avoid blocking
            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._extract_frames_sync,
                video_path,
                video_id,
                interval,
                max_frames
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Frame extraction failed for {video_id}: {str(e)}")
            return False, [], f"Frame extraction failed: {str(e)}"
    
    def _extract_frames_sync(
        self, 
        video_path: str, 
        video_id: str, 
        interval: int, 
        max_frames: int
    ) -> Tuple[bool, List[str], Optional[str]]:
        """Synchronous frame extraction implementation"""
        
        # Create output directory
        output_dir = settings.PROCESSED_DIR / video_id / "frames"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        frame_paths = []
        
        try:
            # Open video
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                return False, [], "Could not open video file"
            
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps if fps > 0 else 0
            
            self.logger.info(f"Video info - FPS: {fps}, Frames: {total_frames}, Duration: {duration}s")
            
            # Calculate frame extraction parameters
            frame_interval = int(fps * interval)  # Frames to skip between extractions
            frames_to_extract = min(max_frames, int(duration // interval) + 1)
            
            frame_count = 0
            extracted_count = 0
            
            while cap.isOpened() and extracted_count < frames_to_extract:
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                # Extract frame at specified interval
                if frame_count % frame_interval == 0:
                    success, frame_path = self._save_frame(
                        frame, 
                        output_dir, 
                        extracted_count, 
                        frame_count,
                        fps
                    )
                    
                    if success:
                        frame_paths.append(frame_path)
                        extracted_count += 1
                        self.logger.debug(f"Extracted frame {extracted_count} at {frame_count / fps:.2f}s")
                
                frame_count += 1
            
            cap.release()
            
            self.logger.info(f"Successfully extracted {len(frame_paths)} frames from {video_path}")
            return True, frame_paths, None
            
        except Exception as e:
            self.logger.error(f"Frame extraction error: {str(e)}")
            return False, [], str(e)
    
    def _save_frame(
        self, 
        frame: np.ndarray, 
        output_dir: Path, 
        frame_index: int,
        frame_number: int,
        fps: float
    ) -> Tuple[bool, str]:
        """Save frame to disk with metadata"""
        try:
            # Calculate timestamp
            timestamp = frame_number / fps
            
            # Generate filename with timestamp
            filename = f"frame_{frame_index:04d}_{timestamp:.2f}s.jpg"
            frame_path = output_dir / filename
            
            # Save frame with high quality
            success = cv2.imwrite(
                str(frame_path), 
                frame, 
                [cv2.IMWRITE_JPEG_QUALITY, settings.FRAME_QUALITY]
            )
            
            if success:
                return True, str(frame_path)
            else:
                return False, ""
                
        except Exception as e:
            self.logger.error(f"Frame save error: {str(e)}")
            return False, ""
    
    async def extract_smart_frames(
        self, 
        video_path: str, 
        video_id: str,
        scene_threshold: float = 30.0
    ) -> Tuple[bool, List[str], Optional[str]]:
        """
        Extract frames based on scene changes for better content coverage
        
        Args:
            video_path: Path to video file
            video_id: Unique identifier for video
            scene_threshold: Threshold for scene change detection
            
        Returns:
            Tuple of (success, frame_paths, error_message)
        """
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._extract_smart_frames_sync,
                video_path,
                video_id,
                scene_threshold
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Smart frame extraction failed for {video_id}: {str(e)}")
            return False, [], f"Smart frame extraction failed: {str(e)}"
    
    def _extract_smart_frames_sync(
        self, 
        video_path: str, 
        video_id: str,
        scene_threshold: float
    ) -> Tuple[bool, List[str], Optional[str]]:
        """Synchronous smart frame extraction implementation"""
        
        output_dir = settings.PROCESSED_DIR / video_id / "frames"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        frame_paths = []
        
        try:
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                return False, [], "Could not open video file"
            
            fps = cap.get(cv2.CAP_PROP_FPS)
            prev_frame = None
            frame_count = 0
            extracted_count = 0
            
            while cap.isOpened() and extracted_count < settings.MAX_FRAMES_PER_VIDEO:
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                # Convert to grayscale for comparison
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                
                # Check for scene change
                if prev_frame is not None:
                    # Calculate histogram difference
                    hist_diff = cv2.compareHist(
                        cv2.calcHist([prev_frame], [0], None, [256], [0, 256]),
                        cv2.calcHist([gray], [0], None, [256], [0, 256]),
                        cv2.HISTCMP_CORREL
                    )
                    
                    # If significant change detected or first frame
                    if hist_diff < (1.0 - scene_threshold / 100.0):
                        success, frame_path = self._save_frame(
                            frame, 
                            output_dir, 
                            extracted_count, 
                            frame_count,
                            fps
                        )
                        
                        if success:
                            frame_paths.append(frame_path)
                            extracted_count += 1
                            self.logger.debug(f"Scene change detected, extracted frame {extracted_count}")
                
                elif extracted_count == 0:  # Always extract first frame
                    success, frame_path = self._save_frame(
                        frame, 
                        output_dir, 
                        extracted_count, 
                        frame_count,
                        fps
                    )
                    
                    if success:
                        frame_paths.append(frame_path)
                        extracted_count += 1
                
                prev_frame = gray
                frame_count += 1
            
            cap.release()
            
            # If we didn't extract enough frames, fall back to regular interval extraction
            if len(frame_paths) < 3:
                self.logger.warning("Smart extraction yielded few frames, falling back to interval extraction")
                # Use synchronous interval extraction fallback
                return self._extract_frames_sync(
                    video_path, 
                    video_id, 
                    settings.FRAME_EXTRACTION_INTERVAL,
                    settings.MAX_FRAMES_PER_VIDEO
                )
            
            self.logger.info(f"Smart extraction: {len(frame_paths)} frames from {video_path}")
            return True, frame_paths, None
            
        except Exception as e:
            self.logger.error(f"Smart frame extraction error: {str(e)}")
            return False, [], str(e)
    
    async def get_video_thumbnail(
        self, 
        video_path: str, 
        video_id: str,
        position: float = 0.1
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Extract a thumbnail from video at specified position
        
        Args:
            video_path: Path to video file
            video_id: Unique identifier for video
            position: Position in video (0.0 to 1.0) to extract thumbnail
            
        Returns:
            Tuple of (success, thumbnail_path, error_message)
        """
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._get_thumbnail_sync,
                video_path,
                video_id,
                position
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Thumbnail extraction failed for {video_id}: {str(e)}")
            return False, None, f"Thumbnail extraction failed: {str(e)}"
    
    def _get_thumbnail_sync(
        self, 
        video_path: str, 
        video_id: str,
        position: float
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Synchronous thumbnail extraction implementation"""
        
        output_dir = settings.PROCESSED_DIR / video_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                return False, None, "Could not open video file"
            
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            target_frame = int(total_frames * position)
            
            # Seek to target frame
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                return False, None, "Could not read frame for thumbnail"
            
            # Save thumbnail
            thumbnail_path = output_dir / "thumbnail.jpg"
            success = cv2.imwrite(
                str(thumbnail_path), 
                frame, 
                [cv2.IMWRITE_JPEG_QUALITY, 95]
            )
            
            if success:
                return True, str(thumbnail_path), None
            else:
                return False, None, "Failed to save thumbnail"
                
        except Exception as e:
            self.logger.error(f"Thumbnail extraction error: {str(e)}")
            return False, None, str(e)


class FrameAnalyzer:
    """Analyze extracted frames for quality and content"""
    
    @staticmethod
    def calculate_frame_quality(frame_path: str) -> Dict[str, float]:
        """Calculate frame quality metrics"""
        try:
            # Load frame
            image = cv2.imread(frame_path)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate metrics
            metrics = {
                'sharpness': cv2.Laplacian(gray, cv2.CV_64F).var(),
                'brightness': np.mean(gray),
                'contrast': np.std(gray),
                'size': os.path.getsize(frame_path)
            }
            
            return metrics
            
        except Exception as e:
            logging.error(f"Frame quality analysis failed: {str(e)}")
            return {}
    
    @staticmethod
    def filter_best_frames(frame_paths: List[str], max_frames: int) -> List[str]:
        """Filter frames to keep only the best quality ones"""
        if len(frame_paths) <= max_frames:
            return frame_paths
        
        # Analyze quality for all frames
        frame_scores = []
        for frame_path in frame_paths:
            metrics = FrameAnalyzer.calculate_frame_quality(frame_path)
            # Simple quality score (can be improved)
            score = metrics.get('sharpness', 0) + metrics.get('contrast', 0)
            frame_scores.append((frame_path, score))
        
        # Sort by quality score and take the best ones
        frame_scores.sort(key=lambda x: x[1], reverse=True)
        return [frame_path for frame_path, _ in frame_scores[:max_frames]]
    
    @staticmethod
    def detect_text_regions(frame_path: str) -> List[Dict[str, Any]]:
        """Detect text regions in frame for better OCR targeting"""
        try:
            # Load frame
            image = cv2.imread(frame_path)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Use MSER (Maximally Stable Extremal Regions) for text detection
            mser = cv2.MSER_create()
            regions, _ = mser.detectRegions(gray)
            
            text_regions = []
            for region in regions:
                # Get bounding box
                x, y, w, h = cv2.boundingRect(region)
                
                # Filter regions by size and aspect ratio
                if w > 10 and h > 10 and w / h < 10 and h / w < 3:
                    text_regions.append({
                        'bbox': (x, y, w, h),
                        'area': w * h,
                        'confidence': 0.5  # Basic confidence
                    })
            
            # Sort by area (larger regions first)
            text_regions.sort(key=lambda x: x['area'], reverse=True)
            
            return text_regions[:10]  # Return top 10 regions
            
        except Exception as e:
            logging.error(f"Text region detection failed: {str(e)}")
            return []