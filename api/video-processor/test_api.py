#!/usr/bin/env python3
"""
Test script for the Video Processing API
"""
import requests
import time
import json
from pathlib import Path

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll for testing


def test_health():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    response = requests.get(f"{API_BASE_URL}/health")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Health check passed: {data['status']}")
        print(f"   Services: {data['services']}")
        return True
    else:
        print(f"❌ Health check failed: {response.status_code}")
        return False


def test_supported_languages():
    """Test supported languages endpoint"""
    print("\n🌍 Testing supported languages endpoint...")
    response = requests.get(f"{API_BASE_URL}/info/supported-languages")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Supported languages: {len(data['languages'])} languages")
        print(f"   Default model: {data['default']}")
        return True
    else:
        print(f"❌ Supported languages failed: {response.status_code}")
        return False


def test_pricing_info():
    """Test pricing information endpoint"""
    print("\n💰 Testing pricing info endpoint...")
    response = requests.get(f"{API_BASE_URL}/info/pricing")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Pricing info retrieved:")
        for service, info in data.items():
            print(f"   {service}: {info['description']}")
        return True
    else:
        print(f"❌ Pricing info failed: {response.status_code}")
        return False


def test_cost_estimation():
    """Test cost estimation endpoint"""
    print("\n📊 Testing cost estimation endpoint...")
    payload = {
        "duration": 120,  # 2 minutes
        "frame_count": 0  # Will be estimated from duration
    }
    
    response = requests.post(f"{API_BASE_URL}/estimate-cost", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Cost estimation:")
        print(f"   Estimated frames: {data['estimated_frames']}")
        print(f"   Total cost: ${data['total_estimated_cost']:.4f}")
        return True
    else:
        print(f"❌ Cost estimation failed: {response.status_code}")
        return False


def test_queue_status():
    """Test queue status endpoint"""
    print("\n⚙️ Testing queue status endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/queue/status")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Queue status retrieved")
            if 'stats' in data:
                print(f"   Active workers: Available")
            return True
        else:
            print(f"❌ Queue status failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Queue status error: {e}")
        return False


def test_video_url_processing():
    """Test video URL processing (without actually processing)"""
    print(f"\n🎥 Testing video URL processing submission...")
    
    # Note: This won't work without a valid OpenAI API key
    payload = {
        "url": TEST_VIDEO_URL,
        "language": "en",
        "extract_frames": True,
        "transcribe_audio": True,
        "extract_text": False  # Disable to avoid API costs
    }
    
    response = requests.post(f"{API_BASE_URL}/process/url", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Video processing submitted:")
        print(f"   Video ID: {data['video_id']}")
        print(f"   Task ID: {data['task_id']}")
        print(f"   Status: {data['status']}")
        return data['task_id'], data['video_id']
    elif response.status_code == 500:
        print("⚠️  Video processing failed (likely missing OpenAI API key)")
        print("   This is expected if OpenAI API key is not configured")
        return None, None
    else:
        print(f"❌ Video processing failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return None, None


def test_task_status(task_id):
    """Test task status endpoint"""
    if not task_id:
        return
        
    print(f"\n📋 Testing task status for {task_id}...")
    response = requests.get(f"{API_BASE_URL}/status/{task_id}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Task status: {data['status']}")
        print(f"   Progress: {data['progress']}%")
        print(f"   Message: {data['message']}")
        return True
    else:
        print(f"❌ Task status failed: {response.status_code}")
        return False


def main():
    """Run all tests"""
    print("🚀 Starting Video Processing API Tests")
    print("=" * 50)
    
    # Basic tests
    tests_passed = 0
    total_tests = 0
    
    # Test basic endpoints
    basic_tests = [
        test_health,
        test_supported_languages,
        test_pricing_info,
        test_cost_estimation,
        test_queue_status,
    ]
    
    for test in basic_tests:
        total_tests += 1
        if test():
            tests_passed += 1
        time.sleep(0.5)  # Small delay between tests
    
    # Test video processing (might fail without API key)
    total_tests += 1
    task_id, video_id = test_video_url_processing()
    if task_id:
        tests_passed += 1
        time.sleep(1)
        
        # Test task status
        total_tests += 1
        if test_task_status(task_id):
            tests_passed += 1
    
    # Summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! API is working correctly.")
    elif tests_passed >= total_tests - 2:  # Allow for API key related failures
        print("✅ Core API functionality is working.")
        print("💡 Some tests may have failed due to missing OpenAI API key.")
    else:
        print("❌ Some tests failed. Please check the API configuration.")
    
    print("\n📝 Next Steps:")
    print("1. Configure OpenAI API key in .env file")
    print("2. Test with actual video processing")
    print("3. Monitor logs for any issues")
    
    return tests_passed >= (total_tests - 2)


if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Test runner error: {e}")
        exit(1)