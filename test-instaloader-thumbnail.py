#!/usr/bin/env python3
import subprocess
import sys

# Test direct du script Python
test_url = 'https://www.instagram.com/reel/DIMJkxwIGhn/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=='

print("🧪 Test de récupération de la vignette Instagram avec Instaloader")
print(f"📍 URL: {test_url}")
print("-" * 50)

# Exécuter le script
result = subprocess.run([sys.executable, 'api/instagram_metadata.py', test_url], 
                       capture_output=True, text=True)

print(f"🔤 Code de sortie: {result.returncode}")
print(f"📝 Sortie standard:")
print(result.stdout)
if result.stderr:
    print(f"⚠️ Erreur standard:")
    print(result.stderr)