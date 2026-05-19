/**
 * RecipeMediaFrame — frame média principale du détail recette.
 *
 * PRP-232 PR4 — extrait de `src/pages/RecipeDetail.tsx`.
 * PRP-237 PR4 (2026-05-18) — fallback tokenisé (`bg-muted` au lieu du
 * gradient orange/rouge legacy).
 * 2026-05-18 — support upload :
 *   - quand `editable` est vrai, un bouton "Changer la photo" superpose
 *     l'image (ou apparaît en overlay quand il n'y en a pas) ;
 *   - le parent fournit `onUpload(file)` qui handle compression +
 *     persistence côté DB ;
 *   - état `uploading` pour bloquer les double-clics et donner du
 *     feedback visuel.
 */
import React, { useRef, useState } from 'react';
import { Camera, ChefHat, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecipeMediaFrameProps {
  imageUrl?: string | null;
  alt: string;
  editable?: boolean;
  onUpload?: (file: File) => Promise<void>;
}

export default function RecipeMediaFrame({
  imageUrl,
  alt,
  editable = false,
  onUpload,
}: RecipeMediaFrameProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so the same file can be re-picked after a cancel.
    e.target.value = '';
    if (!file || !onUpload) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-6 flex justify-center">
      <div className="relative w-full md:max-w-[420px] group">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className="w-full max-h-[72vh] md:max-h-[560px] object-cover rounded-lg border border-border shadow-sm"
          />
        ) : (
          <div
            className="w-full h-64 md:h-[420px] bg-muted rounded-lg border border-border flex items-center justify-center"
            role="img"
            aria-label={`Aperçu indisponible pour ${alt}`}
          >
            <ChefHat className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {editable && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFile}
              aria-label="Sélectionner une photo de recette"
              disabled={uploading}
            />

            {/* With an image: small button bottom-right with backdrop so
                it doesn't fight the photo. Without: centered CTA so the
                affordance is obvious. */}
            {imageUrl ? (
              <div className="absolute bottom-3 right-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePick}
                  disabled={uploading}
                  className="bg-background/90 backdrop-blur-sm shadow-md"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Changer la photo
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePick}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Ajouter une photo
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
