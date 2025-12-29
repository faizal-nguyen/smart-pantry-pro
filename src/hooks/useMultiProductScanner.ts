import { useState, useCallback, useRef, useEffect } from 'react';
import { useCamera } from './useCamera';
import { toast } from 'sonner';

interface DetectedProduct {
  id: string;
  name: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  category?: string;
  brand?: string;
  barcode?: string;
}

interface MultiProductScannerState {
  isScanning: boolean;
  detectedProducts: DetectedProduct[];
  capturedProducts: DetectedProduct[];
  error: string | null;
  isProcessing: boolean;
}

export function useMultiProductScanner() {
  const [state, setState] = useState<MultiProductScannerState>({
    isScanning: false,
    detectedProducts: [],
    capturedProducts: [],
    error: null,
    isProcessing: false
  });

  const {
    videoRef,
    canvasRef,
    isStreaming,
    error: cameraError,
    startCamera,
    stopCamera,
    takePhoto
  } = useCamera();

  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modelLoadedRef = useRef(false);

  // Simulation du chargement du modèle de vision
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Simulation du chargement du modèle
        await new Promise(resolve => setTimeout(resolve, 1000));
        modelLoadedRef.current = true;
      } catch (error) {
        console.error('Erreur lors du chargement du modèle:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Impossible de charger le modèle de vision' 
        }));
      }
    };

    loadModel();
  }, []);

  // Fonction de détection des produits (simulation)
  const detectProducts = useCallback(async (): Promise<DetectedProduct[]> => {
    if (!videoRef.current || !canvasRef.current) return [];

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return [];

    // Capture de l'image actuelle
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Simulation de la détection avec des produits fictifs
    const mockProducts: DetectedProduct[] = [
      {
        id: `product-${Date.now()}-1`,
        name: 'Tomates cerises',
        confidence: 0.92,
        boundingBox: {
          x: canvas.width * 0.2,
          y: canvas.height * 0.3,
          width: canvas.width * 0.25,
          height: canvas.height * 0.2
        },
        category: 'Légumes',
        brand: 'Bio'
      },
      {
        id: `product-${Date.now()}-2`,
        name: 'Bananes',
        confidence: 0.88,
        boundingBox: {
          x: canvas.width * 0.5,
          y: canvas.height * 0.4,
          width: canvas.width * 0.3,
          height: canvas.height * 0.25
        },
        category: 'Fruits',
        brand: 'Chiquita'
      }
    ];

    // Simulation d'un délai de traitement
    await new Promise(resolve => setTimeout(resolve, 300));

    return mockProducts;
  }, [videoRef, canvasRef]);

  // Démarrer le scan
  const startScanning = useCallback(async (): Promise<DetectedProduct[] | null> => {
    if (!modelLoadedRef.current) {
      toast.error('Le modèle de vision est encore en chargement');
      return null;
    }

    setState(prev => ({ 
      ...prev, 
      isScanning: true, 
      error: null,
      detectedProducts: [],
      capturedProducts: []
    }));

    try {
      await startCamera();

      // Démarrer la détection en temps réel
      detectionIntervalRef.current = setInterval(async () => {
        if (state.isProcessing) return;

        setState(prev => ({ ...prev, isProcessing: true }));
        
        try {
          const products = await detectProducts();
          setState(prev => ({ 
            ...prev, 
            detectedProducts: products,
            isProcessing: false
          }));
        } catch (error) {
          console.error('Erreur de détection:', error);
          setState(prev => ({ ...prev, isProcessing: false }));
        }
      }, 1000); // Détection toutes les secondes

      // Retourner une promesse qui se résout après capture
      return new Promise((resolve) => {
        // Simuler une capture automatique après 5 secondes
        setTimeout(() => {
          const captured = state.detectedProducts;
          setState(prev => ({ 
            ...prev, 
            capturedProducts: captured,
            isScanning: false
          }));
          stopScanning();
          resolve(captured);
        }, 5000);
      });

    } catch (error) {
      console.error('Erreur lors du démarrage du scan:', error);
      setState(prev => ({ 
        ...prev, 
        isScanning: false,
        error: 'Impossible de démarrer la caméra'
      }));
      toast.error('Erreur lors du démarrage du scanner');
      return null;
    }
  }, [startCamera, detectProducts, state.detectedProducts, state.isProcessing]);

  // Arrêter le scan
  const stopScanning = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    stopCamera();
    
    setState(prev => ({ 
      ...prev, 
      isScanning: false,
      isProcessing: false
    }));
  }, [stopCamera]);

  // Capturer les produits détectés
  const captureProducts = useCallback(() => {
    const { detectedProducts } = state;
    
    if (detectedProducts.length === 0) {
      toast.error('Aucun produit détecté');
      return [];
    }

    setState(prev => ({ 
      ...prev, 
      capturedProducts: [...prev.capturedProducts, ...detectedProducts]
    }));

    toast.success(`${detectedProducts.length} produits capturés`);
    
    // Vibration feedback sur mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    return detectedProducts;
  }, [state.detectedProducts]);

  // Réinitialiser
  const reset = useCallback(() => {
    setState({
      isScanning: false,
      detectedProducts: [],
      capturedProducts: [],
      error: null,
      isProcessing: false
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      stopCamera();
    };
  }, [stopCamera]);

  return {
    // State
    isScanning: state.isScanning,
    detectedProducts: state.detectedProducts,
    capturedProducts: state.capturedProducts,
    error: state.error || cameraError,
    isProcessing: state.isProcessing,
    isStreaming,
    
    // Refs
    videoRef,
    canvasRef,
    
    // Actions
    startScanning,
    stopScanning,
    captureProducts,
    reset
  };
}