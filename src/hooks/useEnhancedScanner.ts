import { useState, useCallback, useEffect } from 'react';
import { scannerService } from '@/services/scanning/enhancedScannerService';
import { useToast } from '@/hooks/use-toast';

interface UseEnhancedScannerReturn {
  isSupported: boolean;
  capabilities: any;
  isScanning: boolean;
  scanResult: any | null;
  productData: any | null;
  error: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  resetScanner: () => void;
  checkPermissions: () => Promise<string>;
}

export const useEnhancedScanner = (): UseEnhancedScannerReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [capabilities, setCapabilities] = useState<any>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check capabilities on mount
  useEffect(() => {
    checkCapabilities();
  }, []);

  const checkCapabilities = async () => {
    try {
      const caps = await scannerService.getCapabilities();
      setCapabilities(caps);
      setIsSupported(caps.hasCamera);
      
      if (!caps.hasCamera) {
        console.warn('📷 No camera detected on this device');
      }
    } catch (error) {
      console.error('Failed to check scanner capabilities:', error);
      setIsSupported(false);
    }
  };

  const checkPermissions = useCallback(async (): Promise<string> => {
    try {
      const result = await navigator.permissions.query({ 
        name: 'camera' as any 
      });
      
      if (result.state === 'prompt') {
        // Request permission
        await navigator.mediaDevices.getUserMedia({ video: true });
        return 'granted';
      }
      
      return result.state;
    } catch (error) {
      console.error('Permission check failed:', error);
      return 'denied';
    }
  }, []);

  const startScanning = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Scanner non supporté",
        description: "Aucune caméra détectée sur cet appareil",
        variant: "destructive"
      });
      return;
    }

    try {
      setError(null);
      setScanResult(null);
      setProductData(null);
      setIsScanning(true);

      // Check permissions first
      const permission = await checkPermissions();
      if (permission === 'denied') {
        throw new Error('Permission caméra refusée. Activez-la dans les paramètres.');
      }

      // Initialize camera
      const video = await scannerService.initializeCamera();
      
      // Start scanning
      const result = await scannerService.scanBarcode(video);
      setScanResult(result);
      
      // Fetch product data
      if (result.barcode) {
        const data = await scannerService.fetchProductData(result.barcode);
        setProductData(data);
        
        // Show success feedback
        toast({
          title: "Produit scanné",
          description: `${data.name} - ${data.source}`,
        });
      }
      
    } catch (error: any) {
      console.error('Scanning failed:', error);
      setError(error.message || 'Erreur lors du scan');
      
      toast({
        title: "Erreur de scan",
        description: error.message || 'Impossible de scanner le produit',
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  }, [isSupported, checkPermissions, toast]);

  const stopScanning = useCallback(() => {
    scannerService.stopScanning();
    setIsScanning(false);
  }, []);

  const resetScanner = useCallback(() => {
    stopScanning();
    setScanResult(null);
    setProductData(null);
    setError(null);
  }, [stopScanning]);

  return {
    isSupported,
    capabilities,
    isScanning,
    scanResult,
    productData,
    error,
    startScanning,
    stopScanning,
    resetScanner,
    checkPermissions
  };
};