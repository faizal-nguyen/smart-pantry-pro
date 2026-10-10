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
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RecipePreview from './RecipePreview';

interface RecipeMediaFrameProps {
  imageUrl?: string | null;
  alt: string;
  editable?: boolean;
  onUpload?: (file: File) => Promise<void>;
  imageCaption?: string;
}

export default function RecipeMediaFrame({
  imageUrl,
  alt,
  editable = false,
  onUpload,
  imageCaption,
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
    <div className="mb-4 flex justify-center">
      <div className="relative w-full md:max-w-[420px] group">
        <RecipePreview imageUrl={imageUrl} title={alt} caption={imageCaption} variant="detail" priority className={imageUrl ? 'aspect-[16/9] md:aspect-[4/3]' : undefined} />

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
                  className="min-h-11 bg-background/90 backdrop-blur-sm shadow-md"
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
              <div className="mt-2 flex justify-center">
                <Button
                  variant="default"
                  size="sm"
                  className="min-h-11"
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
