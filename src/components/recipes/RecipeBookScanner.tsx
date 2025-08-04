import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Camera, X, Flashlight, BookOpen, Loader2, FileImage, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RecipeBookScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (ocrResult: OCRRecipeResult) => void;
}

export interface OCRRecipeResult {
  text: string;
  confidence: number;
  parsedRecipe?: ParsedRecipe;
  imageUrl?: string;
  engine?: string;
  processingTime?: number;
}

interface ParsedRecipe {
  name: string;
  ingredients: string[];
  instructions: string;
  servings?: number;
  cookTime?: string;
  prepTime?: string;
}

const RecipeBookScanner = ({ isOpen, onClose, onScan }: RecipeBookScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRRecipeResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCapturedImage(null);
      setOcrResult(null);

      // Camera permissions check (pattern Cipher from BarcodeScanner)
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (permission.state === 'denied') {
        setError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres.');
        return;
      }

      // Optimized constraints for recipe book scanning (pattern Cipher)
      const constraints = {
        video: {
          facingMode: 'environment', // Back camera for better document scanning
          width: { ideal: 1920 }, // Higher resolution for OCR
          height: { ideal: 1080 },
          focusMode: 'macro' // Better for close-up text scanning
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Flash capability check (pattern BarcodeScanner)
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setHasFlash('torch' in capabilities);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    setIsScanning(false);

    // Stop media stream (pattern BarcodeScanner)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Turn off flash if on
    if (flashOn) {
      toggleFlash();
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current || !hasFlash) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{
          torch: !flashOn
        }]
      });
      setFlashOn(!flashOn);
    } catch (err) {
      console.error('Flash toggle error:', err);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob for OCR processing (pattern Cipher optimization)
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        setIsProcessing(true);

        // Convert blob to data URL for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setCapturedImage(e.target?.result as string);
        };
        reader.readAsDataURL(blob);

        // Process with enhanced Google Vision OCR API
        await processImageWithOCR(blob);

      } catch (error) {
        console.error('Image capture failed:', error);
        toast({
          title: "Erreur de capture",
          description: "Impossible de capturer l'image",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg', 0.9); // High quality for OCR
  };

  const processImageWithOCR = async (imageBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('image', imageBlob);

      // Try Google Vision first, fallback to Tesseract
      const response = await fetch('/api/ocr-vision', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.status}`);
      }

      const result: OCRRecipeResult = await response.json();
      
      console.log('📖 OCR Result:', result);
      setOcrResult(result);

      // Enhanced feedback based on OCR engine used
      const engineName = result.engine === 'google-vision' ? 'Google Vision' : 
                         result.engine === 'tesseract-fallback' ? 'Tesseract' : 'OCR';
      
      toast({
        title: "Texte extrait !",
        description: `${result.text.length} caractères détectés via ${engineName} (confiance: ${Math.round(result.confidence * 100)}%)`,
      });

    } catch (error) {
      console.error('OCR processing failed:', error);
      toast({
        title: "Erreur OCR",
        description: "Impossible d'extraire le texte de l'image",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner une image",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Process with OCR
      await processImageWithOCR(file);

    } catch (error) {
      console.error('File upload failed:', error);
      toast({
        title: "Erreur de traitement",
        description: "Impossible de traiter l'image",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmOCRResult = () => {
    if (ocrResult) {
      onScan(ocrResult);
      onClose();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setOcrResult(null);
    startCamera();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Scanner Livre de Recettes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!capturedImage ? (
            // Camera view (pattern BarcodeScanner)
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              
              {/* Overlay guides for book scanning */}
              <div className="absolute inset-4 border-2 border-white/50 rounded-lg flex items-center justify-center">
                <div className="text-white/70 text-center text-sm px-4">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-70" />
                  Positionnez la recette dans le cadre
                </div>
              </div>
              
              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Traitement OCR...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Captured image preview with OCR results
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <img 
                  src={capturedImage} 
                  alt="Image capturée"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {ocrResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Confiance: {Math.round(ocrResult.confidence * 100)}%
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {ocrResult.text.length} caractères
                    </Badge>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto bg-muted p-3 rounded-lg text-sm">
                    {ocrResult.text}
                  </div>
                  
                  {ocrResult.parsedRecipe && (
                    <div className="bg-green-50 p-3 rounded-lg text-sm">
                      <p className="font-medium text-green-800 mb-1">
                        📝 Recette détectée: {ocrResult.parsedRecipe.name}
                      </p>
                      <p className="text-green-700 text-xs">
                        {ocrResult.parsedRecipe.ingredients.length} ingrédients trouvés
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {!capturedImage ? (
              <>
                <Button
                  onClick={captureImage}
                  disabled={!isScanning || isProcessing}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capturer
                </Button>
                
                {hasFlash && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleFlash}
                    className={flashOn ? 'bg-yellow-100' : ''}
                  >
                    <Flashlight className={`w-4 h-4 ${flashOn ? 'text-yellow-600' : ''}`} />
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reprendre
                </Button>
                
                <Button
                  onClick={confirmOCRResult}
                  disabled={!ocrResult}
                  className="flex-1"
                >
                  Utiliser le texte
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default RecipeBookScanner;