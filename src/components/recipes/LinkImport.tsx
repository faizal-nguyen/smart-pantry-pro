/**
 * Imports a recipe from a social link through `/api/imports/social`:
 * capture, extraction, then the verification dialog. Replaces the
 * Instagram card's call to `/api/parse-video-recipe`, whose legacy parser
 * no longer exists and answered 422 every time.
 *
 * A link whose extraction fails stays captured, so it can be retried from
 * « À vérifier ».
 */
import { CaptureUrlBar } from '@/components/recipes/inbox/CaptureUrlBar';
import { useSocialRecipeImports } from '@/hooks/useSocialRecipeImports';
import type { CurrentDraftResponse } from '@/services/recipe-import/types';

interface LinkImportProps {
  onVerifyDraft: (payload: CurrentDraftResponse) => void;
  placeholder?: string;
}

export function LinkImport({ onVerifyDraft, placeholder }: LinkImportProps) {
  const { capture, extract, getCurrentDraft } = useSocialRecipeImports({ enabled: false });

  const importLink = async (url: string) => {
    let captured: Awaited<ReturnType<typeof capture>>;
    try {
      captured = await capture(url);
    } catch (error) {
      // The quota refusal (HTTP 402) already carries its own French message.
      const quota = error instanceof Error && (error as { status?: unknown }).status === 402;
      throw new Error(quota ? (error as Error).message : 'Ce lien n’a pas pu être enregistré.');
    }
    try {
      const current = captured.duplicate ? await getCurrentDraft(captured.import.id) : null;
      onVerifyDraft(current?.draft ? current : await extract(captured.import.id));
    } catch {
      throw new Error('Impossible de lire la recette de ce lien. Il reste dans « À vérifier » pour réessayer.');
    }
  };

  return <CaptureUrlBar onCapture={importLink} placeholder={placeholder} />;
}
