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

