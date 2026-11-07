/**
 * Photos joined to an assistant message: picked (or taken) on the phone,
 * resized there, shown as thumbnails until sent, then read by the vision
 * model. The products seen go with the question as a « Sur mes photos »
 * line, and a card offers to add them to the stock, never on its own.
 */
import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { productNameWithBrand } from '@smart/shared';
import { Button } from '@/components/ui/button';
import type { JoinedPhoto } from '@/hooks/useJoinedPhotos';
import type { RecognizedGrocery } from '@/services/assistantApi';

export function JoinPhotosButton({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input} type="file" accept="image/*,.heic,.heif" multiple className="sr-only" tabIndex={-1}
        aria-label="Photos à joindre" onChange={event => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          onFiles(files);
        }}
      />
      <Button
        type="button" size="icon" variant="ghost" disabled={disabled}
        aria-label="Joindre des photos" className="min-w-[44px] min-h-[44px]"
        onClick={() => input.current?.click()}
      >
        <Camera className="h-4 w-4" aria-hidden="true" />
      </Button>
    </>
  );
}

export function JoinedPhotosStrip({ photos, onRemove, disabled }: { photos: readonly JoinedPhoto[]; onRemove: (index: number) => void; disabled?: boolean }) {
  if (photos.length === 0) return null;
  return (
    <ul className="mb-2 flex gap-2 overflow-x-auto" aria-label="Photos jointes">
      {photos.map((photo, index) => (
        <li key={photo.url} className="relative h-16 w-16 shrink-0">
          <img src={photo.url} alt={`Photo ${index + 1}`} width={64} height={64} className="h-16 w-16 rounded-lg border object-cover" />
          <button
            type="button" disabled={disabled} aria-label={`Retirer la photo ${index + 1}`} onClick={() => onRemove(index)}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SeenGroceriesCard({ items, onAdd, onDismiss }: { items: readonly RecognizedGrocery[]; onAdd: () => void; onDismiss: () => void }) {
  return (
    <section aria-label="Produits vus sur tes photos" className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2 text-sm">
      <p className="min-w-0 flex-1">
        <span className="font-medium">Vu sur tes photos : </span>
        {items.map(item => productNameWithBrand(item.name, item.brand)).join(', ')}
      </p>
      <Button type="button" className="min-h-11" variant="outline" onClick={onAdd}>Ajouter au stock</Button>
      <Button type="button" size="icon" variant="ghost" className="min-h-11 min-w-11" aria-label="Fermer" onClick={onDismiss}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </section>
  );
}
