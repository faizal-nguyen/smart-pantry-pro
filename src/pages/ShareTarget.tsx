import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { importsApi } from '@/services/recipe-import/api';
import { extractFirstUrl } from '@/services/recipe-import/helpers/url';

/**
 * Web Share Target landing page (PRP-220.18).
 *
 * The PWA manifest declares `share_target.action = /share-target` with
 * GET params (`url`, `text`, `title`). Android forwards the share
 * payload as a query string, so we read those params, pull the first
 * URL we can find, capture it via the imports API, and bounce to the
 * inbox tab so the user lands on the freshly-captured row.
 *
 * Idempotency note: the API already returns the existing row for a
 * duplicate canonical URL (PRP-220.10), so a user double-tapping
 * "Share" doesn't create duplicates.
 */
export default function ShareTargetPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // Strict-mode runs effects twice in dev; we only want one capture.
  const launchedRef = useRef(false);

  useEffect(() => {
    if (launchedRef.current) return;
    launchedRef.current = true;

    const candidates = [params.get('url'), params.get('text'), params.get('title')]
      .filter((v): v is string => Boolean(v));
    const url = candidates.map(extractFirstUrl).find((u): u is string => Boolean(u));

    if (!url) {
      toast.error('Aucune URL détectée dans le partage');
      navigate('/kitchen/recipes?tab=inbox', { replace: true });
      return;
    }

    (async () => {
      try {
        const result = await importsApi.capture(url, 'share_target');
        if (result.duplicate) {
          toast.info('Cette recette est déjà dans ton inbox');
        } else {
          toast.success('Recette ajoutée à l\'inbox');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Échec de la capture';
        toast.error('Capture impossible', { description: msg });
      } finally {
        navigate('/kitchen/recipes?tab=inbox', { replace: true });
      }
    })();
  }, [params, navigate]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">Capture en cours…</p>
    </div>
  );
}
