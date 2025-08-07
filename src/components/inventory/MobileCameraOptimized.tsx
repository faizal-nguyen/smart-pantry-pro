import React, { useState, useEffect, useCallback } from 'react';
import { CameraCapture } from './CameraCapture';
import { useImageRecognition } from '@/hooks/useImageRecognition';
import { useInventory } from '@/hooks/useInventory';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Scan, 
  ShoppingCart, 
  Package,
  AlertTriangle,
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface MobileCameraOptimizedProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded?: (product: any) => void;
}

export function MobileCameraOptimized({ 
  isOpen, 
  onClose, 
  onProductAdded 
}: MobileCameraOptimizedProps) {
  const [mode, setMode] = useState<'camera' | 'result'>('camera');
  const [recognizedProduct, setRecognizedProduct] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  
  const { recognizeImage } = useImageRecognition();
  const { addItem } = useInventory();

  // Check battery level
  useEffect(() => {
    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          // @ts-ignore - Battery API types might not be available
          const battery = await navigator.getBattery();
          setBatteryLevel(battery.level * 100);
          
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level * 100);
          });
        } catch (error) {
          console.log('Battery API not available');
        }
      }
    };

    checkBattery();
  }, []);

  // Handle image capture
  const handleCapture = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Optimize image for mobile
      const optimizedBlob = await optimizeImageForMobile(blob);
      
      // Recognize product
      const result = await recognizeImage(optimizedBlob);
      
      if (result.success && result.product) {
        setRecognizedProduct(result.product);
        setMode('result');
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]);
        }
      } else {
        toast.error('Produit non reconnu. Essayez avec un meilleur éclairage.');
      }
    } catch (error) {
      console.error('Recognition error:', error);
      toast.error('Erreur lors de la reconnaissance');
    } finally {
      setIsProcessing(false);
    }
  }, [recognizeImage]);

  // Add to inventory
  const handleAddToInventory = async () => {
    if (!recognizedProduct) return;

    try {
      await addItem({
        product_id: recognizedProduct.id,
        quantity: 1,
        unit: recognizedProduct.unit || 'unité'
      });

      toast.success(`${recognizedProduct.name} ajouté à l'inventaire`);
      
      if (onProductAdded) {
        onProductAdded(recognizedProduct);
      }

      onClose();
    } catch (error) {
      console.error('Error adding to inventory:', error);
      toast.error('Erreur lors de l\'ajout à l\'inventaire');
    }
  };

  // Optimize image for mobile upload
  const optimizeImageForMobile = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Calculate optimal size (max 1024px)
        const maxSize = 1024;
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (optimizedBlob) => {
            resolve(optimizedBlob || blob);
          },
          'image/jpeg',
          0.8 // Quality
        );
      };

      img.src = URL.createObjectURL(blob);
    });
  };

  // Auto-enable battery mode if low battery
  const shouldUseBatteryMode = batteryLevel !== null && batteryLevel < 20;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-full h-screen md:max-w-2xl md:h-auto">
        <AnimatePresence mode="wait">
          {mode === 'camera' ? (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-full"
            >
              {/* Low battery warning */}
              {shouldUseBatteryMode && (
                <Alert className="absolute top-4 left-4 right-4 z-10 bg-yellow-500/90 border-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Batterie faible ({batteryLevel}%) - Mode économie activé
                  </AlertDescription>
                </Alert>
              )}

              <CameraCapture
                onCapture={handleCapture}
                onClose={onClose}
                batteryMode={shouldUseBatteryMode}
                className="h-full"
              />

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                  <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">
                      Analyse en cours...
                    </p>
                    <p className="text-sm text-white/70">
                      Identification du produit
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <h3 className="text-lg font-semibold mb-4">
                Produit reconnu
              </h3>

              {recognizedProduct && (
                <div className="space-y-4">
                  {/* Product info */}
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-20 bg-muted-foreground/10 rounded-lg flex items-center justify-center">
                        {recognizedProduct.image_url ? (
                          <img
                            src={recognizedProduct.image_url}
                            alt={recognizedProduct.name}
                            className="h-full w-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">
                          {recognizedProduct.name}
                        </h4>
                        {recognizedProduct.brand && (
                          <p className="text-sm text-muted-foreground">
                            {recognizedProduct.brand}
                          </p>
                        )}
                        {recognizedProduct.barcode && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Code: {recognizedProduct.barcode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Nutritional info preview */}
                    {recognizedProduct.nutrition && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">
                          Informations nutritionnelles (pour 100g)
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Calories:</span>{' '}
                            {recognizedProduct.nutrition.calories} kcal
                          </div>
                          <div>
                            <span className="text-muted-foreground">Protéines:</span>{' '}
                            {recognizedProduct.nutrition.proteins}g
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setMode('camera')}
                      className="flex-1"
                    >
                      <Scan className="h-4 w-4 mr-2" />
                      Scanner autre produit
                    </Button>
                    
                    <Button
                      onClick={handleAddToInventory}
                      className="flex-1"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Ajouter à l'inventaire
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}