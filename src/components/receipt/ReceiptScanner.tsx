/**
 * ReceiptScanner Component
 * Camera capture and file upload for receipt scanning
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ReceiptScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  onCapture,
  onClose,
  isProcessing = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Start the camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError("Impossible d'acceder a la camera. Verifiez les permissions.");
    }
  }, [facingMode]);

  // Stop the camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  // Switch camera facing mode
  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, [stopCamera]);

  // Capture a photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `receipt-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          stopCamera();
          onCapture(file);
        }
      },
      'image/jpeg',
      0.85
    );
  }, [stopCamera, onCapture, isProcessing]);

  // Handle file selection from gallery
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && !isProcessing) {
        stopCamera();
        onCapture(file);
      }
    },
    [onCapture, stopCamera, isProcessing]
  );

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isStreaming) {
      stopCamera();
      startCamera();
    }
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <h2 className="text-white font-medium">Scanner mon ticket</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="text-white hover:bg-white/20"
          disabled={isProcessing}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Camera area */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Card className="p-6 text-center max-w-sm">
              <p className="text-red-500 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={startCamera}>Reessayer</Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Importer une photo
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full flex items-center justify-center p-4">
                <div className="w-full max-w-md h-[70%] border-2 border-white/60 rounded-lg relative">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

                  {/* Instructions */}
                  <div className="absolute -bottom-12 left-0 right-0 text-center text-white text-sm">
                    Placez le ticket dans le cadre
                  </div>
                </div>
              </div>
            </div>

            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4" />
                  <p>Analyse en cours...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Action buttons */}
      <div className="p-4 bg-black/50 backdrop-blur-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex justify-center items-center gap-6">
          {/* Import from gallery */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="text-white border-white/50 hover:bg-white/20 h-12 w-12 rounded-full"
            disabled={isProcessing}
          >
            <Upload className="h-5 w-5" />
          </Button>

          {/* Capture button */}
          <Button
            onClick={capturePhoto}
            disabled={!isStreaming || isProcessing}
            size="lg"
            className="bg-white text-black hover:bg-gray-200 rounded-full w-20 h-20 p-0"
          >
            <Camera className="h-10 w-10" />
          </Button>

          {/* Switch camera */}
          <Button
            variant="outline"
            size="icon"
            onClick={switchCamera}
            className="text-white border-white/50 hover:bg-white/20 h-12 w-12 rounded-full"
            disabled={isProcessing}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptScanner;
