#!/usr/bin/env python3
"""
Serveur simple pour tester l'API vidéo sans Redis
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Dict, Any
import time
import uuid

app = FastAPI(title="Video Processor API", version="1.0.0")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],  # Frontend origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    url: str

class VideoResponse(BaseModel):
    task_id: str
    video_id: str
    message: str

# Stockage temporaire en mémoire (pour demo)
tasks = {}

@app.get("/")
async def root():
    return {"message": "Video Processor API", "status": "running"}

@app.get("/health")
async def health():
    return {
        "service": "Video Processor",
        "version": "1.0.0",
        "status": "healthy",
        "redis": False,  # Pas de Redis pour ce test simple
        "workers": {"active": 1}
    }

@app.post("/process/url")
async def process_video_url(request: VideoRequest):
    """Démarrer le traitement d'une URL vidéo"""
    
    # Générer des IDs
    task_id = str(uuid.uuid4())
    video_id = extract_video_id(request.url)
    
    # Valider l'URL
    if not is_valid_video_url(request.url):
        raise HTTPException(status_code=400, detail="URL vidéo non supportée")
    
    # Simuler le démarrage du traitement
    tasks[task_id] = {
        "status": "processing",
        "progress": 0,
        "current_step": "Démarrage du traitement...",
        "url": request.url,
        "video_id": video_id,
        "start_time": time.time()
    }
    
    # Démarrer la simulation de traitement
    simulate_processing(task_id, request.url)
    
    return VideoResponse(
        task_id=task_id,
        video_id=video_id,
        message="Traitement démarré"
    )

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    """Obtenir le statut du traitement"""
    
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    return tasks[task_id]

def extract_video_id(url: str) -> str:
    """Extraire l'ID de la vidéo depuis l'URL"""
    if "instagram.com/reel/" in url:
        return url.split("/reel/")[1].split("/")[0]
    elif "youtube.com/watch?v=" in url:
        return url.split("v=")[1].split("&")[0]
    elif "tiktok.com" in url:
        return url.split("/")[-1].split("?")[0]
    else:
        return str(uuid.uuid4())[:8]

def is_valid_video_url(url: str) -> bool:
    """Vérifier si l'URL est supportée"""
    supported_domains = ["instagram.com", "youtube.com", "tiktok.com"]
    return any(domain in url for domain in supported_domains)

def simulate_processing(task_id: str, url: str):
    """Simuler le traitement vidéo étape par étape"""
    
    if "instagram.com/reel/DLScf5hofId" in url:
        # Simulation spécifique pour le Poulet Mayo Congolais
        import threading
        
        def process():
            steps = [
                (10, "Validation de l'URL Instagram..."),
                (25, "Téléchargement de la vidéo..."),
                (40, "Extraction des frames..."),
                (60, "Transcription audio avec Whisper..."),
                (80, "Analyse OCR des frames..."),
                (95, "Extraction de la recette avec OpenAI..."),
                (100, "Traitement terminé")
            ]
            
            for progress, step in steps:
                if task_id in tasks:
                    tasks[task_id].update({
                        "progress": progress,
                        "current_step": step
                    })
                    time.sleep(1.5)  # Simuler le temps de traitement
            
            # Résultat final pour le Poulet Mayo Congolais
            if task_id in tasks:
                tasks[task_id].update({
                    "status": "completed",
                    "progress": 100,
                    "current_step": "Terminé",
                    "result": {
                        "metadata": {
                            "title": "Poulet Mayo Congolais",
                            "author": "@louloukitchen",
                            "duration": 58,
                            "platform": "Instagram"
                        },
                        "transcription": {
                            "language": "fr",
                            "confidence": 0.89,
                            "text": "Bonjour tout le monde, aujourd'hui je vous présente ma recette de poulet à la mayonnaise congolaise. C'est un plat traditionnel très apprécié..."
                        },
                        "recipe_data": {
                            "name": "Poulet Mayo Congolais",
                            "description": "Recette traditionnelle congolaise de poulet à la mayonnaise",
                            "cuisine_category": "Congolaise",
                            "meal_type": "Plat principal",
                            "prep_time": 30,
                            "cook_time": 45,
                            "servings": 4,
                            "difficulty": 2,
                            "ingredients": [
                                {"item": "Poulet entier", "quantity": 1, "unit": "pièce"},
                                {"item": "Mayonnaise", "quantity": 200, "unit": "g"},
                                {"item": "Oignons", "quantity": 2, "unit": "pièces"},
                                {"item": "Tomates", "quantity": 3, "unit": "pièces"},
                                {"item": "Poivrons", "quantity": 2, "unit": "pièces"},
                                {"item": "Ail", "quantity": 4, "unit": "gousses"},
                                {"item": "Gingembre", "quantity": 1, "unit": "morceau"},
                                {"item": "Cube maggi", "quantity": 2, "unit": "cubes"},
                                {"item": "Huile", "quantity": 3, "unit": "c.à.s"},
                                {"item": "Sel et poivre", "quantity": 1, "unit": "c.à.c"}
                            ],
                            "instructions": [
                                "Découper le poulet en morceaux et le faire cuire",
                                "Préparer la sauce à base de mayonnaise",
                                "Faire revenir les légumes (oignons, tomates, poivrons)",
                                "Ajouter l'ail et le gingembre pilés",
                                "Incorporer la mayonnaise progressivement",
                                "Mélanger le poulet avec la sauce",
                                "Laisser mijoter 10 minutes",
                                "Servir chaud avec du riz ou des plantains"
                            ]
                        },
                        "processing_time": 8.2,
                        "cost_estimate": 0.15
                    }
                })
        
        # Lancer le traitement en arrière-plan
        threading.Thread(target=process, daemon=True).start()
    
    elif "instagram.com/reel/DK909L4ofTr" in url:
        # Simulation spécifique pour la recette de courgettes au zaatar avec poulet
        import threading
        
        def process():
            steps = [
                (10, "Validation de l'URL Instagram..."),
                (25, "Téléchargement de la vidéo..."),
                (40, "Extraction des frames..."),
                (60, "Transcription audio avec Whisper..."),
                (80, "Analyse OCR des frames..."),
                (95, "Extraction de la recette avec OpenAI..."),
                (100, "Traitement terminé")
            ]
            
            for progress, step in steps:
                if task_id in tasks:
                    tasks[task_id].update({
                        "progress": progress,
                        "current_step": step
                    })
                    time.sleep(1.2)  # Un peu plus rapide
            
            # Résultat final pour les courgettes au zaatar
            if task_id in tasks:
                tasks[task_id].update({
                    "status": "completed",
                    "progress": 100,
                    "current_step": "Terminé",
                    "result": {
                        "metadata": {
                            "title": "Courgettes au Zaatar avec Poulet",
                            "author": "@instagram_chef",
                            "duration": 65,
                            "platform": "Instagram"
                        },
                        "transcription": {
                            "language": "fr",
                            "confidence": 0.91,
                            "text": "Alors aujourd'hui, je vous montre comment faire mes courgettes au zaatar avec du poulet. C'est une recette rapide et délicieuse. On va commencer par préparer nos courgettes..."
                        },
                        "recipe_data": {
                            "name": "Courgettes au Zaatar avec Poulet",
                            "description": "Recette savoureuse de courgettes assaisonnées au zaatar avec des filets de poulet",
                            "cuisine_category": "Méditerranéenne",
                            "meal_type": "Plat principal",
                            "prep_time": 15,
                            "cook_time": 25,
                            "servings": 3,
                            "difficulty": 1,
                            "ingredients": [
                                {"item": "Courgettes", "quantity": 2, "unit": "pièces"},
                                {"item": "Zaatar", "quantity": 1, "unit": "CAC"},
                                {"item": "Huile d'olive", "quantity": 3, "unit": "c.à.s"},
                                {"item": "Filet de poulet jaune", "quantity": 2, "unit": "pièces"},
                                {"item": "Oignon rouge", "quantity": 1, "unit": "pièce"},
                                {"item": "Curcuma", "quantity": 1, "unit": "CAS"},
                                {"item": "Moutarde à l'ancienne", "quantity": 2, "unit": "CAS"},
                                {"item": "Ciboulette", "quantity": 1, "unit": "bouquet"},
                                {"item": "Bouillon de poulet", "quantity": 1, "unit": "CAC"},
                                {"item": "Sel", "quantity": 1, "unit": "pincée"},
                                {"item": "Poivre", "quantity": 1, "unit": "pincée"}
                            ],
                            "instructions": [
                                "Laver et couper les courgettes en rondelles",
                                "Assaisonner les courgettes avec le zaatar et l'huile d'olive",
                                "Couper les filets de poulet en lamelles",
                                "Émincer l'oignon rouge finement",
                                "Faire chauffer l'huile dans une poêle",
                                "Faire revenir le poulet avec le curcuma jusqu'à dorure",
                                "Ajouter l'oignon rouge et faire suer",
                                "Incorporer les courgettes et cuire 8-10 minutes",
                                "Mélanger la moutarde à l'ancienne avec le bouillon",
                                "Ajouter le mélange moutarde-bouillon en fin de cuisson",
                                "Parsemer de ciboulette ciselée avant de servir"
                            ]
                        },
                        "processing_time": 6.8,
                        "cost_estimate": 0.12
                    }
                })
        
        # Lancer le traitement en arrière-plan
        threading.Thread(target=process, daemon=True).start()
    
    else:
        # Traitement générique pour d'autres URLs
        def generic_process():
            tasks[task_id].update({
                "status": "failed",
                "progress": 0,
                "error": "URL non supportée pour cette démo"
            })
        
        import threading
        threading.Thread(target=generic_process, daemon=True).start()

if __name__ == "__main__":
    print("🎥 Démarrage du serveur Video Processor API (mode simple)")
    print("📍 URL: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("💡 Test avec: curl http://localhost:8000/health")
    print("")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)