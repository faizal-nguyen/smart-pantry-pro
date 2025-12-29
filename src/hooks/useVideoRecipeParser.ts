/**
 * Hook for video recipe parsing
 * Handles video content extraction from YouTube and social media
 */

import { useState, useCallback } from 'react';
import { Recipe } from '@/types/recipe';
import { getVideoRecipeParser, VideoParseResult, VideoAnalysisOptions } from '@/services/socialMediaParser/videoRecipeParser';
import { toast } from 'sonner';

export interface UseVideoRecipeParserReturn {
  isLoading: boolean;
  error: string | null;
  progress: number;
  parseVideoUrl: (url: string, options?: VideoAnalysisOptions) => Promise<VideoParseResult>;
  parseVideoFile: (file: File, options?: VideoAnalysisOptions) => Promise<VideoParseResult>;
  resetError: () => void;
}

export function useVideoRecipeParser(): UseVideoRecipeParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const parseVideoUrl = useCallback(async (
    url: string,
    options: VideoAnalysisOptions = {}
  ): Promise<VideoParseResult> => {
    console.log('useVideoRecipeParser: Starting parse for URL:', url);
    setIsLoading(true);
    setError(null);
    setProgress(0);

    const toastId = toast.loading('Analyse de la vidéo en cours...', {
      description: 'Extraction des données vidéo'
    });

    try {
      // Validate URL
      if (!url || !url.trim()) {
        throw new Error('Veuillez fournir une URL valide');
      }

      // Update progress
      setProgress(20);
      toast.loading('Extraction des métadonnées...', { id: toastId });

      // Get parser instance
      const parser = getVideoRecipeParser();
      console.log('useVideoRecipeParser: Parser instance created');

      // Parse video with progress updates
      setProgress(40);
      toast.loading('Analyse du contenu vidéo...', { id: toastId });

      const result = await parser.parseFromVideoUrl(url, {
        extractFrames: options.extractFrames ?? true,
        transcribeAudio: options.transcribeAudio ?? true,
        useOCR: options.useOCR ?? true,
        frameInterval: options.frameInterval ?? 5
      });

      console.log('useVideoRecipeParser: Parse result:', result);
      setProgress(80);

      if (result.success && result.recipe) {
        setProgress(100);
        toast.success('Recette extraite avec succès!', {
          id: toastId,
          description: `${result.recipe.name} - Confiance: ${Math.round(result.confidence * 100)}%`
        });
        // Reset progress after a short delay to show 100%
        setTimeout(() => setProgress(0), 1000);
        return result;
      } else {
        throw new Error(result.error || 'Impossible d\'extraire la recette');
      }

    } catch (err) {
      console.error('Video parsing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'analyse vidéo';
      setError(errorMessage);
      setProgress(0); // Reset progress on error
      toast.error('Échec de l\'analyse', {
        id: toastId,
        description: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        confidence: 0
      };
    } finally {
      setIsLoading(false);
      // Don't reset progress here, let the component handle it
    }
  }, []);

  const parseVideoFile = useCallback(async (
    file: File,
    options: VideoAnalysisOptions = {}
  ): Promise<VideoParseResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    const toastId = toast.loading('Préparation du fichier vidéo...', {
      description: file.name
    });

    try {
      // Validate file
      if (!file || !file.type.startsWith('video/')) {
        throw new Error('Veuillez sélectionner un fichier vidéo valide');
      }

      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        throw new Error('Le fichier est trop volumineux (max 100MB)');
      }

      setProgress(20);
      toast.loading('Analyse du fichier vidéo...', { id: toastId });

      // Get parser instance
      const parser = getVideoRecipeParser();

      // Parse video file
      const result = await parser.parseFromVideoFile(file, options);

      if (result.success && result.recipe) {
        setProgress(100);
        toast.success('Recette extraite du fichier!', {
          id: toastId,
          description: result.recipe.name
        });
        return result;
      } else {
        throw new Error(result.error || 'Impossible d\'analyser le fichier vidéo');
      }

    } catch (err) {
      console.error('Video file parsing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'analyse';
      setError(errorMessage);
      toast.error('Échec de l\'analyse', {
        id: toastId,
        description: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        confidence: 0
      };
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }, []);

  return {
    isLoading,
    error,
    progress,
    parseVideoUrl,
    parseVideoFile,
    resetError
  };
}