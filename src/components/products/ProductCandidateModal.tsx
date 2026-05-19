/**
 * ProductCandidateModal — clarification quand `/api/products/resolve`
 * retourne `kind: 'ambiguous'`.
 *
 * PRP-225 PR6 — affiche les candidats (local ou OpenFoodFacts), plus
 * 2 options de secours : « Produit générique » (créer un produit
 * minimal) et « Créer nouveau » (laisser l'utilisateur taper). Le
 * parent reçoit l'id ou la directive et orchestre l'action suivante
 * (insertion inventaire, ajout courses, etc.).
 *
 * Tokens PRP-237 : header en `accent-ai` (assistant a posé une
 * question), surface en `surface-raised`, focus visible standard.
 */
import * as React from 'react';
import { Image as ImageIcon, Plus, ShieldQuestion } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ProductCandidateOption {
  product_id?: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  score: number;
  source: 'local' | 'openfoodfacts';
}

export type ProductCandidateChoice =
  | { kind: 'candidate'; candidate: ProductCandidateOption }
  | { kind: 'generic' }
  | { kind: 'create-new' };

interface ProductCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Free-text the user typed/said, displayed in the header. */
  rawInput?: string;
  candidates: ProductCandidateOption[];
  /** Called when the user picks one option. The parent closes the modal. */
  onSelect: (choice: ProductCandidateChoice) => void;
  /** Disable while the parent is mid-flight (e.g. creating inventory row). */
  isSubmitting?: boolean;
}

function CandidateRow({
  candidate,
  onClick,
  disabled,
}: {
  candidate: ProductCandidateOption;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border bg-surface px-3 py-2 text-left transition-colors',
        'hover:bg-muted hover:border-accent-ai/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:opacity-60 disabled:cursor-not-allowed',
      )}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-muted">
        {candidate.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.image_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-sm text-foreground">{candidate.name}</p>
          <Badge
            variant={candidate.source === 'openfoodfacts' ? 'ai' : 'secondary'}
            className="text-[10px] uppercase tracking-wider"
          >
            {candidate.source === 'openfoodfacts' ? 'OFF' : 'Local'}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {candidate.brand && <span className="truncate">{candidate.brand}</span>}
          {candidate.category && <span className="truncate">· {candidate.category}</span>}
          {candidate.barcode && (
            <span className="truncate font-mono">· {candidate.barcode}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-xs font-mono text-muted-foreground">
        {(candidate.score * 100).toFixed(0)}%
      </div>
    </button>
  );
}

export function ProductCandidateModal({
  open,
  onOpenChange,
  rawInput,
  candidates,
  onSelect,
  isSubmitting,
}: ProductCandidateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldQuestion className="h-4 w-4 text-accent-ai" aria-hidden="true" />
            <span>
              {rawInput
                ? `Plusieurs produits pour "${rawInput}"`
                : 'Plusieurs candidats possibles'}
            </span>
          </DialogTitle>
          <DialogDescription>
            Choisis le bon produit, ou crée un produit générique si rien ne correspond.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun candidat retourné.</p>
          ) : (
            candidates.map((c, i) => (
              <CandidateRow
                key={c.product_id ?? c.barcode ?? `cand-${i}`}
                candidate={c}
                onClick={() => onSelect({ kind: 'candidate', candidate: c })}
                disabled={isSubmitting}
              />
            ))
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => onSelect({ kind: 'generic' })}
          >
            Produit générique
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onSelect({ kind: 'create-new' })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Créer nouveau</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductCandidateModal;
