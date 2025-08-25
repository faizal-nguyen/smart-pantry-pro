#!/usr/bin/env python3
import sys
import json
import instaloader
import re

def extract_shortcode(url):
    """Extract shortcode from Instagram URL"""
    url = url.strip()
    pattern = r'(?:https?://)?(?:www\.)?instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]+)'
    match = re.search(pattern, url)
    
    if match:
        return match.group(1)
    
    raise ValueError("Invalid Instagram URL")

def get_instagram_metadata(url):
    """Get Instagram post metadata including thumbnail using Instaloader"""
    
    result = {
        "success": False,
        "thumbnail_url": None,
        "video_url": None,
        "title": "",
        "description": "",
        "author_name": "",
        "author_url": "",
        "metadata": {},
        "error": None
    }
    
    try:
        # Extract shortcode
        shortcode = extract_shortcode(url)
        
        # Create Instaloader instance (no download, just metadata)
        L = instaloader.Instaloader(
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            quiet=True
        )
        
        # Get post metadata
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        
        # Extract thumbnail URL (this is the key part!)
        # For videos and images, post.url gives us the thumbnail/image URL
        result["thumbnail_url"] = post.url
        
        # Try to download image as base64 to avoid CORS issues
        thumbnail_base64 = None
        if post.url:
            try:
                import requests
                import base64
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                img_response = requests.get(post.url, headers=headers, timeout=10)
                if img_response.status_code == 200:
                    image_data = base64.b64encode(img_response.content).decode('utf-8')
                    content_type = img_response.headers.get('content-type', 'image/jpeg')
                    thumbnail_base64 = f"data:{content_type};base64,{image_data}"
            except:
                # If download fails, continue with normal URL
                pass
        
        result["thumbnail_base64"] = thumbnail_base64
        
        # Extract other metadata
        result["title"] = f"Instagram post by @{post.owner_username}"
        result["description"] = post.caption if post.caption else ""
        result["author_name"] = post.owner_username
        result["author_url"] = f"https://www.instagram.com/{post.owner_username}/"
        
        # Video URL if it's a video
        if post.is_video and hasattr(post, 'video_url'):
            result["video_url"] = post.video_url
        
        # Additional metadata
        result["metadata"] = {
            "likes": post.likes,
            "comments": post.comments,
            "is_video": post.is_video,
            "date": post.date.isoformat() if post.date else None,
            "shortcode": shortcode,
            "media_id": post.mediaid if hasattr(post, 'mediaid') else None,
            "typename": post.typename if hasattr(post, 'typename') else None
        }
        
        # Get dimensions if available
        if hasattr(post, 'dimensions'):
            result["metadata"]["width"] = post.dimensions[0]
            result["metadata"]["height"] = post.dimensions[1]
        
        result["success"] = True
            
    except instaloader.exceptions.LoginRequiredException:
        # Even without login, we might still get some basic info
        result["error"] = "Some metadata requires Instagram login"
        result["success"] = False
    except instaloader.exceptions.PrivateProfileNotFollowedException:
        result["error"] = "Private profile - cannot access"
        result["success"] = False
    except Exception as e:
        result["error"] = str(e)
        result["success"] = False
    
    return result

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No URL provided"}))
        sys.exit(1)
    
    url = sys.argv[1]
    result = get_instagram_metadata(url)
    
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()