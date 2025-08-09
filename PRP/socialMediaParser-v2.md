socialMediaParser-v2

Searched project for “social media parser import recipe Instagram TikTok YouTube extraction”
7 résultats










Excellent ! Je vois que tu as déjà une base solide pour le parsing social media. Maintenant, je vais te montrer ce qu'il faut modifier et ajouter pour implémenter le pipeline complet Whisper + GPT-4 Vision pour une extraction de recettes de qualité professionnelle.

🔍 Analyse de ton Code Existant
✅ Ce qui est bien
Structure modulaire avec socialMediaParser
Détection automatique des plateformes
Hook useSocialRecipeParser bien structuré
Support multi-plateformes (Instagram, TikTok, YouTube, Pinterest)
Interface utilisateur SocialMediaInput déjà prête
❌ Ce qui manque
Pas d'extraction vidéo réelle - Juste des mocks
Pas de transcription audio (Whisper)
Pas d'analyse visuelle (GPT-4 Vision)
Pas de téléchargement de vidéos
Parsing basique sans IA avancée
🚀 Plan d'Implémentation Complet
1. 📦 Nouvelles Dépendances à Ajouter
json
// package.json
{
  "dependencies": {
    // Extraction vidéo
    "ytdl-core": "^4.11.5",          // YouTube download
    "tiktok-scraper": "^1.4.36",     // TikTok extraction
    "instagram-private-api": "^1.45.3", // Instagram API
    
    // Traitement média
    "fluent-ffmpeg": "^2.1.2",       // Extraction audio/frames
    "@ffmpeg/ffmpeg": "^0.12.0",     // FFmpeg WASM pour browser
    "@ffmpeg/util": "^0.12.0",
    
    // IA
    "openai": "^4.28.0",              // GPT-4 Vision + Whisper
    
    // Utils
    "playwright": "^1.42.0",          // Web scraping avancé
    "cheerio": "^1.0.0-rc.12",       // HTML parsing
    "p-limit": "^5.0.0"               // Limite de concurrence
  }
}
2. 🎯 Nouveau Service : Video Recipe Extractor
Créer un nouveau fichier : src/services/videoRecipeExtractor/videoRecipeExtractor.ts

typescript
// src/services/videoRecipeExtractor/videoRecipeExtractor.ts
import { OpenAI } from 'openai';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export interface VideoExtractionResult {
  transcript: string;
  frames: string[];
  metadata: {
    duration: number;
    fps: number;
    resolution: { width: number; height: number };
  };
  captions?: string;
  comments?: string[];
}

export interface EnhancedRecipeResult {
  recipe: {
    name: string;
    description: string;
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      category: string;
      optional?: boolean;
    }>;
    instructions: Array<{
      step: number;
      text: string;
      duration?: number;
      temperature?: string;
      technique?: string;
      imageUrl?: string;
    }>;
    nutrition?: {
      calories: number;
      proteins: number;
      carbs: number;
      fats: number;
      fiber?: number;
    };
    metadata: {
      prepTime: number;
      cookTime: number;
      totalTime: number;
      servings: number;
      difficulty: 'facile' | 'moyen' | 'difficile';
      cuisine: string;
      course: string;
      season?: string;
      occasions?: string[];
    };
  };
  confidence: number;
  extractionDetails: {
    audioAnalysis: any;
    visualAnalysis: any[];
    textAnalysis: any;
  };
}

export class VideoRecipeExtractor {
  private openai: OpenAI;
  private ffmpeg: any;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Pour dev uniquement
    });
  }
  
  /**
   * Pipeline principal d'extraction
   */
  async extractRecipeFromVideo(
    videoUrl: string,
    platform: 'instagram' | 'tiktok' | 'youtube' | 'pinterest'
  ): Promise<EnhancedRecipeResult> {
    try {
      console.log('🎬 Starting video extraction for:', platform, videoUrl);
      
      // 1. Télécharger la vidéo
      const videoData = await this.downloadVideo(videoUrl, platform);
      
      // 2. Extraire l'audio et transcrire avec Whisper
      const transcript = await this.extractAndTranscribe(videoData.videoBuffer);
      
      // 3. Extraire des frames clés et analyser avec GPT-4 Vision
      const frames = await this.extractKeyFrames(videoData.videoBuffer);
      const visualAnalysis = await this.analyzeFramesWithVision(frames);
      
      // 4. Récupérer les métadonnées (captions, commentaires)
      const metadata = await this.extractPlatformMetadata(videoUrl, platform);
      
      // 5. Synthétiser toutes les données avec GPT-4
      const recipe = await this.synthesizeRecipe({
        transcript,
        visualAnalysis,
        metadata,
        platform
      });
      
      return recipe;
      
    } catch (error) {
      console.error('Video extraction error:', error);
      throw error;
    }
  }
  
  /**
   * Télécharger la vidéo selon la plateforme
   */
  private async downloadVideo(
    url: string, 
    platform: string
  ): Promise<{ videoBuffer: ArrayBuffer; metadata: any }> {
    
    switch (platform) {
      case 'youtube':
        return await this.downloadYouTubeVideo(url);
      case 'tiktok':
        return await this.downloadTikTokVideo(url);
      case 'instagram':
        return await this.downloadInstagramVideo(url);
      default:
        throw new Error(`Platform ${platform} not supported`);
    }
  }
  
  /**
   * Télécharger vidéo YouTube
   */
  private async downloadYouTubeVideo(url: string) {
    const ytdl = require('ytdl-core');
    
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestvideo',
      filter: 'audioandvideo'
    });
    
    const videoStream = ytdl(url, { format });
    const chunks: Buffer[] = [];
    
    return new Promise<{ videoBuffer: ArrayBuffer; metadata: any }>((resolve, reject) => {
      videoStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      videoStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          videoBuffer: buffer.buffer,
          metadata: {
            title: info.videoDetails.title,
            description: info.videoDetails.description,
            author: info.videoDetails.author.name,
            duration: parseInt(info.videoDetails.lengthSeconds)
          }
        });
      });
      videoStream.on('error', reject);
    });
  }
  
  /**
   * Extraire et transcrire l'audio avec Whisper
   */
  private async extractAndTranscribe(videoBuffer: ArrayBuffer): Promise<string> {
    try {
      // Initialiser FFmpeg WASM
      if (!this.ffmpeg) {
        this.ffmpeg = createFFmpeg({ log: false });
        await this.ffmpeg.load();
      }
      
      // Écrire la vidéo dans FFmpeg
      this.ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoBuffer));
      
      // Extraire l'audio
      await this.ffmpeg.run(
        '-i', 'input.mp4',
        '-vn',
        '-acodec', 'libmp3lame',
        '-ac', '1',
        '-ar', '16000',
        '-f', 'mp3',
        'audio.mp3'
      );
      
      // Lire l'audio extrait
      const audioData = this.ffmpeg.FS('readFile', 'audio.mp3');
      
      // Créer un File object pour Whisper
      const audioFile = new File([audioData], 'audio.mp3', { type: 'audio/mp3' });
      
      // Transcrire avec Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "fr",
        response_format: "verbose_json",
        timestamp_granularities: ["segment", "word"]
      });
      
      console.log('📝 Transcription complète:', transcription);
      
      return transcription.text;
      
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }
  
  /**
   * Extraire les frames clés de la vidéo
   */
  private async extractKeyFrames(
    videoBuffer: ArrayBuffer, 
    numFrames: number = 10
  ): Promise<string[]> {
    try {
      if (!this.ffmpeg) {
        this.ffmpeg = createFFmpeg({ log: false });
        await this.ffmpeg.load();
      }
      
      // Écrire la vidéo
      this.ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoBuffer));
      
      // Obtenir la durée
      await this.ffmpeg.run('-i', 'input.mp4');
      
      const frames: string[] = [];
      
      // Extraire des frames à intervalles réguliers
      for (let i = 0; i < numFrames; i++) {
        const timestamp = (i / numFrames) * 100; // Pourcentage
        const outputName = `frame_${i}.jpg`;
        
        await this.ffmpeg.run(
          '-i', 'input.mp4',
          '-vf', `select='gte(n\\,${i})'`,
          '-vframes', '1',
          '-f', 'image2',
          outputName
        );
        
        const frameData = this.ffmpeg.FS('readFile', outputName);
        const base64 = btoa(String.fromCharCode(...frameData));
        frames.push(base64);
        
        // Nettoyer
        this.ffmpeg.FS('unlink', outputName);
      }
      
      return frames;
      
    } catch (error) {
      console.error('Frame extraction error:', error);
      return [];
    }
  }
  
  /**
   * Analyser les frames avec GPT-4 Vision
   */
  private async analyzeFramesWithVision(frames: string[]): Promise<any[]> {
    const analyses = await Promise.all(frames.map(async (frameBase64, index) => {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyse cette image d'une vidéo de recette (frame ${index + 1}/${frames.length}).
                
                Identifie et décris en détail:
                1. Les ingrédients visibles (nom, quantité approximative, état)
                2. Les ustensiles et équipements utilisés
                3. La technique de cuisine employée
                4. L'étape de la recette (début, milieu, fin)
                5. Les textures et couleurs des aliments
                6. Tout texte visible à l'écran
                
                Format JSON avec: ingredients[], tools[], techniques[], stage, text_overlay`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${frameBase64}`,
                  detail: "high"
                }
              }
            ]
          }],
          max_tokens: 1000,
          temperature: 0.2
        });
        
        return JSON.parse(response.choices[0].message.content || '{}');
        
      } catch (error) {
        console.error(`Frame ${index} analysis error:`, error);
        return null;
      }
    }));
    
    return analyses.filter(a => a !== null);
  }
  
  /**
   * Synthétiser toutes les données en recette structurée
   */
  private async synthesizeRecipe(data: {
    transcript: string;
    visualAnalysis: any[];
    metadata: any;
    platform: string;
  }): Promise<EnhancedRecipeResult> {
    
    const prompt = `Tu es un expert culinaire français. Analyse ces données extraites d'une vidéo de recette et génère une recette complète et structurée.

TRANSCRIPTION AUDIO (Whisper):
${data.transcript}

ANALYSE VISUELLE (GPT-4 Vision):
${JSON.stringify(data.visualAnalysis, null, 2)}

MÉTADONNÉES (${data.platform}):
${JSON.stringify(data.metadata, null, 2)}

INSTRUCTIONS:
1. Génère une recette COMPLÈTE et PRÉCISE en français
2. Déduis les quantités exactes ou approximatives
3. Ordonne les étapes de manière logique
4. Ajoute les temps de préparation et cuisson
5. Calcule les valeurs nutritionnelles approximatives
6. Identifie la cuisine d'origine et le type de plat
7. Suggère des occasions appropriées

Format JSON strict avec tous les champs de l'interface EnhancedRecipeResult.`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "Tu es un chef expert qui crée des recettes détaillées et précises à partir de vidéos."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000
    });
    
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      recipe: result.recipe,
      confidence: this.calculateConfidence(result),
      extractionDetails: {
        audioAnalysis: { transcript: data.transcript },
        visualAnalysis: data.visualAnalysis,
        textAnalysis: data.metadata
      }
    };
  }
  
  /**
   * Calculer le score de confiance
   */
  private calculateConfidence(recipe: any): number {
    let score = 0;
    const weights = {
      name: 0.15,
      ingredients: 0.25,
      instructions: 0.25,
      times: 0.15,
      nutrition: 0.10,
      metadata: 0.10
    };
    
    if (recipe.recipe?.name) score += weights.name;
    if (recipe.recipe?.ingredients?.length > 3) score += weights.ingredients;
    if (recipe.recipe?.instructions?.length > 3) score += weights.instructions;
    if (recipe.recipe?.metadata?.prepTime) score += weights.times;
    if (recipe.recipe?.nutrition) score += weights.nutrition;
    if (recipe.recipe?.metadata?.cuisine) score += weights.metadata;
    
    return Math.min(score, 1);
  }
}

// Export singleton
export const videoRecipeExtractor = new VideoRecipeExtractor();
3. 🔄 Mise à jour du Parser Social Media
Modifier src/services/socialMediaParser/socialMediaRecipeParser.ts :

typescript
// Ajouter l'import du nouveau service
import { videoRecipeExtractor } from '@/services/videoRecipeExtractor/videoRecipeExtractor';

export class SocialMediaRecipeParser {
  // ... code existant ...
  
  /**
   * Parse recipe from social media URL avec extraction vidéo avancée
   */
  async parseFromUrl(url: string, options?: {
    useVideoExtraction?: boolean;
    extractFrames?: boolean;
    transcribe?: boolean;
  }): Promise<ParsedRecipeResult> {
    try {
      // Validation et détection de plateforme existantes
      if (!isValidUrl(url)) {
        return { success: false, error: 'URL invalide' };
      }

      const platform = this.detectPlatform(url);
      if (!platform) {
        return { success: false, error: 'Plateforme non supportée' };
      }

      // NOUVEAU : Utiliser l'extraction vidéo avancée si disponible
      if (options?.useVideoExtraction && this.isVideoContent(url, platform.name)) {
        try {
          console.log('🎬 Using advanced video extraction...');
          const videoResult = await videoRecipeExtractor.extractRecipeFromVideo(
            url, 
            platform.name
          );
          
          return {
            success: true,
            recipe: this.mapEnhancedRecipeToStandard(videoResult.recipe),
            platform: platform.name,
            confidence: videoResult.confidence,
            extractionMethod: 'video-ai-enhanced'
          };
        } catch (videoError) {
          console.error('Video extraction failed, falling back:', videoError);
          // Continuer avec la méthode standard en cas d'échec
        }
      }

      // Méthode existante comme fallback
      let content: any;
      switch (platform.name) {
        case 'instagram':
          content = await this.parseInstagramEnhanced(url);
          break;
        case 'tiktok':
          content = await this.parseTikTokEnhanced(url);
          break;
        case 'youtube':
          content = await this.parseYouTubeEnhanced(url);
          break;
        default:
          content = await this.parseGeneric(url);
      }

      // ... reste du code existant ...
    } catch (error) {
      // ... gestion d'erreur existante ...
    }
  }
  
  /**
   * Vérifier si l'URL contient une vidéo
   */
  private isVideoContent(url: string, platform: string): boolean {
    const videoPatterns = {
      instagram: /\/(reel|tv)\//,
      tiktok: /\/video\//,
      youtube: /\/(watch|shorts)\//,
      pinterest: /\/pin\/.*video/
    };
    
    return videoPatterns[platform]?.test(url) || false;
  }
  
  /**
   * Parser Instagram amélioré avec support Reels
   */
  private async parseInstagramEnhanced(url: string): Promise<any> {
    try {
      // Utiliser l'API Instagram si disponible
      const response = await fetch('/api/social/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // Fallback sur oEmbed
      const oEmbedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${process.env.NEXT_PUBLIC_FACEBOOK_APP_TOKEN}`;
      const oEmbedResponse = await fetch(oEmbedUrl);
      
      if (oEmbedResponse.ok) {
        const data = await oEmbedResponse.json();
        return {
          caption: data.title,
          author: data.author_name,
          thumbnailUrl: data.thumbnail_url,
          mediaType: data.type
        };
      }
      
    } catch (error) {
      console.error('Instagram enhanced parsing error:', error);
    }
    
    // Fallback sur méthode existante
    return this.parseInstagram(url);
  }
}
4. 🎮 Nouvelle API Route pour l'Extraction Avancée
Créer src/app/api/extract-recipe-advanced/route.ts :

typescript
import { NextRequest, NextResponse } from 'next/server';
import { videoRecipeExtractor } from '@/services/videoRecipeExtractor/videoRecipeExtractor';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip ?? 'anonymous';
    await limiter.check(5, identifier); // 5 requêtes par minute
    
    const { url, options } = await request.json();
    
    // Validation
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Détecter la plateforme
    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported platform' },
        { status: 400 }
      );
    }
    
    // Extraction avancée
    const result = await videoRecipeExtractor.extractRecipeFromVideo(
      url,
      platform
    );
    
    // Log pour analytics
    await logExtraction({
      url,
      platform,
      success: true,
      confidence: result.confidence,
      userId: request.headers.get('x-user-id')
    });
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Recipe extraction error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to extract recipe',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

function detectPlatform(url: string): string | null {
  const platforms = {
    instagram: /instagram\.com/,
    tiktok: /tiktok\.com/,
    youtube: /youtube\.com|youtu\.be/,
    pinterest: /pinterest\.com/
  };
  
  for (const [platform, pattern] of Object.entries(platforms)) {
    if (pattern.test(url)) return platform;
  }
  
  return null;
}
5. 🎨 Mise à jour du Composant UI
Modifier src/components/scanner/SocialMediaInput.tsx :

typescript
import { videoRecipeExtractor } from '@/services/videoRecipeExtractor/videoRecipeExtractor';

export function SocialMediaInput({ onRecipeExtracted, settings }: SocialMediaInputProps) {
  const [extractionMethod, setExtractionMethod] = useState<'basic' | 'advanced'>('advanced');
  const [extractionProgress, setExtractionProgress] = useState<{
    step: string;
    progress: number;
  }>({ step: '', progress: 0 });
  
  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    
    try {
      const platform = detectPlatform(url);
      
      if (extractionMethod === 'advanced' && ['youtube', 'tiktok', 'instagram'].includes(platform)) {
        // Extraction avancée avec vidéo
        setExtractionProgress({ step: 'Téléchargement de la vidéo...', progress: 10 });
        
        const response = await fetch('/api/extract-recipe-advanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url,
            options: {
              transcribe: true,
              extractFrames: true,
              enhanceWithAI: true
            }
          })
        });
        
        if (!response.ok) throw new Error('Extraction failed');
        
        const result = await response.json();
        
        // Afficher les détails d'extraction
        setExtractedRecipe({
          ...result.recipe,
          extractionDetails: result.extractionDetails,
          confidence: result.confidence
        });
        
        onRecipeExtracted(result.recipe);
        
      } else {
        // Extraction basique existante
        const result = await socialMediaParser.parseFromUrl(url);
        
        if (!result.success) {
          throw new Error(result.error || 'Extraction échouée');
        }
        
        setExtractedRecipe(result.recipe);
        onRecipeExtracted(result.recipe);
      }
      
    } catch (err) {
      setError(err.message);
      toast.error('Impossible d\'extraire la recette');
    } finally {
      setIsExtracting(false);
      setExtractionProgress({ step: '', progress: 0 });
    }
  };
  
  return (
    <Card className="w-full">
      {/* Toggle pour méthode d'extraction */}
      <div className="flex items-center justify-between mb-4">
        <Label>Méthode d'extraction</Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={extractionMethod === 'basic' ? 'default' : 'outline'}
            onClick={() => setExtractionMethod('basic')}
          >
            Basique
          </Button>
          <Button
            size="sm"
            variant={extractionMethod === 'advanced' ? 'default' : 'outline'}
            onClick={() => setExtractionMethod('advanced')}
          >
            <Sparkles className="mr-1 h-4 w-4" />
            IA Avancée
          </Button>
        </div>
      </div>
      
      {/* Barre de progression pour extraction avancée */}
      {extractionProgress.progress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>{extractionProgress.step}</span>
            <span>{extractionProgress.progress}%</span>
          </div>
          <Progress value={extractionProgress.progress} />
        </div>
      )}
      
      {/* Aperçu des détails d'extraction */}
      {extractedRecipe?.extractionDetails && (
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="details">
            <AccordionTrigger>
              Détails de l'extraction (Confiance: {Math.round(extractedRecipe.confidence * 100)}%)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Transcription audio :</strong>
                  <p className="text-muted-foreground line-clamp-3">
                    {extractedRecipe.extractionDetails.audioAnalysis?.transcript}
                  </p>
                </div>
                <div>
                  <strong>Frames analysées :</strong> 
                  {extractedRecipe.extractionDetails.visualAnalysis?.length || 0}
                </div>
                <div>
                  <strong>Ingrédients détectés :</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {extractedRecipe.ingredients?.map((ing, i) => (
                      <Badge key={i} variant="secondary">
                        {ing.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </Card>
  );
}
6. 🔐 Variables d'Environnement à Ajouter
bash
# .env.local

# OpenAI pour Whisper + GPT-4 Vision
NEXT_PUBLIC_OPENAI_API_KEY=sk-...

# APIs Social Media (optionnel mais recommandé)
FACEBOOK_APP_TOKEN=...
INSTAGRAM_BASIC_DISPLAY_TOKEN=...
YOUTUBE_API_KEY=...
TIKTOK_API_KEY=...

# Limites
MAX_VIDEO_SIZE_MB=100
MAX_EXTRACTION_TIME_SECONDS=120
ENABLE_VIDEO_EXTRACTION=true
7. 📊 Monitoring et Analytics
Créer src/lib/analytics/extraction-analytics.ts :

typescript
export async function trackExtraction(data: {
  url: string;
  platform: string;
  method: 'basic' | 'advanced';
  success: boolean;
  confidence?: number;
  duration: number;
  userId?: string;
}) {
  // Vercel Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'recipe_extraction', {
      event_category: 'engagement',
      event_label: data.platform,
      value: Math.round(data.confidence * 100),
      custom_map: {
        dimension1: data.method,
        dimension2: data.platform,
        metric1: data.duration,
        metric2: data.confidence
      }
    });
  }
  
  // Supabase logging
  await supabase.from('extraction_logs').insert({
    ...data,
    created_at: new Date().toISOString()
  });
}
🚀 Plan de Déploiement
Phase 1 : Test Local (1-2 jours)
Installer les dépendances
Configurer les API keys
Tester avec des URLs de test
Vérifier la qualité d'extraction
Phase 2 : Optimisation (3-4 jours)
Cache des extractions
Queue system pour vidéos longues
Fallback strategies
Compression des données
Phase 3 : Production (1 semaine)
Rate limiting robuste
Monitoring et alerting
Documentation utilisateur
A/B testing basic vs advanced
💰 Estimation des Coûts
Service	Coût/extraction	Volume mensuel	Coût mensuel
Whisper API	$0.006/min	1000 vidéos (3min)	$18
GPT-4 Vision	$0.03/image	10 images/vidéo	$300
GPT-4 Synthesis	$0.02/requête	1000 requêtes	$20
TOTAL	~$0.35/vidéo	1000 vidéos	$338
✅ Checklist de Validation
 Test YouTube : Recette complète extraite
 Test TikTok : Transcription + visuel OK
 Test Instagram Reel : Métadonnées + contenu
 Performance : < 30s pour vidéo 3min
 Précision : > 85% des ingrédients corrects
 UX : Feedback temps réel
 Fallback : Fonctionne si API down
 Coûts : Tracking et limites en place
Veux-tu que je t'aide à implémenter une partie spécifique ou que je crée des tests pour valider le système ?