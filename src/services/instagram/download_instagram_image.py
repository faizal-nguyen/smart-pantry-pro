#!/usr/bin/env python3
import sys
import json
import os
import hashlib
import requests
from urllib.parse import urlparse
import base64

def download_image_as_base64(url):
    """Télécharge l'image et la retourne en base64"""
    try:
        # Headers pour simuler un navigateur
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        # Télécharger l'image
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            # Convertir en base64
            image_data = base64.b64encode(response.content).decode('utf-8')
            content_type = response.headers.get('content-type', 'image/jpeg')
            
            # Créer une data URL
            data_url = f"data:{content_type};base64,{image_data}"
            
            return {
                'success': True,
                'data_url': data_url,
                'content_type': content_type,
                'size': len(response.content)
            }
        else:
            return {
                'success': False,
                'error': f'HTTP {response.status_code}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'URL parameter required'}))
        sys.exit(1)
    
    url = sys.argv[1]
    result = download_image_as_base64(url)
    print(json.dumps(result))