"""
OpenAI Vision API-based text extraction from video frames (OCR alternative to Anthropic)
"""
import os
import base64
import logging
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

import openai
from PIL import Image
import cv2
import numpy as np
from pydantic import BaseModel

from config import settings


class TextDetection(BaseModel):
    """Individual text detection result"""
    text: str
    confidence: float
    bbox: Optional[Tuple[int, int, int, int]] = None  # x, y, width, height
    frame_path: str
    timestamp: float


class OCRResult(BaseModel):
    """Complete OCR result for video"""
    video_id: str
    detections: List[TextDetection]
    summary: str
    total_frames_processed: int
    success_rate: float


class TextExtractor:
    """OpenAI Vision API-based text extraction"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.logger = logging.getLogger(__name__)
        self.api_key = api_key or settings.OPENAI_API_KEY
        
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        # Initialize OpenAI client
        self.client = openai.OpenAI(api_key=self.api_key)
        self.executor = ThreadPoolExecutor(max_workers=3)  # Limit concurrent API calls
    
    async def extract_text_from_frames(
        self, 
        frame_paths: List[str], 
        video_id: str
    ) -> Tuple[bool, Optional[OCRResult], Optional[str]]:
        """
        Extract text from multiple video frames
        
        Args:
            frame_paths: List of paths to frame images
            video_id: Unique identifier for video
            
        Returns:
            Tuple of (success, ocr_result, error_message)
        """
        try:
            # Process frames in batches to avoid rate limits
            batch_size = 5
            all_detections = []
            successful_extractions = 0
            
            for i in range(0, len(frame_paths), batch_size):
                batch = frame_paths[i:i + batch_size]
                
                # Process batch concurrently
                tasks = [
                    self.extract_text_from_single_frame(frame_path, video_id)
                    for frame_path in batch
                ]
                
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in batch_results:
                    if isinstance(result, Exception):
                        self.logger.warning(f"Frame processing failed: {str(result)}")
                        continue
                    
                    success, detections, error = result
                    if success and detections:
                        all_detections.extend(detections)
                        successful_extractions += 1
                
                # Add delay between batches to respect rate limits
                if i + batch_size < len(frame_paths):
                    await asyncio.sleep(2)
            
            # Calculate success rate
            success_rate = successful_extractions / len(frame_paths) if frame_paths else 0
            
            # Create summary
            summary = self._create_summary(all_detections)
            
            # Create result
            ocr_result = OCRResult(
                video_id=video_id,
                detections=all_detections,
                summary=summary,
                total_frames_processed=len(frame_paths),
                success_rate=success_rate
            )
            
            # Save results
            await self._save_ocr_results(ocr_result)
            
            self.logger.info(f"Text extraction completed for {video_id}: {len(all_detections)} detections")
            return True, ocr_result, None
            
        except Exception as e:
            self.logger.error(f"Text extraction failed for {video_id}: {str(e)}")
            return False, None, f"Text extraction failed: {str(e)}"
    
    async def extract_text_from_single_frame(
        self, 
        frame_path: str, 
        video_id: str
    ) -> Tuple[bool, List[TextDetection], Optional[str]]:
        """
        Extract text from a single frame using OpenAI Vision API
        
        Args:
            frame_path: Path to frame image
            video_id: Unique identifier for video
            
        Returns:
            Tuple of (success, text_detections, error_message)
        """
        try:
            # Get timestamp from filename
            timestamp = self._extract_timestamp_from_filename(frame_path)
            
            # Encode image to base64
            base64_image = await self._encode_image_to_base64(frame_path)
            if not base64_image:
                return False, [], "Failed to encode image"
            
            # Call OpenAI Vision API
            response = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._call_openai_vision_api,
                base64_image,
                frame_path
            )
            
            if not response:
                return False, [], "OpenAI API call failed"
            
            # Parse response and create detections
            detections = self._parse_openai_response(response, frame_path, timestamp)
            
            return True, detections, None
            
        except Exception as e:
            self.logger.error(f"Single frame OCR failed for {frame_path}: {str(e)}")
            return False, [], str(e)
    
    async def _encode_image_to_base64(self, image_path: str) -> Optional[str]:
        """Encode image to base64 string"""
        try:
            # Optimize image size for API
            optimized_path = await self._optimize_image_for_api(image_path)
            
            with open(optimized_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            
            # Clean up optimized image if it's different from original
            if optimized_path != image_path:
                os.unlink(optimized_path)
            
            return encoded_string
            
        except Exception as e:
            self.logger.error(f"Image encoding failed: {str(e)}")
            return None
    
    async def _optimize_image_for_api(self, image_path: str) -> str:
        """Optimize image size and quality for OpenAI API"""
        try:
            image = Image.open(image_path)
            
            # Get image dimensions
            width, height = image.size
            
            # Check if resizing is needed (OpenAI recommends max 2048x2048)
            max_size = 2048
            if width > max_size or height > max_size:
                # Calculate new dimensions maintaining aspect ratio
                ratio = min(max_size / width, max_size / height)
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                
                # Resize image
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Save optimized image
                temp_path = str(Path(image_path).parent / f"temp_{Path(image_path).name}")
                image.save(temp_path, "JPEG", quality=85, optimize=True)
                
                return temp_path
            
            return image_path
            
        except Exception as e:
            self.logger.error(f"Image optimization failed: {str(e)}")
            return image_path
    
    def _call_openai_vision_api(self, base64_image: str, frame_path: str) -> Optional[str]:
        """Call OpenAI Vision API for text extraction"""
        try:
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """Please extract all visible text from this image. 
                                
                                Focus on:
                                - Any text overlays, captions, or subtitles
                                - Signs, logos, or branded text
                                - User interface elements with text
                                - Any readable text in the scene
                                
                                Format your response as JSON with this structure:
                                {
                                  "detected_text": [
                                    {
                                      "text": "exact text found",
                                      "confidence": 0.95,
                                      "context": "description of where/what this text is"
                                    }
                                  ]
                                }
                                
                                If no text is found, return: {"detected_text": []}"""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=settings.OPENAI_MAX_TOKENS,
                temperature=0.1  # Low temperature for consistent text extraction
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            self.logger.error(f"OpenAI API call failed: {str(e)}")
            return None
    
    def _parse_openai_response(
        self, 
        response: str, 
        frame_path: str, 
        timestamp: float
    ) -> List[TextDetection]:
        """Parse OpenAI response and create TextDetection objects"""
        try:
            import json
            import re
            
            # Clean response (remove markdown formatting if present)
            cleaned_response = re.sub(r'```json\n?', '', response)
            cleaned_response = re.sub(r'\n?```', '', cleaned_response)
            
            # Parse JSON
            data = json.loads(cleaned_response)
            
            detections = []
            
            if 'detected_text' in data:
                for item in data['detected_text']:
                    if 'text' in item and item['text'].strip():
                        detection = TextDetection(
                            text=item['text'].strip(),
                            confidence=item.get('confidence', 0.8),
                            bbox=None,  # OpenAI Vision doesn't provide bounding boxes
                            frame_path=frame_path,
                            timestamp=timestamp
                        )
                        detections.append(detection)
            
            return detections
            
        except Exception as e:
            self.logger.error(f"Response parsing failed: {str(e)}")
            # Fallback: treat entire response as text if JSON parsing fails
            if response and response.strip():
                return [TextDetection(
                    text=response.strip(),
                    confidence=0.5,
                    bbox=None,
                    frame_path=frame_path,
                    timestamp=timestamp
                )]
            return []
    
    def _extract_timestamp_from_filename(self, frame_path: str) -> float:
        """Extract timestamp from frame filename"""
        try:
            import re
            filename = Path(frame_path).name
            
            # Look for pattern like "frame_0001_123.45s.jpg"
            match = re.search(r'(\d+\.?\d*)s', filename)
            if match:
                return float(match.group(1))
            
            # Fallback: extract frame number and estimate timestamp
            match = re.search(r'frame_(\d+)', filename)
            if match:
                frame_number = int(match.group(1))
                return frame_number * settings.FRAME_EXTRACTION_INTERVAL
            
            return 0.0
            
        except Exception as e:
            self.logger.error(f"Timestamp extraction failed: {str(e)}")
            return 0.0
    
    def _create_summary(self, detections: List[TextDetection]) -> str:
        """Create a summary of all detected text"""
        if not detections:
            return "No text detected in video frames."
        
        # Group text by similarity and frequency
        unique_texts = {}
        for detection in detections:
            text = detection.text.lower().strip()
            if text:
                if text in unique_texts:
                    unique_texts[text] += 1
                else:
                    unique_texts[text] = 1
        
        # Sort by frequency
        sorted_texts = sorted(unique_texts.items(), key=lambda x: x[1], reverse=True)
        
        # Create summary
        summary_parts = []
        summary_parts.append(f"Total text detections: {len(detections)}")
        summary_parts.append(f"Unique text elements: {len(unique_texts)}")
        
        if len(sorted_texts) > 0:
            summary_parts.append("\nMost frequent text elements:")
            for text, count in sorted_texts[:5]:  # Top 5
                summary_parts.append(f"- '{text}' (appears {count} times)")
        
        # Add chronological text if available
        if len(detections) > 1:
            summary_parts.append("\nChronological text sequence:")
            for detection in sorted(detections, key=lambda x: x.timestamp)[:10]:  # First 10
                summary_parts.append(f"- {detection.timestamp:.1f}s: '{detection.text}'")
        
        return "\n".join(summary_parts)
    
    async def _save_ocr_results(self, ocr_result: OCRResult):
        """Save OCR results to file"""
        try:
            output_dir = settings.PROCESSED_DIR / ocr_result.video_id
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Save as JSON
            import json
            json_path = output_dir / "ocr_results.json"
            async with asyncio.get_event_loop().run_in_executor(
                None,
                lambda: json.dump(ocr_result.dict(), open(json_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            ):
                pass
            
            # Save summary as text
            summary_path = output_dir / "text_summary.txt"
            async with asyncio.get_event_loop().run_in_executor(
                None,
                lambda: open(summary_path, 'w', encoding='utf-8').write(ocr_result.summary)
            ):
                pass
            
            # Save all detected text
            all_text_path = output_dir / "all_detected_text.txt"
            all_text = "\n".join([f"[{det.timestamp:.1f}s] {det.text}" for det in ocr_result.detections])
            async with asyncio.get_event_loop().run_in_executor(
                None,
                lambda: open(all_text_path, 'w', encoding='utf-8').write(all_text)
            ):
                pass
            
        except Exception as e:
            self.logger.error(f"Failed to save OCR results: {str(e)}")


class TextAnalyzer:
    """Analyze extracted text for insights"""
    
    @staticmethod
    def find_patterns(ocr_result: OCRResult) -> Dict[str, Any]:
        """Find patterns in detected text"""
        patterns = {
            'urls': [],
            'emails': [],
            'phone_numbers': [],
            'hashtags': [],
            'mentions': [],
            'numbers': [],
            'dates': []
        }
        
        try:
            import re
            
            # Combine all text
            all_text = " ".join([detection.text for detection in ocr_result.detections])
            
            # Find URLs
            url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
            patterns['urls'] = re.findall(url_pattern, all_text)
            
            # Find emails
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            patterns['emails'] = re.findall(email_pattern, all_text)
            
            # Find phone numbers (basic pattern)
            phone_pattern = r'[\+]?[1-9]?[\d\s\-\(\)]{7,15}'
            patterns['phone_numbers'] = re.findall(phone_pattern, all_text)
            
            # Find hashtags
            hashtag_pattern = r'#\w+'
            patterns['hashtags'] = re.findall(hashtag_pattern, all_text)
            
            # Find mentions
            mention_pattern = r'@\w+'
            patterns['mentions'] = re.findall(mention_pattern, all_text)
            
            # Find numbers
            number_pattern = r'\b\d+\.?\d*\b'
            patterns['numbers'] = re.findall(number_pattern, all_text)
            
            # Find dates (basic patterns)
            date_patterns = [
                r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
                r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',
                r'\b\w+\s+\d{1,2},?\s+\d{4}\b'
            ]
            
            for pattern in date_patterns:
                patterns['dates'].extend(re.findall(pattern, all_text))
            
            # Remove duplicates
            for key in patterns:
                patterns[key] = list(set(patterns[key]))
            
            return patterns
            
        except Exception as e:
            logging.error(f"Pattern analysis failed: {str(e)}")
            return patterns
    
    @staticmethod
    def get_text_statistics(ocr_result: OCRResult) -> Dict[str, Any]:
        """Get statistics about detected text"""
        try:
            stats = {
                'total_detections': len(ocr_result.detections),
                'average_confidence': 0.0,
                'total_characters': 0,
                'total_words': 0,
                'unique_words': 0,
                'text_density_per_frame': 0.0,
                'languages_detected': []
            }
            
            if not ocr_result.detections:
                return stats
            
            # Calculate averages
            confidences = [d.confidence for d in ocr_result.detections if d.confidence]
            if confidences:
                stats['average_confidence'] = sum(confidences) / len(confidences)
            
            # Count characters and words
            all_text = " ".join([d.text for d in ocr_result.detections])
            stats['total_characters'] = len(all_text)
            
            words = all_text.split()
            stats['total_words'] = len(words)
            stats['unique_words'] = len(set(word.lower() for word in words))
            
            # Text density
            if ocr_result.total_frames_processed > 0:
                stats['text_density_per_frame'] = len(ocr_result.detections) / ocr_result.total_frames_processed
            
            return stats
            
        except Exception as e:
            logging.error(f"Text statistics failed: {str(e)}")
            return {}
    
    @staticmethod
    def search_text(ocr_result: OCRResult, query: str, case_sensitive: bool = False) -> List[Dict[str, Any]]:
        """Search for specific text in OCR results"""
        try:
            matches = []
            
            search_query = query if case_sensitive else query.lower()
            
            for detection in ocr_result.detections:
                text = detection.text if case_sensitive else detection.text.lower()
                
                if search_query in text:
                    matches.append({
                        'text': detection.text,
                        'timestamp': detection.timestamp,
                        'frame_path': detection.frame_path,
                        'confidence': detection.confidence,
                        'match_position': text.find(search_query)
                    })
            
            return matches
            
        except Exception as e:
            logging.error(f"Text search failed: {str(e)}")
            return []


# Utility functions
def validate_image_for_ocr(image_path: str) -> bool:
    """Validate image file for OCR processing"""
    try:
        # Check if file exists
        if not os.path.exists(image_path):
            return False
        
        # Check file size (API limits)
        file_size = os.path.getsize(image_path)
        if file_size > 20 * 1024 * 1024:  # 20MB limit
            return False
        
        # Try to load with PIL
        with Image.open(image_path) as img:
            # Check if image is valid
            img.verify()
        
        return True
        
    except Exception:
        return False


def estimate_ocr_cost(frame_count: int) -> Dict[str, float]:
    """Estimate OpenAI API costs for OCR processing"""
    # OpenAI Vision API pricing (as of 2024)
    cost_per_image = 0.01  # Approximate cost per image
    
    return {
        'estimated_cost_usd': frame_count * cost_per_image,
        'max_cost_usd': frame_count * cost_per_image * 1.2,  # Add buffer
        'currency': 'USD'
    }