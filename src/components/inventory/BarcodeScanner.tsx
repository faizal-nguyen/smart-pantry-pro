import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Flashlight } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const BarcodeScanner = ({ isOpen, onClose, onScan }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Check for camera permissions
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (permission.state === 'denied') {
        setError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres.');
        return;
      }

      // Get camera stream with constraints for mobile
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check for flash capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setHasFlash('torch' in capabilities);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize barcode reader
      codeReader.current = new BrowserMultiFormatReader();
      
      // Start decoding
      codeReader.current.decodeFromVideoDevice(
        undefined, // Use default video device
        videoRef.current!,
        (result, err) => {
          if (result) {
            const barcode = result.getText();
            console.log('📱 Barcode detected:', barcode);
            onScan(barcode);
            stopScanning();
            onClose();
          }
          if (err && !(err.name === 'NotFoundException')) {
            console.error('Scan error:', err);
          }
        }
      );

    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);

    // Stop the code reader
    if (codeReader.current) {
      codeReader.current.reset();
      codeReader.current = null;
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Turn off flash
    if (flashOn) {
      toggleFlash();
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current || !hasFlash) return;

    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as any]
      });
      setFlashOn(!flashOn);
    } catch (err) {
      console.error('Error toggling flash:', err);
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 max-w-md">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner le code-barres
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative">
          {error ? (
            <div className="p-6 text-center">
              <div className="text-red-500 mb-4">{error}</div>
              <Button onClick={startScanning} className="w-full">
                Réessayer
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-64 object-cover bg-black"
                playsInline
                muted
              />
              
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-48 h-32 border-2 border-primary rounded-lg border-dashed animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-scan" />
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {hasFlash && (
                  <Button
                    variant={flashOn ? 'default' : 'secondary'}
                    size="icon"
                    onClick={toggleFlash}
                    className="rounded-full"
                  >
                    <Flashlight className={`h-4 w-4 ${flashOn ? 'fill-current' : ''}`} />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 pt-2">
          <p className="text-sm text-muted-foreground text-center">
            Pointez la caméra vers le code-barres du produit
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;