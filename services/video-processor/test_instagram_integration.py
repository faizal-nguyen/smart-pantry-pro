#!/usr/bin/env python3
"""
Test unitaire pour l'intégration Instagram
Test avec une vraie URL Instagram Reel
"""

import asyncio
import json
import time
from pathlib import Path
import requests
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000"
INSTAGRAM_URL = "https://www.instagram.com/reel/DLScf5hofId/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=="

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_step(message, color=Colors.BLUE):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{timestamp}] {message}{Colors.ENDC}")

def print_success(message):
    print_step(f"✅ {message}", Colors.GREEN)

def print_error(message):
    print_step(f"❌ {message}", Colors.RED)

def print_info(message):
    print_step(f"ℹ️  {message}", Colors.YELLOW)

def check_backend_health():
    """Vérifier que le backend est en ligne"""
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print_success(f"Backend en ligne - {data['service']} v{data['version']}")
            print_info(f"Redis: {'✓' if data['redis'] else '✗'}")
            print_info(f"Workers: {data['workers']['active']} actifs")
            return True
        else:
            print_error(f"Backend retourne le code {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Impossible de se connecter au backend. Est-il lancé ?")
        print_info("Lancez './start-video-backend.sh' dans un autre terminal")
        return False

def submit_video_url(url):
    """Soumettre l'URL pour traitement"""
    print_step(f"Soumission de l'URL Instagram...")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/process/url",
            json={"url": url}
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Tâche créée - ID: {data['task_id']}")
            print_info(f"Video ID: {data['video_id']}")
            return data['task_id'], data['video_id']
        else:
            error = response.json()
            print_error(f"Erreur: {error.get('detail', 'Unknown error')}")
            return None, None
            
    except Exception as e:
        print_error(f"Exception: {str(e)}")
        return None, None

def check_processing_status(task_id):
    """Suivre le statut du traitement"""
    print_step("Suivi du traitement...")
    
    last_progress = -1
    last_step = ""
    start_time = time.time()
    
    while True:
        try:
            response = requests.get(f"{API_BASE_URL}/status/{task_id}")
            
            if response.status_code == 200:
                data = response.json()
                status = data['status']
                progress = data.get('progress', 0)
                current_step = data.get('current_step', 'En attente...')
                
                # Afficher la progression si elle change
                if progress != last_progress or current_step != last_step:
                    elapsed = int(time.time() - start_time)
                    print_info(f"[{elapsed}s] {progress}% - {current_step}")
                    last_progress = progress
                    last_step = current_step
                
                if status == 'completed':
                    print_success("Traitement terminé !")
                    return data.get('result')
                    
                elif status == 'failed':
                    print_error(f"Échec: {data.get('error', 'Unknown error')}")
                    return None
                    
            else:
                print_error(f"Erreur de statut: {response.status_code}")
                return None
                
        except Exception as e:
            print_error(f"Exception: {str(e)}")
            return None
            
        time.sleep(2)  # Attendre 2 secondes avant de vérifier à nouveau

def analyze_results(result):
    """Analyser et afficher les résultats"""
    print_step("\n📊 Analyse des résultats", Colors.BOLD)
    
    if not result:
        print_error("Aucun résultat à analyser")
        return
    
    # Métadonnées
    metadata = result.get('metadata', {})
    print_step("\n🎬 Métadonnées vidéo:")
    print_info(f"Titre: {metadata.get('title', 'Non disponible')}")
    print_info(f"Auteur: {metadata.get('author', 'Non disponible')}")
    print_info(f"Durée: {metadata.get('duration', 0)}s")
    print_info(f"Plateforme: {metadata.get('platform', 'Non disponible')}")
    
    # Frames extraites
    frames = result.get('frames_extracted', 0)
    print_step(f"\n🖼️ Frames extraites: {frames}")
    
    # Transcription
    transcription = result.get('transcription', {})
    if transcription:
        print_step("\n🎤 Transcription audio:")
        print_info(f"Langue détectée: {transcription.get('language', 'Non détectée')}")
        print_info(f"Confiance: {transcription.get('confidence', 0):.2%}")
        text = transcription.get('text', '')[:200]
        if text:
            print_info(f"Extrait: {text}...")
        else:
            print_info("Aucun texte transcrit")
    
    # OCR
    ocr_results = result.get('ocr_results', [])
    if ocr_results:
        print_step(f"\n👁️ OCR - {len(ocr_results)} frames analysées:")
        for i, ocr in enumerate(ocr_results[:3]):  # Afficher max 3
            text = ocr.get('text', '')[:100]
            if text:
                print_info(f"Frame {i+1}: {text}...")
    
    # Données de recette
    recipe_data = result.get('recipe_data', {})
    if recipe_data:
        print_step("\n🍳 Recette extraite:")
        
        ingredients = recipe_data.get('ingredients', [])
        if ingredients:
            print_info(f"Ingrédients ({len(ingredients)}):")
            for ing in ingredients[:5]:  # Afficher max 5
                print(f"  • {ing}")
        
        instructions = recipe_data.get('instructions', [])
        if instructions:
            print_info(f"\nInstructions ({len(instructions)} étapes):")
            for i, inst in enumerate(instructions[:3]):  # Afficher max 3
                print(f"  {i+1}. {inst[:100]}...")
    
    # Statistiques
    print_step("\n📈 Statistiques:")
    print_info(f"Temps de traitement: {result.get('processing_time', 0):.2f}s")
    print_info(f"Coût estimé: ${result.get('cost_estimate', 0):.3f}")
    
    # Liens de téléchargement
    downloads = result.get('download_links', {})
    if downloads:
        print_step("\n💾 Fichiers disponibles:")
        for file_type, link in downloads.items():
            if link:
                print_info(f"{file_type}: {API_BASE_URL}{link}")

def save_results(result, video_id):
    """Sauvegarder les résultats dans un fichier"""
    if not result:
        return
        
    output_dir = Path("test_results")
    output_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"instagram_test_{video_id}_{timestamp}.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print_success(f"\nRésultats sauvegardés: {output_file}")

def main():
    """Test principal"""
    print(f"{Colors.BOLD}\n🧪 Test d'intégration Instagram Video Processing{Colors.ENDC}")
    print(f"{Colors.BOLD}{'='*50}{Colors.ENDC}\n")
    
    print_info(f"URL testée: {INSTAGRAM_URL}")
    
    # 1. Vérifier la santé du backend
    print_step("\n1️⃣ Vérification du backend...")
    if not check_backend_health():
        return
    
    # 2. Soumettre l'URL
    print_step("\n2️⃣ Soumission de la vidéo...")
    task_id, video_id = submit_video_url(INSTAGRAM_URL)
    
    if not task_id:
        print_error("Impossible de soumettre la vidéo")
        return
    
    # 3. Suivre le traitement
    print_step("\n3️⃣ Traitement en cours...")
    result = check_processing_status(task_id)
    
    # 4. Analyser les résultats
    if result:
        analyze_results(result)
        save_results(result, video_id)
        
        # Test de téléchargement
        print_step("\n4️⃣ Test de téléchargement...")
        try:
            # Télécharger la transcription
            if result.get('transcription'):
                response = requests.get(f"{API_BASE_URL}/download/{video_id}/transcription")
                if response.status_code == 200:
                    print_success("Transcription téléchargée avec succès")
                    
            # Télécharger la recette
            if result.get('recipe_data'):
                response = requests.get(f"{API_BASE_URL}/download/{video_id}/recipe")
                if response.status_code == 200:
                    print_success("Recette téléchargée avec succès")
                    
        except Exception as e:
            print_error(f"Erreur de téléchargement: {str(e)}")
    
    print(f"\n{Colors.BOLD}{'='*50}{Colors.ENDC}")
    print_success("Test terminé !\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_error("\n\nTest interrompu par l'utilisateur")
    except Exception as e:
        print_error(f"\n\nErreur inattendue: {str(e)}")
        import traceback
        traceback.print_exc()