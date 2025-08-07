import React, { useState, useRef, useEffect } from 'react';
import { CameraCapture } from '@/components/inventory/CameraCapture';
import { imageProcessingPipeline } from '@/services/vision/imageProcessingPipeline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Eye,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useInventory } from '@/hooks/useInventory';

interface DetectedProduct {
  name: string;
  brand?: string;
  confidence: number;
  boundingBox?: any;
  quantity?: { amount: number; unit: string };
  freshness?: string;
  selected: boolean;
  expiryDate?: string;
}

export function MultiProductScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<DetectedProduct[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  
  const { addItem } = useInventory();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<string | null>(null);

  // Handle image capture
  const handleCapture = async (blob: Blob) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setShowCamera(false);

    try {
      // Store image for display
      imageRef.current = URL.createObjectURL(blob);

      // Process through pipeline
      const result = await imageProcessingPipeline.processImage(blob, {
        quality: 'high',
        detectMultiple: true,
        detectExpiry: true,
        cacheResults: true,
        priority: 'high'
      });

      setProcessingProgress(50);

      if (result.status === 'completed' && result.results) {
        const { vision, expiry } = result.results;

        if (vision.success && vision.products.length > 0) {
          // Map products with selection state
          const products: DetectedProduct[] = vision.products.map((p: any) => ({
            ...p,
            selected: true,
            expiryDate: expiry?.date
          }));

          setDetectedProducts(products);
          setProcessingProgress(100);

          // Draw bounding boxes
          if (imageRef.current) {
            drawBoundingBoxes(products);
          }

          toast.success(`${products.length} produit(s) détecté(s)`);
        } else {
          toast.error('Aucun produit détecté');
        }
      } else {
        toast.error(result.error || 'Erreur lors de l\'analyse');
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Erreur lors du traitement de l\'image');
    } finally {
      setIsProcessing(false);
    }
  };

  // Draw bounding boxes on canvas
  const drawBoundingBoxes = (products: DetectedProduct[]) => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw boxes
      products.forEach((product, index) => {
        if (product.boundingBox) {
          const { x, y, width, height } = product.boundingBox;
          
          // Set color based on confidence
          const color = product.confidence > 0.8 ? '#10b981' : 
                       product.confidence > 0.6 ? '#f59e0b' : '#ef4444';
          
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);
          
          // Draw label
          ctx.fillStyle = color;
          ctx.fillRect(x, y - 25, width, 25);
          ctx.fillStyle = 'white';
          ctx.font = '14px sans-serif';
          ctx.fillText(`${index + 1}. ${product.name}`, x + 5, y - 8);
        }
      });
    };
    img.src = imageRef.current;
  };

  // Toggle product selection
  const toggleProductSelection = (index: number) => {
    setDetectedProducts(prev => 
      prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p)
    );
  };

  // Add selected products to inventory
  const addSelectedToInventory = async () => {
    const selectedProducts = detectedProducts.filter(p => p.selected);
    
    if (selectedProducts.length === 0) {
      toast.error('Aucun produit sélectionné');
      return;
    }

    setIsProcessing(true);

    try {
      for (const product of selectedProducts) {
        await addItem({
          name: product.name,
          brand: product.brand,
          quantity: product.quantity?.amount || 1,
          unit: product.quantity?.unit || 'unité',
          expiry_date: product.expiryDate
        });
      }

      toast.success(`${selectedProducts.length} produit(s) ajouté(s) à l'inventaire`);
      
      // Reset
      setDetectedProducts([]);
      imageRef.current = null;
      
    } catch (error) {
      console.error('Error adding to inventory:', error);
      toast.error('Erreur lors de l\'ajout à l\'inventaire');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get freshness color
  const getFreshnessColor = (freshness?: string) => {
    switch (freshness) {
      case 'fresh': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'use-soon': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          Scanner Multiple
        </h2>
        <p className="text-muted-foreground">
          Scannez plusieurs produits en une seule photo
        </p>
      </div>

      {/* Main scanning area */}
      <Card className="p-6">
        {!detectedProducts.length && !isProcessing && (
          <div className="text-center py-12">
            <div className="h-32 w-32 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-16 w-16 text-primary" />
            </div>
            
            <h3 className="text-lg font-semibold mb-2">
              Prêt à scanner
            </h3>
            <p className="text-muted-foreground mb-6">
              Prenez une photo de vos produits pour les ajouter rapidement
            </p>
            
            <Button
              size="lg"
              onClick={() => setShowCamera(true)}
              className="gap-2"
            >
              <Camera className="h-5 w-5" />
              Ouvrir la caméra
            </Button>
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="py-12">
            <div className="text-center mb-6">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Analyse en cours...</p>
              <p className="text-sm text-muted-foreground">
                Détection des produits dans l'image
              </p>
            </div>
            
            <Progress value={processingProgress} className="max-w-md mx-auto" />
          </div>
        )}

        {/* Results */}
        {detectedProducts.length > 0 && !isProcessing && (
          <div className="space-y-6">
            {/* Image with bounding boxes */}
            {imageRef.current && (
              <div className="relative rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Detected products list */}
            <div>
              <h3 className="font-semibold mb-3">
                Produits détectés ({detectedProducts.filter(p => p.selected).length}/{detectedProducts.length})
              </h3>
              
              <div className="space-y-2">
                {detectedProducts.map((product, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      product.selected ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                    }`}
                  >
                    <button
                      onClick={() => toggleProductSelection(index)}
                      className="flex-shrink-0"
                    >
                      {product.selected ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {index + 1}. {product.name}
                        </span>
                        {product.brand && (
                          <span className="text-sm text-muted-foreground">
                            ({product.brand})
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Confiance: {Math.round(product.confidence * 100)}%
                        </Badge>
                        
                        {product.freshness && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getFreshnessColor(product.freshness)}`}
                          >
                            {product.freshness === 'fresh' && 'Frais'}
                            {product.freshness === 'good' && 'Bon état'}
                            {product.freshness === 'use-soon' && 'À consommer'}
                            {product.freshness === 'expired' && 'Expiré'}
                          </Badge>
                        )}
                        
                        {product.expiryDate && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(product.expiryDate).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {product.quantity && (
                      <div className="text-sm text-muted-foreground">
                        {product.quantity.amount} {product.quantity.unit}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCamera(true)}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scanner à nouveau
              </Button>
              
              <Button
                onClick={addSelectedToInventory}
                disabled={!detectedProducts.some(p => p.selected)}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter à l'inventaire
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Pipeline stats */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="font-medium">Performance du scanner</p>
            <p className="text-muted-foreground">
              Cache: {Math.round(imageProcessingPipeline.getStats().cacheHitRate * 100)}% de succès
            </p>
          </div>
          <Eye className="h-5 w-5 text-muted-foreground" />
        </div>
      </Card>

      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50">
          <CameraCapture
            onCapture={handleCapture}
            onClose={() => setShowCamera(false)}
          />
        </div>
      )}
    </div>
  );
}