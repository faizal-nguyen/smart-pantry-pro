#!/usr/bin/env python3
import sys
import json
import os
import tempfile
import instaloader
from pathlib import Path

def extract_shortcode(url):
    """Extract shortcode from Instagram URL"""
    import re
    
    # Clean URL
    url = url.strip()
    
    # Pattern to match Instagram URLs
    pattern = r'(?:https?://)?(?:www\.)?instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]+)'
    match = re.search(pattern, url)
    
    if match:
        return match.group(1)
    
    raise ValueError("Invalid Instagram URL")

def download_instagram_video(url):
    """Download Instagram video and metadata using Instaloader"""
    
    result = {
        "success": False,
        "video_path": None,
        "caption": "",
        "metadata": {},
        "error": None
    }
    
    try:
        # Extract shortcode
        shortcode = extract_shortcode(url)
        
        # Create Instaloader instance
        L = instaloader.Instaloader(
            download_videos=True,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            quiet=True
        )
        
        # Create temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            L.dirname_pattern = temp_dir
            
            # Get post
            post = instaloader.Post.from_shortcode(L.context, shortcode)
            
            # Extract metadata
            result["caption"] = post.caption if post.caption else ""
            result["metadata"] = {
                "author": post.owner_username,
                "likes": post.likes,
                "video_view_count": post.video_view_count if hasattr(post, 'video_view_count') else 0,
                "is_video": post.is_video,
                "date": post.date.isoformat() if post.date else None,
                "shortcode": shortcode
            }
            
            # Check if it's a video
            if not post.is_video:
                result["error"] = "Post is not a video"
                return result
            
            # Download the video
            L.download_post(post, target=temp_dir)
            
            # Find the downloaded video file
            video_files = list(Path(temp_dir).glob("*.mp4"))
            if video_files:
                # Copy to a persistent location
                video_path = f"/tmp/instagram_{shortcode}.mp4"
                import shutil
                shutil.copy(str(video_files[0]), video_path)
                result["video_path"] = video_path
                result["success"] = True
            else:
                result["error"] = "No video file found after download"
                
    except instaloader.exceptions.LoginRequiredException:
        result["error"] = "Instagram login required for this content"
    except instaloader.exceptions.PrivateProfileNotFollowedException:
        result["error"] = "Private profile - cannot access"
    except Exception as e:
        error_msg = str(e)
        # Common errors that require login
        if any(msg in error_msg.lower() for msg in ['login', 'metadata failed', 'not available', '401']):
            result["error"] = "Instagram login required - using demo mode"
        else:
            result["error"] = error_msg
    
    return result

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No URL provided"}))
        sys.exit(1)
    
    url = sys.argv[1]
    result = download_instagram_video(url)
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()