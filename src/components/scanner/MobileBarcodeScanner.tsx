import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { scannerService } from '@/services/scanning/enhancedScannerService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  X,
  Camera,
  Flashlight,
  RotateCw,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Barcode,
  Info
} from 'lucide-react';

interface MobileBarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (product: any) => void;
  mode?: 'inventory' | 'shopping';
}

export const MobileBarcodeScanner: React.FC<MobileBarcodeScannerProps> = ({
  open,
  onClose,
  onScanSuccess,
  mode = 'inventory'
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  const startScanning = async () => {
    try {
      setError(null);
      setIsLoading(true);
      setScanResult(null);
      setProductData(null);

      // Initialize camera
      const video = await scannerService.initializeCamera({
        video: {
          facingMode: { exact: cameraFacing }
        }
      });

      videoRef.current = video;
      
      if (videoContainerRef.current) {
        videoContainerRef.current.innerHTML = '';
        videoContainerRef.current.appendChild(video);
      }

      setIsLoading(false);
      setIsScanning(true);

      // Start continuous scanning
      continuousScan();
    } catch (error: any) {
      console.error('Failed to start scanning:', error);
      setError(error.message || 'Impossible de démarrer la caméra');
      setIsLoading(false);
      
      toast({
        title: "Erreur caméra",
        description: error.message || 'Impossible de démarrer la caméra',
        variant: "destructive"
      });
    }
  };

  const continuousScan = async () => {
    if (!videoRef.current) return;

    try {
      const result = await scannerService.scanBarcode(videoRef.current);
      
      if (result) {
        // Vibration feedback si disponible
        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }

        setScanResult(result);
        setIsScanning(false);
        
        // Fetch product data
        fetchProductData(result.barcode);
      }
    } catch (error) {
      // Continue scanning on error
      if (isScanning) {
        setTimeout(continuousScan, 1000);
      }
    }
  };

  const fetchProductData = async (barcode: string) => {
    setIsLoading(true);
    
    try {
      const data = await scannerService.fetchProductData(barcode);
      setProductData(data);
      
      toast({
        title: "Produit trouvé",
        description: `${data.name} - ${data.brand || 'Marque inconnue'}`
      });
    } catch (error) {
      console.error('Failed to fetch product data:', error);
      setProductData({
        name: `Produit ${barcode}`,
        category: 'Autres',
        unit: 'unité(s)',
        source: 'manual',
        confidence: 0.3
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    scannerService.stopScanning();
    
    if (videoContainerRef.current) {
      videoContainerRef.current.innerHTML = '';
    }
    
    videoRef.current = null;
  };

  const handleRetry = () => {
    setScanResult(null);
    setProductData(null);
    setError(null);
    startScanning();
  };

  const handleConfirm = () => {
    if (productData) {
      onScanSuccess({
        ...productData,
        barcode: scanResult?.barcode
      });
      onClose();
    }
  };

  const toggleFlash = async () => {
    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    
    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !flashEnabled } as any]
        });
        setFlashEnabled(!flashEnabled);
      } else {
        toast({
          title: "Flash non disponible",
          description: "Le flash n'est pas supporté sur cet appareil",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Flash toggle failed:', error);
    }
  };

  const switchCamera = async () => {
    stopScanning();
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    setTimeout(startScanning, 100);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-lg font-semibold flex items-center gap-2">
              <Barcode className="w-5 h-5" />
              Scanner de produits
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Video Container */}
        <div 
          ref={videoContainerRef}
          className="absolute inset-0"
        />

        {/* Scan Overlay */}
        {isScanning && !scanResult && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scan Frame */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
              <div className="relative w-full h-full">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                
                {/* Scan Line Animation */}
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"
                  animate={{
                    top: ['0%', '100%', '0%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-32 left-0 right-0 text-center">
              <p className="text-white text-sm bg-black/50 rounded-full px-4 py-2 inline-block">
                Alignez le code-barres dans le cadre
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {!scanResult && !error && (
            <div className="flex justify-center gap-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleFlash}
                className="rounded-full w-12 h-12"
                disabled={!isScanning}
              >
                <Flashlight className={cn("w-5 h-5", flashEnabled && "text-yellow-400")} />
              </Button>
              
              <Button
                variant="secondary"
                size="icon"
                onClick={switchCamera}
                className="rounded-full w-12 h-12"
                disabled={!isScanning}
              >
                <RotateCw className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card className="bg-white/95 backdrop-blur">
              <CardContent className="p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {scanResult ? 'Recherche du produit...' : 'Initialisation de la caméra...'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="bg-white/95 backdrop-blur border-destructive">
              <CardContent className="p-6">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
                <h3 className="font-semibold text-center mb-2">Erreur</h3>
                <p className="text-sm text-center text-muted-foreground mb-4">{error}</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="flex-1"
                  >
                    Fermer
                  </Button>
                  <Button 
                    onClick={handleRetry}
                    className="flex-1"
                  >
                    Réessayer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scan Result */}
          {scanResult && productData && !isLoading && (
            <Card className="bg-white/95 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  {productData.imageUrl ? (
                    <img 
                      src={productData.imageUrl} 
                      alt={productData.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-semibold">{productData.name}</h3>
                    {productData.brand && (
                      <p className="text-sm text-muted-foreground">{productData.brand}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{productData.category}</Badge>
                      <Badge 
                        variant={productData.confidence > 0.7 ? "default" : "secondary"}
                      >
                        {Math.round(productData.confidence * 100)}% fiable
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Code-barres :</span>
                    <span className="font-mono">{scanResult.barcode}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Format :</span>
                    <span>{scanResult.format}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Source :</span>
                    <span className="capitalize">{productData.source}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleRetry}
                    className="flex-1"
                  >
                    Scanner autre
                  </Button>
                  <Button 
                    onClick={handleConfirm}
                    className="flex-1 gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {mode === 'inventory' ? 'Ajouter' : 'Ajouter aux courses'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tips */}
        {isScanning && !scanResult && (
          <div className="absolute top-20 left-4 right-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/60 backdrop-blur rounded-lg p-3"
            >
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="text-xs text-white/80">
                  <p>Conseils pour un scan réussi :</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Tenez l'appareil stable</li>
                    <li>Assurez-vous d'un bon éclairage</li>
                    <li>Placez le code-barres au centre</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};