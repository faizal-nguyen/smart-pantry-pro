import React, { useMemo, useState } from 'react';
import { Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useSocialRecipeImports } from '@/hooks/useSocialRecipeImports';
import { extractAllUrls } from '@/services/recipe-import/helpers/url';

const MAX_URLS = 50;

interface BulkImportButtonProps {
  className?: string;
}

/**
 * Bulk URL paste dialog (PRP-220.18). Lets the user dump arbitrary
 * text containing many URLs (Instagram bookmarks export, a shared
 * note, a list of links from a chat) and fan-out captures them
 * through the existing `/api/imports/social/bulk` endpoint.
 *
 * URL extraction goes through the `extractAllUrls` helper so the user
 * can paste markdown, line-broken lists, comma-separated, etc. Output
 * is deduped automatically.
 *
 * The endpoint enforces its own ceiling (50 URLs) — we mirror it on
 * the client to give early feedback before the round-trip.
 */
export const BulkImportButton: React.FC<BulkImportButtonProps> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const { bulkCapture } = useSocialRecipeImports();

  const detectedUrls = useMemo(() => extractAllUrls(text), [text]);
  const overLimit = detectedUrls.length > MAX_URLS;

  async function handleSubmit() {
    if (detectedUrls.length === 0) {
      toast.error('Aucune URL détectée');
      return;
    }
    if (overLimit) {
      toast.error(`Trop d\'URLs (${detectedUrls.length} > ${MAX_URLS})`, {
        description: 'Réduis la sélection puis réessaie.',
      });
      return;
    }
    setPending(true);
    try {
      const response = await bulkCapture(detectedUrls);
      const results = response?.results ?? [];
      const okCount = results.filter((r) => !r.error).length;
      const failCount = results.length - okCount;
      if (okCount > 0) {
        toast.success(
          okCount === 1
            ? '1 URL importée'
            : `${okCount} URLs importées`,
          failCount > 0 ? { description: `${failCount} échec(s)` } : undefined
        );
      } else {
        toast.error('Aucune URL importée');
      }
      setOpen(false);
      setText('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Échec de l\'import';
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Layers className="mr-2 h-4 w-4" aria-hidden />
          Import bulk
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer plusieurs liens</DialogTitle>
          <DialogDescription>
            Colle un texte contenant des URLs (jusqu&apos;à {MAX_URLS}). Smart
            Pantry détecte automatiquement les liens et les ajoute à
            l&apos;inbox.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          aria-label="Liens à importer"
          placeholder={
            'https://www.instagram.com/reel/xxx/\nhttps://www.tiktok.com/@chef/video/yyy\nhttps://www.youtube.com/watch?v=zzz'
          }
          className="font-mono text-sm"
          disabled={pending}
        />

        <p
          className={[
            'text-sm',
            overLimit ? 'text-destructive' : 'text-muted-foreground',
          ].join(' ')}
          aria-live="polite"
        >
          {detectedUrls.length} URL{detectedUrls.length > 1 ? 's' : ''} détectée
          {detectedUrls.length > 1 ? 's' : ''}
          {overLimit && ` (max ${MAX_URLS})`}
        </p>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pending || detectedUrls.length === 0 || overLimit}
          >
            {pending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            Importer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportButton;
