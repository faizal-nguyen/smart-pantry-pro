import React, { useState } from 'react';
import { Clipboard, ClipboardCheck, X } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useClipboardImportSuggestion } from '@/hooks/useClipboardImportSuggestion';
import { useSocialRecipeImports } from '@/hooks/useSocialRecipeImports';

interface ClipboardSuggestionProps {
  className?: string;
}

/**
 * In-inbox banner that prompts the user to import a URL detected in
 * their clipboard (PRP-220.18). Two-step flow:
 *
 *   1. Consent banner: "Smart Pantry can detect URLs in your clipboard
 *      — enable / dismiss." Stored in localStorage so we ask once.
 *   2. Once granted, a recipe-like URL detected in the clipboard
 *      surfaces a one-click "Import" banner. The user can also
 *      ignore the suggestion (clears the suggestion, keeps consent).
 *
 * Hidden entirely after the consent has been dismissed AND no
 * suggestion is active — no nag.
 */
export const ClipboardSuggestion: React.FC<ClipboardSuggestionProps> = ({ className }) => {
  const {
    suggestedUrl,
    consent,
    grant,
    dismiss,
    clearSuggestion,
  } = useClipboardImportSuggestion();
  const { capture } = useSocialRecipeImports();
  const [importing, setImporting] = useState(false);

  // Pre-consent banner (asks once).
  if (consent === 'unknown') {
    return (
      <Alert className={className} role="region" aria-label="Détection presse-papiers">
        <Clipboard className="h-4 w-4" aria-hidden />
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Smart Pantry peut détecter les URLs de recettes dans ton
            presse-papiers et te proposer de les importer.
          </span>
          <span className="flex shrink-0 gap-2">
            <Button size="sm" onClick={() => void grant()}>
              Activer
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Plus tard
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  if (consent === 'dismissed' || !suggestedUrl) return null;

  const handleImport = async () => {
    setImporting(true);
    try {
      await capture(suggestedUrl);
      toast.success('URL ajoutée à l\'inbox');
      clearSuggestion();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Échec de la capture';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Alert
      className={className}
      role="region"
      aria-label="URL détectée dans le presse-papiers"
    >
      <ClipboardCheck className="h-4 w-4" aria-hidden />
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex flex-col">
          <span className="text-sm font-medium">URL recette détectée</span>
          <code className="truncate text-xs text-muted-foreground" title={suggestedUrl}>
            {truncate(suggestedUrl, 60)}
          </code>
        </span>
        <span className="flex shrink-0 gap-2">
          <Button size="sm" onClick={handleImport} disabled={importing}>
            {importing ? 'Import…' : 'Importer'}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={clearSuggestion}
            aria-label="Ignorer la suggestion"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
};

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}

export default ClipboardSuggestion;
