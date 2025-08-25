import { v2 as cloudinary } from 'cloudinary';
import OpenAI from 'openai';

export interface FrameExtractionResult {
  frames: Array<{
    url: string;
    timestamp: number;
    description?: string;
    ingredients?: string[];
    actions?: string[];
  }>;
  analysis: string;
  confidence: number;
  processingTime: number;
}

export interface FrameExtractionOptions {
  count?: number;
  quality?: 'low' | 'medium' | 'high';
  format?: 'jpg' | 'png' | 'webp';
  width?: number;
  height?: number;
  analysis?: boolean;
}

export class FrameExtractor {
  private openai: OpenAI;
  private cloudinaryConfigured: boolean = false;

  constructor() {
    // Configuration Cloudinary
    this.configureCloudinary();
    
    // Configuration OpenAI pour l'analyse des frames
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private configureCloudinary(): void {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      
      this.cloudinaryConfigured = !!(
        process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_API_KEY && 
        process.env.CLOUDINARY_API_SECRET
      );
    } catch (error) {
      console.warn('Cloudinary configuration failed:', error);
      this.cloudinaryConfigured = false;
    }
  }

  async extractKeyFrames(
    videoUrl: string,
    options: FrameExtractionOptions = {}
  ): Promise<FrameExtractionResult> {
    const startTime = Date.now();
    const {
      count = 5,
      quality = 'medium',
      format = 'jpg',
      width = 640,
      height = 480,
      analysis = true
    } = options;

    try {
      if (!this.cloudinaryConfigured) {
        return this.fallbackFrameExtraction();
      }

      // Extraction de frames avec Cloudinary (sans télécharger la vidéo)
      const frames = await this.extractFramesWithCloudinary(
        videoUrl, 
        count, 
        quality, 
        format, 
        width, 
        height
      );

      let analysisResult = '';
      let confidence = 0.7;

      // Analyse des frames avec GPT-4 Vision si activée
      if (analysis && frames.length > 0) {
        const visionAnalysis = await this.analyzeFramesWithGPT4Vision(frames);
        analysisResult = visionAnalysis.analysis;
        confidence = visionAnalysis.confidence;
        
        // Enrichir les frames avec les données d'analyse
        frames.forEach((frame, index) => {
          if (visionAnalysis.frameDetails[index]) {
            frame.description = visionAnalysis.frameDetails[index].description;
            frame.ingredients = visionAnalysis.frameDetails[index].ingredients;
            frame.actions = visionAnalysis.frameDetails[index].actions;
          }
        });
      }

      const processingTime = Date.now() - startTime;
      console.log(`Frame extraction completed in ${processingTime}ms`);

      return {
        frames,
        analysis: analysisResult,
        confidence,
        processingTime
      };

    } catch (error: any) {
      console.error('Frame extraction failed:', error);
      
      // Fallback en cas d'erreur
      return this.fallbackFrameExtraction();
    }
  }

  private async extractFramesWithCloudinary(
    videoUrl: string,
    count: number,
    quality: string,
    format: string,
    width: number,
    height: number
  ): Promise<Array<{ url: string; timestamp: number }>> {
    const frames: Array<{ url: string; timestamp: number }> = [];

    try {
      // Upload de la vidéo sur Cloudinary (si nécessaire)
      const uploadResult = await cloudinary.uploader.upload(videoUrl, {
        resource_type: 'video',
        public_id: `temp_video_${Date.now()}`,
      });

      // Obtenir la durée de la vidéo
      const videoDuration = uploadResult.duration || 60; // Fallback 1 minute

      // Calculer les timestamps pour les frames
      const timestamps = this.calculateKeyFrameTimestamps(videoDuration, count);

      // Générer les URLs des frames avec Cloudinary
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        
        const frameUrl = cloudinary.url(uploadResult.public_id, {
          resource_type: 'video',
          format: format,
          width: width,
          height: height,
          crop: 'fill',
          quality: this.getCloudinaryQuality(quality),
          start_offset: `${timestamp}s`,
          flags: 'progressive',
        });

        frames.push({
          url: frameUrl,
          timestamp: timestamp
        });
      }

      // Nettoyer la vidéo temporaire
      setTimeout(() => {
        cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: 'video' })
          .catch(err => console.warn('Failed to cleanup temp video:', err));
      }, 300000); // 5 minutes

      return frames;

    } catch (error: any) {
      console.error('Cloudinary frame extraction failed:', error);
      throw error;
    }
  }

  private calculateKeyFrameTimestamps(duration: number, count: number): number[] {
    const timestamps: number[] = [];
    
    if (count === 1) {
      // Frame du milieu
      timestamps.push(Math.floor(duration / 2));
    } else {
      // Répartition intelligente des frames
      const step = duration / (count + 1);
      
      for (let i = 1; i <= count; i++) {
        const timestamp = Math.floor(step * i);
        timestamps.push(Math.min(timestamp, duration - 1));
      }
    }

    return timestamps;
  }

  private getCloudinaryQuality(quality: string): string {
    switch (quality) {
      case 'low': return 'auto:low';
      case 'high': return 'auto:good';
      default: return 'auto:eco';
    }
  }

  private async analyzeFramesWithGPT4Vision(
    frames: Array<{ url: string; timestamp: number }>
  ): Promise<{
    analysis: string;
    confidence: number;
    frameDetails: Array<{
      description: string;
      ingredients: string[];
      actions: string[];
    }>;
  }> {
    try {
      // Préparer les images pour GPT-4 Vision
      const imageInputs = frames.slice(0, 4).map(frame => ({
        type: 'image_url' as const,
        image_url: {
          url: frame.url,
          detail: 'low' // Optimisation pour la vitesse
        }
      }));

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze these cooking video frames and extract recipe information. For each frame, identify:
1. Ingredients visible
2. Cooking actions/techniques
3. Brief description of what's happening

Provide a summary analysis of the overall recipe process.

Return JSON format:
{
  "analysis": "overall recipe analysis",
  "confidence": 0.8,
  "frameDetails": [
    {
      "description": "what's happening in this frame",
      "ingredients": ["ingredient1", "ingredient2"],
      "actions": ["action1", "action2"]
    }
  ]
}`
              },
              ...imageInputs
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        analysis: result.analysis || 'Frame analysis completed',
        confidence: result.confidence || 0.8,
        frameDetails: result.frameDetails || []
      };

    } catch (error: any) {
      console.error('GPT-4 Vision analysis failed:', error);
      
      return {
        analysis: 'Visual analysis not available',
        confidence: 0.5,
        frameDetails: frames.map(() => ({
          description: 'Frame analysis not available',
          ingredients: [],
          actions: []
        }))
      };
    }
  }

  private fallbackFrameExtraction(): FrameExtractionResult {
    return {
      frames: [],
      analysis: 'Frame extraction not available. Using audio transcription and metadata.',
      confidence: 0.3,
      processingTime: 100
    };
  }

  // Méthodes utilitaires

  async testCloudinaryConnection(): Promise<boolean> {
    try {
      if (!this.cloudinaryConfigured) return false;
      
      await cloudinary.api.ping();
      return true;
    } catch (error) {
      console.error('Cloudinary connection test failed:', error);
      return false;
    }
  }

  // Extraction optimisée pour différents types de vidéos
  getOptimizedExtractionOptions(platform: string, videoDuration: number): FrameExtractionOptions {
    const baseOptions: FrameExtractionOptions = {
      format: 'jpg',
      width: 640,
      height: 480,
      analysis: true
    };

    // Ajustement selon la plateforme
    switch (platform) {
      case 'tiktok':
        return {
          ...baseOptions,
          count: Math.min(3, Math.floor(videoDuration / 10)), // 1 frame toutes les 10 secondes max
          quality: 'medium'
        };
      
      case 'youtube':
        return {
          ...baseOptions,
          count: Math.min(5, Math.floor(videoDuration / 30)), // 1 frame toutes les 30 secondes max
          quality: 'high',
          width: 854,
          height: 480
        };
      
      case 'instagram':
        return {
          ...baseOptions,
          count: Math.min(4, Math.floor(videoDuration / 15)), // 1 frame toutes les 15 secondes max
          quality: 'medium'
        };
      
      default:
        return {
          ...baseOptions,
          count: Math.min(5, Math.floor(videoDuration / 20)),
          quality: 'medium'
        };
    }
  }

  // Nettoyage des ressources temporaires
  async cleanup(): Promise<void> {
    try {
      // Nettoyer les ressources Cloudinary temporaires de plus de 1 heure
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      
      const resources = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'video',
        prefix: 'temp_video_',
        created_at: { $lt: oneHourAgo }
      });

      for (const resource of resources.resources) {
        await cloudinary.uploader.destroy(resource.public_id, { resource_type: 'video' });
      }

      console.log(`Cleaned up ${resources.resources.length} temporary video resources`);
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
}