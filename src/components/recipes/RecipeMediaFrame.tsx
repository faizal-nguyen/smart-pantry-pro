/**
 * RecipeMediaFrame — frame média principale du détail recette.
 *
 * PRP-232 PR4 — extrait de `src/pages/RecipeDetail.tsx`. Affiche l'image
 * de couverture si disponible, sinon un fallback iconique. Contraintes
 * media per PRP §6 :
 *  - mobile : `max-h-[72vh]`, aspect 9:16 autorisé ;
 *  - desktop : `max-w-[420px] max-h-[560px]`, préfère 4:5 / 16:10.
 * Le support vidéo (et bouton "ouvrir source" si lien externe) arrive
 * lorsque la pipeline media PRP-220.22-24 sera consommable.
 */
import React from 'react';
import { ChefHat } from 'lucide-react';

interface RecipeMediaFrameProps {
  imageUrl?: string | null;
  alt: string;
}

export default function RecipeMediaFrame({ imageUrl, alt }: RecipeMediaFrameProps) {
  return (
    <div className="mb-6 flex justify-center">
      <div className="w-full md:max-w-[420px]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className="w-full max-h-[72vh] md:max-h-[560px] object-cover rounded-lg shadow-sm"
          />
        ) : (
          <div className="w-full h-64 md:h-[420px] bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
            <ChefHat className="h-16 w-16 text-orange-400" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
