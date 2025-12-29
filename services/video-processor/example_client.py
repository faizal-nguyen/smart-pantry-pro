#!/usr/bin/env python3
"""
Example client for the Video Processing API
Shows how to process videos and retrieve results
"""
import requests
import time
import json
from pathlib import Path


class VideoProcessingClient:
    """Client for interacting with the Video Processing API"""
    
    def __init__(self, base_url="http://localhost:8000", api_key=None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {}
        
        if api_key:
            self.headers['Authorization'] = f'Bearer {api_key}'
    
    def health_check(self):
        """Check API health"""
        response = requests.get(f"{self.base_url}/health")
        return response.json() if response.status_code == 200 else None
    
    def process_video_url(self, url, language=None, extract_frames=True, 
                         transcribe_audio=True, extract_text=True):
        """Process video from URL"""
        payload = {
            "url": url,
            "extract_frames": extract_frames,
            "transcribe_audio": transcribe_audio,
            "extract_text": extract_text
        }
        
        if language:
            payload["language"] = language
        
        response = requests.post(
            f"{self.base_url}/process/url",
            json=payload,
            headers=self.headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    def upload_video(self, file_path, language=None):
        """Upload and process video file"""
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Video file not found: {file_path}")
        
        files = {'file': open(file_path, 'rb')}
        data = {}
        
        if language:
            data['language'] = language
        
        response = requests.post(
            f"{self.base_url}/process/upload",
            files=files,
            data=data,
            headers=self.headers
        )
        
        files['file'].close()
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    def get_task_status(self, task_id):
        """Get processing task status"""
        response = requests.get(f"{self.base_url}/status/{task_id}")
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    def get_result(self, video_id):
        """Get processing results"""
        response = requests.get(f"{self.base_url}/result/{video_id}")
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    def download_file(self, video_id, file_type, output_path=None):
        """Download processed file"""
        response = requests.get(f"{self.base_url}/download/{video_id}/{file_type}")
        
        if response.status_code == 200:
            if output_path:
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                return str(output_path)
            else:
                return response.content
        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    def wait_for_completion(self, task_id, max_wait_time=600, poll_interval=10):
        """Wait for task completion with progress updates"""
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:
            try:
                status = self.get_task_status(task_id)
                
                print(f"Status: {status['status']} - Progress: {status['progress']}% - {status['message']}")
                
                if status['status'] in ['SUCCESS', 'FAILURE']:
                    return status
                
                time.sleep(poll_interval)
                
            except Exception as e:
                print(f"Error checking status: {e}")
                time.sleep(poll_interval)
        
        raise TimeoutError(f"Task did not complete within {max_wait_time} seconds")


def example_url_processing():
    """Example: Process video from URL"""
    print("🎬 Example: Processing video from URL")
    print("-" * 40)
    
    # Initialize client
    client = VideoProcessingClient()
    
    # Check health
    health = client.health_check()
    if not health:
        print("❌ API is not healthy")
        return
    
    print(f"✅ API is healthy: {health['status']}")
    
    # Process video
    video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    try:
        print(f"🚀 Submitting video for processing: {video_url}")
        
        result = client.process_video_url(
            url=video_url,
            language="en",
            extract_frames=True,
            transcribe_audio=True,
            extract_text=False  # Disable to avoid API costs
        )
        
        print(f"📋 Task submitted:")
        print(f"   Video ID: {result['video_id']}")
        print(f"   Task ID: {result['task_id']}")
        
        # Wait for completion (this might take a while)
        print("⏳ Waiting for processing to complete...")
        final_status = client.wait_for_completion(result['task_id'])
        
        if final_status['status'] == 'SUCCESS':
            print("🎉 Processing completed successfully!")
            
            # Get results
            processing_result = client.get_result(result['video_id'])
            print("\n📊 Processing Results:")
            print(f"   Status: {processing_result['status']}")
            
            if processing_result.get('transcription'):
                print("   ✅ Transcription available")
            if processing_result.get('extracted_text'):
                print("   ✅ Text extraction available")
            
            # Download files
            print("\n💾 Downloading results...")
            try:
                client.download_file(
                    result['video_id'], 
                    'transcription',
                    f"{result['video_id']}_transcription.json"
                )
                print("   ✅ Downloaded transcription")
            except:
                print("   ⚠️ Transcription not available")
        
        else:
            print(f"❌ Processing failed: {final_status.get('error', 'Unknown error')}")
    
    except Exception as e:
        print(f"❌ Error: {e}")


def example_file_upload():
    """Example: Process uploaded video file"""
    print("\n🎬 Example: Processing uploaded video file")
    print("-" * 40)
    
    # This is just a demonstration - you would need an actual video file
    video_file = "sample_video.mp4"
    
    if not Path(video_file).exists():
        print(f"⚠️ Sample video file not found: {video_file}")
        print("   Create a sample video file or modify the path")
        return
    
    client = VideoProcessingClient()
    
    try:
        print(f"📤 Uploading video: {video_file}")
        
        result = client.upload_video(
            file_path=video_file,
            language="en"
        )
        
        print(f"📋 Upload successful:")
        print(f"   Video ID: {result['video_id']}")
        print(f"   Task ID: {result['task_id']}")
        
        # Monitor progress
        print("⏳ Processing video...")
        final_status = client.wait_for_completion(result['task_id'])
        
        if final_status['status'] == 'SUCCESS':
            print("🎉 Processing completed!")
        else:
            print(f"❌ Processing failed: {final_status.get('error')}")
    
    except FileNotFoundError:
        print(f"❌ Video file not found: {video_file}")
    except Exception as e:
        print(f"❌ Error: {e}")


def example_api_exploration():
    """Example: Explore API endpoints"""
    print("\n🔍 Example: Exploring API capabilities")
    print("-" * 40)
    
    client = VideoProcessingClient()
    
    try:
        # Get supported languages
        response = requests.get("http://localhost:8000/info/supported-languages")
        if response.status_code == 200:
            languages = response.json()
            print(f"🌍 Supported languages: {len(languages['languages'])}")
            print(f"   Sample: {languages['languages'][:5]}")
        
        # Get pricing info
        response = requests.get("http://localhost:8000/info/pricing")
        if response.status_code == 200:
            pricing = response.json()
            print("\n💰 Pricing information:")
            for service, info in pricing.items():
                print(f"   {service}: {info['description']}")
        
        # Estimate costs
        response = requests.post("http://localhost:8000/estimate-cost", json={
            "duration": 60,  # 1 minute video
            "frame_count": 0
        })
        if response.status_code == 200:
            cost = response.json()
            print(f"\n📊 Cost estimate for 1-minute video:")
            print(f"   Estimated frames: {cost['estimated_frames']}")
            print(f"   Estimated cost: ${cost['total_estimated_cost']:.4f}")
    
    except Exception as e:
        print(f"❌ Error exploring API: {e}")


def main():
    """Run examples"""
    print("🎥 Video Processing API Client Examples")
    print("=" * 50)
    
    # Check if API is running
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code != 200:
            print("❌ API is not running or not healthy")
            print("   Please start the API with: ./start.sh")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API")
        print("   Please start the API with: ./start.sh")
        return
    
    # Run examples
    example_api_exploration()
    
    # Uncomment to test actual processing (requires OpenAI API key)
    # example_url_processing()
    # example_file_upload()
    
    print("\n✨ Examples completed!")
    print("\n💡 Tips:")
    print("1. Configure OpenAI API key in .env for full functionality")
    print("2. Uncomment processing examples to test actual video processing")
    print("3. Monitor processing with Flower at http://localhost:5555")


if __name__ == "__main__":
    main()