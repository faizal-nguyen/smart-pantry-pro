import { useState, useCallback, useRef } from 'react';

export interface FastVideoRecipeState {
  loading: boolean;
  progress: number;
  status: 'idle' | 'extracting' | 'transcribing' | 'analyzing' | 'synthesizing' | 'completed' | 'error';
  result: VideoRecipe | null;
  error: string | null;
  processingTime?: number;
}

export interface VideoRecipe {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit?: string;
  }>;
  instructions: Array<{
    step: number;
    description: string;
    duration?: string;
  }>;
  metadata: {
    duration: string;
    platform: string;
    processingTime: number;
    confidence: number;
    extractionMethod: 'audio_transcription' | 'frame_analysis' | 'metadata_fallback';
  };
  nutritionalInfo?: {
    servings?: number;
    cookingTime?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    calories?: number;
  };
}

export interface UseFastVideoRecipeOptions {
  onProgress?: (progress: number, status: string) => void;
  onSuccess?: (result: VideoRecipe) => void;
  onError?: (error: string) => void;
  timeout?: number;
}

export interface UseFastVideoRecipeReturn {
  state: FastVideoRecipeState;
  parseVideo: (videoUrl: string, platform?: string) => Promise<VideoRecipe | null>;
  cancel: () => void;
  reset: () => void;
  isSupported: (url: string) => boolean;
  getSupportedPlatforms: () => string[];
  getEstimatedTime: (platform: string) => number;
}

export const useFastVideoRecipe = (
  options: UseFastVideoRecipeOptions = {}
): UseFastVideoRecipeReturn => {
  const {
    onProgress,
    onSuccess,
    onError,
    timeout = 45000 // 45 seconds default
  } = options;

  const [state, setState] = useState<FastVideoRecipeState>({
    loading: false,
    progress: 0,
    status: 'idle',
    result: null,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback((updates: Partial<FastVideoRecipeState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateProgress = useCallback((progress: number, status: FastVideoRecipeState['status']) => {
    updateState({ progress, status });
    onProgress?.(progress, status);
  }, [onProgress, updateState]);

  const parseVideo = useCallback(async (
    videoUrl: string, 
    platform?: string
  ): Promise<VideoRecipe | null> => {
    // Reset state
    updateState({
      loading: true,
      progress: 0,
      status: 'extracting',
      result: null,
      error: null
    });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    // Set timeout
    timeoutRef.current = setTimeout(() => {
      abortControllerRef.current?.abort();
      updateState({
        loading: false,
        status: 'error',
        error: 'Video parsing timed out after 45 seconds'
      });
      onError?.('Video parsing timed out after 45 seconds');
    }, timeout);

    const startTime = Date.now();

    try {
      updateProgress(5, 'extracting');

      const response = await fetch('/api/parse-video-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          platform
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Simulate progress updates during processing
      const progressInterval = setInterval(() => {
        setState(prev => {
          if (prev.progress < 90 && prev.status !== 'error' && prev.status !== 'completed') {
            const newProgress = Math.min(prev.progress + 10, 90);
            let newStatus = prev.status;
            
            if (newProgress >= 20 && newProgress < 40) newStatus = 'transcribing';
            else if (newProgress >= 40 && newProgress < 70) newStatus = 'analyzing';
            else if (newProgress >= 70) newStatus = 'synthesizing';
            
            onProgress?.(newProgress, newStatus);
            return { ...prev, progress: newProgress, status: newStatus };
          }
          return prev;
        });
      }, 1000);

      const data = await response.json();
      clearInterval(progressInterval);

      // Afficher les logs détaillés du backend si disponibles
      if (data.debug?.logs) {
        console.log('🔍 [useFastVideoRecipe] === LOGS DÉTAILLÉS DU BACKEND ===');
        data.debug.logs.forEach((log: any) => {
          console.log(`🔍 [Backend] [${log.timestamp}] ${log.message}`, log.data || '');
        });
        console.log('🔍 [useFastVideoRecipe] === FIN LOGS BACKEND ===');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to parse video');
      }

      const processingTime = Date.now() - startTime;
      const result: VideoRecipe = {
        ...data.data,
        metadata: {
          ...data.data.metadata,
          processingTime
        }
      };

      updateState({
        loading: false,
        progress: 100,
        status: 'completed',
        result,
        processingTime
      });

      onSuccess?.(result);
      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        updateState({
          loading: false,
          status: 'error',
          error: 'Video parsing was cancelled'
        });
        onError?.('Video parsing was cancelled');
      } else {
        const errorMessage = error.message || 'Unknown error occurred';
        updateState({
          loading: false,
          status: 'error',
          error: errorMessage
        });
        onError?.(errorMessage);
      }
      return null;
    } finally {
      // Cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        console.log('🧹 [useFastVideoRecipe] Timeout cleared');
      }
      abortControllerRef.current = null;
      console.log('🎯 [useFastVideoRecipe] parseVideo completed');
    }
  }, [timeout, onProgress, onSuccess, onError, updateState, updateProgress]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    updateState({
      loading: false,
      status: 'idle',
      error: 'Cancelled by user'
    });
  }, [updateState]);

  const reset = useCallback(() => {
    cancel();
    setState({
      loading: false,
      progress: 0,
      status: 'idle',
      result: null,
      error: null
    });
  }, [cancel]);

  const isSupported = useCallback((url: string): boolean => {
    const supportedPatterns = [
      /youtube\.com\/watch\?v=[\w-]+/,
      /youtu\.be\/[\w-]+/,
      /tiktok\.com\/@[\w.-]+\/video\/\d+/,
      /instagram\.com\/p\/[\w-]+/,
      /instagram\.com\/reel\/[\w-]+/,
      // Patterns génériques pour autres vidéos
      /\.(mp4|mov|avi|mkv|webm)(\?|$)/i
    ];

    return supportedPatterns.some(pattern => pattern.test(url));
  }, []);

  const getSupportedPlatforms = useCallback((): string[] => {
    return ['youtube', 'tiktok', 'instagram', 'generic'];
  }, []);

  const getEstimatedTime = useCallback((platform: string): number => {
    const estimations = {
      tiktok: 15, // 15 seconds - vidéos courtes
      instagram: 25, // 25 seconds - vidéos moyennes
      youtube: 35, // 35 seconds - vidéos plus longues
      generic: 30 // 30 seconds - générique
    };

    return estimations[platform as keyof typeof estimations] || 30;
  }, []);

  return {
    state,
    parseVideo,
    cancel,
    reset,
    isSupported,
    getSupportedPlatforms,
    getEstimatedTime
  };
};

// Hook utilitaire pour la validation des URLs
export const useVideoUrlValidation = () => {
  const validateUrl = useCallback((url: string): { 
    isValid: boolean; 
    platform?: string; 
    error?: string 
  } => {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL is required' };
    }

    const trimmedUrl = url.trim();
    
    if (!trimmedUrl.startsWith('http')) {
      return { isValid: false, error: 'URL must start with http:// or https://' };
    }

    try {
      new URL(trimmedUrl);
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }

    // Détection de la plateforme
    if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
      return { isValid: true, platform: 'youtube' };
    }
    
    if (trimmedUrl.includes('tiktok.com')) {
      return { isValid: true, platform: 'tiktok' };
    }
    
    if (trimmedUrl.includes('instagram.com')) {
      return { isValid: true, platform: 'instagram' };
    }

    // URL générique (potentiellement supportée)
    return { isValid: true, platform: 'generic' };
  }, []);

  return { validateUrl };
};

// Hook pour les statistiques de performance
export const useVideoParsingStats = () => {
  const [stats, setStats] = useState<{
    totalParsed: number;
    averageTime: number;
    successRate: number;
    platformStats: Record<string, { count: number; averageTime: number }>;
  }>({
    totalParsed: 0,
    averageTime: 0,
    successRate: 0,
    platformStats: {}
  });

  const recordParsing = useCallback((
    platform: string, 
    processingTime: number, 
    success: boolean
  ) => {
    setStats(prev => {
      const newTotalParsed = prev.totalParsed + 1;
      const newAverageTime = (prev.averageTime * prev.totalParsed + processingTime) / newTotalParsed;
      const successCount = Math.round(prev.successRate * prev.totalParsed / 100) + (success ? 1 : 0);
      const newSuccessRate = (successCount / newTotalParsed) * 100;

      const platformStats = { ...prev.platformStats };
      if (!platformStats[platform]) {
        platformStats[platform] = { count: 0, averageTime: 0 };
      }
      
      const platformCount = platformStats[platform].count + 1;
      const platformAverageTime = (
        platformStats[platform].averageTime * platformStats[platform].count + processingTime
      ) / platformCount;
      
      platformStats[platform] = {
        count: platformCount,
        averageTime: platformAverageTime
      };

      return {
        totalParsed: newTotalParsed,
        averageTime: newAverageTime,
        successRate: newSuccessRate,
        platformStats
      };
    });
  }, []);

  return { stats, recordParsing };
};