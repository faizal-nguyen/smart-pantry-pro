import React, { useState, useRef, useEffect } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Camera, 
  CameraOff, 
  RotateCw, 
  X, 
  Check,
  Zap,
  BatteryLow,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: (image: Blob) => void;
  onClose?: () => void;
  className?: string;
  batteryMode?: boolean;
}

export function CameraCapture({ 
  onCapture, 
  onClose, 
  className,
  batteryMode: initialBatteryMode = false 
}: CameraCaptureProps) {
  const [batteryMode, setBatteryMode] = useState(initialBatteryMode);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const camera = useCamera({
    facingMode: 'environment',
    resolution: batteryMode ? 'low' : 'medium',
    batteryMode
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-start camera on mount
  useEffect(() => {
    camera.startCamera();
  }, []);

  // Handle capture
  const handleCapture = async () => {
    const blob = await camera.takePhoto();
    if (blob) {
      // Convert to data URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(blob);
    }
  };

  // Confirm capture
  const handleConfirm = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    
    try {
      // Convert data URL back to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      onCapture(blob);
      
      // Reset state
      setCapturedImage(null);
      
      toast.success('Photo capturée avec succès');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Erreur lors du traitement de l\'image');
    } finally {
      setIsProcessing(false);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
  };

  // Toggle battery mode
  const toggleBatteryMode = () => {
    setBatteryMode(!batteryMode);
    toast.info(
      batteryMode 
        ? 'Mode économie désactivé' 
        : 'Mode économie activé - Qualité réduite pour économiser la batterie'
    );
  };

  // Mobile-optimized layout
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full",
        isMobile ? "fixed inset-0 z-50" : "max-w-2xl mx-auto",
        className
      )}
    >
      <Card className="h-full flex flex-col bg-black">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur">
          <h3 className="text-lg font-semibold text-white">
            Scanner un produit
          </h3>
          
          <div className="flex items-center gap-2">
            {/* Battery mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleBatteryMode}
              className="text-white hover:bg-white/20"
              title={batteryMode ? "Mode économie activé" : "Activer le mode économie"}
            >
              {batteryMode ? (
                <BatteryLow className="h-5 w-5 text-yellow-400" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
            </Button>

            {/* Switch camera */}
            {camera.hasMultipleCameras && !capturedImage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={camera.switchCamera}
                className="text-white hover:bg-white/20"
                disabled={!camera.isReady}
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            )}

            {/* Close button */}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative overflow-hidden bg-black">
          <AnimatePresence mode="wait">
            {!capturedImage ? (
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative w-full h-full"
              >
                {/* Video preview */}
                <video
                  ref={camera.videoRef}
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror for better UX
                />

                {/* Viewfinder overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 md:w-80 md:h-80 border-2 border-white/50 rounded-lg">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="absolute bottom-24 left-0 right-0 text-center">
                    <p className="text-white/80 text-sm px-4">
                      Centrez le produit dans le cadre
                    </p>
                  </div>
                </div>

                {/* Loading/Error states */}
                {!camera.isReady && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    {camera.error ? (
                      <div className="text-center p-4">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                        <p className="text-white mb-4">{camera.error}</p>
                        <Button
                          onClick={camera.startCamera}
                          variant="secondary"
                        >
                          Réessayer
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-2" />
                        <p className="text-white">Chargement de la caméra...</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full h-full"
              >
                {/* Captured image preview */}
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />

                {/* Processing overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="p-4 bg-black/80 backdrop-blur">
          <AnimatePresence mode="wait">
            {!capturedImage ? (
              <motion.div
                key="capture-controls"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex justify-center"
              >
                <Button
                  size="lg"
                  onClick={handleCapture}
                  disabled={!camera.isReady || camera.isTakingPhoto}
                  className="rounded-full h-16 w-16 bg-white hover:bg-gray-100"
                >
                  {camera.isTakingPhoto ? (
                    <Loader2 className="h-8 w-8 text-black animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8 text-black" />
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="confirm-controls"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex justify-center gap-4"
              >
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className="text-white border-white hover:bg-white/20"
                >
                  <X className="h-5 w-5 mr-2" />
                  Reprendre
                </Button>
                
                <Button
                  size="lg"
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5 mr-2" />
                  )}
                  Confirmer
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Battery mode indicator */}
        {batteryMode && (
          <div className="absolute top-20 left-4 right-4">
            <div className="bg-yellow-500/20 backdrop-blur text-yellow-300 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1">
              <BatteryLow className="h-3 w-3" />
              Mode économie activé
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}