#!/usr/bin/env python3
import sys
import json
import re
from playwright.sync_api import sync_playwright
import base64
from io import BytesIO

def extract_shortcode(url):
    """Extract shortcode from Instagram URL"""
    url = url.strip()
    pattern = r'(?:https?://)?(?:www\.)?instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]+)'
    match = re.search(pattern, url)
    
    if match:
        return match.group(1)
    
    raise ValueError("Invalid Instagram URL")

def take_instagram_screenshot(url):
    """Take a screenshot of an Instagram post using Playwright"""
    
    result = {
        "success": False,
        "screenshot_base64": None,
        "error": None,
        "metadata": {}
    }
    
    try:
        # Extract shortcode
        shortcode = extract_shortcode(url)
        result["metadata"]["shortcode"] = shortcode
        
        with sync_playwright() as p:
            # Launch browser in headless mode
            browser = p.chromium.launch(headless=True)
            
            # Create a new page with mobile viewport (Instagram looks better on mobile)
            context = browser.new_context(
                viewport={'width': 414, 'height': 896},
                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
            )
            page = context.new_page()
            
            # Navigate to the URL
            page.goto(url, wait_until='networkidle')
            
            # Wait for content to load
            page.wait_for_timeout(2000)
            
            # Try to close any popups or login prompts
            try:
                # Close cookie banner if present
                page.click('button:has-text("Accept")', timeout=1000)
            except:
                pass
            
            try:
                # Close login prompt if present
                page.click('button:has-text("Not Now")', timeout=1000)
            except:
                pass
            
            # Find the main post content
            # Instagram structure can vary, so we try multiple selectors
            post_element = None
            selectors = [
                'article[role="presentation"]',
                'article',
                'div[role="button"]:has(video)',
                'div[role="button"]:has(img)',
                'main'
            ]
            
            for selector in selectors:
                try:
                    if page.locator(selector).count() > 0:
                        post_element = page.locator(selector).first
                        break
                except:
                    continue
            
            if post_element:
                # Take screenshot of the post element
                screenshot_bytes = post_element.screenshot()
            else:
                # Fallback: take screenshot of the viewport
                screenshot_bytes = page.screenshot()
            
            # Convert to base64
            screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            
            result["screenshot_base64"] = screenshot_base64
            result["success"] = True
            result["metadata"]["url"] = url
            
            browser.close()
            
    except Exception as e:
        result["error"] = str(e)
        result["success"] = False
    
    return result

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No URL provided"}))
        sys.exit(1)
    
    url = sys.argv[1]
    result = take_instagram_screenshot(url)
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()