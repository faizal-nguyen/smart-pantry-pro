import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Camera, Image as ImageIcon, X, Upload } from "lucide-react";
import { useImageManagement } from "@/hooks/useImageManagement";

interface ImageUploadSectionProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  productName?: string;
  disabled?: boolean;
}

export const ImageUploadSection = ({
  value,
  onChange,
  productName,
  disabled = false
}: ImageUploadSectionProps) => {
  const { uploading, progress, uploadImage, deleteImage } = useImageManagement();
  const [imageSize, setImageSize] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setImageSize(formatFileSize(file.size));

    try {
      const url = await uploadImage(file, {
        maxWidth: 800,
        quality: 0.8,
        format: 'webp'
      });
      onChange(url);
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fallback: continue without photo
      onChange(undefined);
    }
  };

  const handleRemoveImage = async () => {
    if (value) {
      try {
        await deleteImage(value);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
    onChange(undefined);
    setImageSize("");
  };

  const shouldEncouragePhoto = (name: string) => {
    const encourageKeywords = ['pomme', 'orange', 'banane', 'tomate', 'carotte', 'légume', 'fruit'];
    return encourageKeywords.some(keyword => 
      name.toLowerCase().includes(keyword)
    );
  };

  const showPhotoEncouragement = productName && shouldEncouragePhoto(productName) && !value;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div 
          className={`relative border-2 border-dashed rounded-lg transition-all duration-300 ${
            value 
              ? 'border-primary bg-primary/5' 
              : showPhotoEncouragement 
                ? 'border-amber-400 bg-amber-50 animate-pulse' 
                : 'border-muted-foreground/25 bg-muted/10 hover:border-primary/50'
          }`}
        >
          {value ? (
            // Photo preview
            <div className="relative p-4">
              <img
                src={value}
                alt="Preview produit"
                className="w-full h-48 object-cover rounded-lg shadow-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                onClick={handleRemoveImage}
                disabled={uploading || disabled}
              >
                <X className="h-4 w-4" />
              </Button>
              {imageSize && (
                <Badge className="absolute bottom-2 left-2 bg-black/70 text-white">
                  {imageSize}
                </Badge>
              )}
              <Badge className="absolute bottom-2 right-2 bg-green-600">
                ✓ Photo ajoutée
              </Badge>
            </div>
          ) : (
            // Placeholder
            <div className="p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className={`p-4 rounded-full ${
                  showPhotoEncouragement ? 'bg-amber-100' : 'bg-muted'
                }`}>
                  <Upload className={`h-8 w-8 ${
                    showPhotoEncouragement ? 'text-amber-600' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <p className={`font-medium ${
                    showPhotoEncouragement ? 'text-amber-800' : 'text-foreground'
                  }`}>
                    {showPhotoEncouragement 
                      ? '📸 Photo recommandée pour ce produit !' 
                      : 'Ajouter une photo'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tap pour ajouter une photo de votre produit
                  </p>
                </div>
                {showPhotoEncouragement && (
                  <Badge variant="outline" className="border-amber-400 text-amber-700">
                    Suggestion: Prenez une photo pour mieux identifier ce produit
                  </Badge>
                )}
              </div>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm font-medium">Upload en cours...</p>
                <div className="w-32">
                  <Progress value={progress} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">{progress}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || disabled}
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Prendre photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="flex items-center gap-2"
        >
          <ImageIcon className="h-4 w-4" />
          Galerie
        </Button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />
    </div>
  );
};