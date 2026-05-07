import React from 'react';
import { Archive, ArchiveRestore, CheckCircle2, ExternalLink, Loader2, RefreshCw, Sparkles, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import type { SocialImport } from '@/services/recipe-import/types';

interface ImportActionsProps {
  import_: SocialImport;
  onExtract?: (id: string, force?: boolean) => void;
  onVerify?: (import_: SocialImport) => void;
  onSave?: (import_: SocialImport) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  /** When true, disables ALL action buttons. Used while a mutation is in flight. */
  disabled?: boolean;
}

/**
 * Buttons for an inbox card vary with the import status (PRP-220.12).
 *
 *   captured / metadata_ready  → Extract
 *   extracting                  → Spinner ("en cours…")
 *   draft_ready                 → Verify + Save
 *   needs_review                → Verify (save is gated by user review)
 *   failed                      → Retry + Archive
 *   saved                       → Open saved recipe
 *   archived                    → Restore
 */
export const ImportActions: React.FC<ImportActionsProps> = ({
  import_,
  onExtract,
  onVerify,
  onSave,
  onArchive,
  onUnarchive,
  disabled,
}) => {
  const id = import_.id;

  switch (import_.status) {
    case 'captured':
    case 'metadata_ready':
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onExtract?.(id)}
            disabled={disabled || !onExtract}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Extraire
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onArchive?.(id)}
            disabled={disabled || !onArchive}
            aria-label="Archiver"
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      );

    case 'extracting':
      return (
        <span className="inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Extraction en cours…
        </span>
      );

    case 'draft_ready':
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => onVerify?.(import_)} disabled={disabled || !onVerify}>
            Vérifier
          </Button>
          <Button size="sm" onClick={() => onSave?.(import_)} disabled={disabled || !onSave}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Sauvegarder
          </Button>
        </div>
      );

    case 'needs_review':
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => onVerify?.(import_)} disabled={disabled || !onVerify}>
            <ShieldAlert className="h-4 w-4 mr-1.5" />
            Vérifier
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onArchive?.(id)} disabled={disabled || !onArchive}>
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      );

    case 'failed':
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => onExtract?.(id, true)} disabled={disabled || !onExtract}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Réessayer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onArchive?.(id)} disabled={disabled || !onArchive}>
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      );

    case 'saved':
      return import_.recipe_id ? (
        <Button asChild size="sm" variant="ghost">
          <Link to={`/recipes/${import_.recipe_id}`}>
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Voir la recette
          </Link>
        </Button>
      ) : (
        <span className="text-sm text-emerald-700 dark:text-emerald-300">Sauvegardée</span>
      );

    case 'archived':
      return (
        <Button size="sm" variant="ghost" onClick={() => onUnarchive?.(id)} disabled={disabled || !onUnarchive}>
          <ArchiveRestore className="h-4 w-4 mr-1.5" />
          Restaurer
        </Button>
      );

    default:
      return null;
  }
};

export default ImportActions;
