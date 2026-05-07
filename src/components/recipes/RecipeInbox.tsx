import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useSocialRecipeImports } from '@/hooks/useSocialRecipeImports';
import type {
  CurrentDraftResponse,
  ImportStatus,
  SocialImport,
} from '@/services/recipe-import/types';

import { BulkImportButton } from './BulkImportButton';
import { ClipboardSuggestion } from './ClipboardSuggestion';
import { CaptureUrlBar } from './inbox/CaptureUrlBar';
import { FiltersBar, type FilterValue } from './inbox/FiltersBar';
import { ImportCard } from './inbox/ImportCard';
import { InboxEmptyState } from './inbox/InboxEmptyState';
import { SearchBar } from './inbox/SearchBar';

interface RecipeInboxProps {
  /**
   * Callback fired when the user clicks "Vérifier" on a card.
   * Receives the import row PLUS the resolved current draft (from
   * `imported_recipe_drafts.is_current = TRUE`) so the consumer can
   * open the editor pre-filled. `draft` is null when no extraction
   * has run yet (which shouldn't normally trigger Vérifier, but the
   * type stays nullable to keep the consumer honest).
   */
  onVerifyDraft?: (payload: CurrentDraftResponse) => void;
  className?: string;
}

const TERMINAL_FILTERS: FilterValue[] = ['saved', 'archived'];

/**
 * Inbox page composing the URL capture bar, filters, and import cards
 * (PRP-220.12). Server is the source of truth for status — this page
 * just observes via React Query and dispatches mutations.
 */
export const RecipeInbox: React.FC<RecipeInboxProps> = ({ onVerifyDraft, className }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 300ms debounce so the list query doesn't refetch on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const apiStatus = filter === 'all' ? undefined : (filter as ImportStatus);

  const {
    items,
    isLoading,
    isError,
    error,
    hasMore,
    fetchMore,
    isFetching,
    capture,
    extract,
    save,
    archive,
    unarchive,
    getCurrentDraft,
  } = useSocialRecipeImports({
    status: apiStatus,
    search: debouncedSearch || undefined,
  });

  const counts = useMemo(() => {
    const out: Partial<Record<FilterValue, number>> = { all: items.length };
    for (const i of items) {
      out[i.status] = (out[i.status] ?? 0) + 1;
    }
    return out;
  }, [items]);

  const handleCapture = async (url: string) => {
    try {
      const result = await capture(url);
      toast.success(
        result.duplicate ? 'Déjà dans ton inbox' : 'Recette ajoutée à l\'inbox'
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Échec de la capture';
      toast.error('Capture impossible', { description: msg });
      throw e;
    }
  };

  const wrap = async (id: string, action: () => Promise<unknown>, successMsg?: string) => {
    setBusyId(id);
    try {
      await action();
      if (successMsg) toast.success(successMsg);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Échec';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleExtract = (id: string, force?: boolean) =>
    wrap(id, () => extract(id, { force }), undefined);

  const handleSave = async (import_: SocialImport) => {
    setBusyId(import_.id);
    try {
      // PRP-220.17: surface the new recipe id so the user can jump
      // straight to the detail page instead of re-discovering the
      // recipe in the list.
      const result = await save(import_.id);
      const recipeId = (result as { recipe_id?: string } | undefined)?.recipe_id;
      toast.success('Recette sauvegardée dans Mes Recettes', {
        action: recipeId
          ? {
              label: 'Voir',
              onClick: () => navigate(`/kitchen/recipes/${recipeId}`),
            }
          : undefined,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Échec';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = (id: string) =>
    wrap(id, () => archive(id), 'Import archivé');

  const handleUnarchive = (id: string) =>
    wrap(id, () => unarchive(id), 'Import restauré');

  const handleVerify = async (import_: SocialImport) => {
    setBusyId(import_.id);
    try {
      const payload = await getCurrentDraft(import_.id);
      if (!payload.draft) {
        toast.error("Aucun brouillon disponible", {
          description: 'Lance une extraction d\'abord.',
        });
        return;
      }
      onVerifyDraft?.(payload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Impossible de charger le brouillon';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={className} aria-label="Recipe inbox">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <CaptureUrlBar onCapture={handleCapture} />
        </div>
        <BulkImportButton className="sm:mt-0" />
      </div>

      <div className="mb-3">
        <ClipboardSuggestion />
      </div>

      <div className="mb-3">
        <SearchBar value={searchInput} onChange={setSearchInput} />
      </div>

      <div className="mb-4">
        <FiltersBar value={filter} onChange={setFilter} counts={counts} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Chargement…
        </div>
      )}

      {isError && (
        <div role="alert" className="py-6 text-sm text-red-700 dark:text-red-300">
          Erreur de chargement. {error instanceof Error ? error.message : ''}
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <InboxEmptyState
          {...(filter !== 'all'
            ? {
                title: 'Rien dans cette vue',
                description: TERMINAL_FILTERS.includes(filter)
                  ? 'Aucun import dans ce statut. Essaie un autre filtre.'
                  : 'Aucun import dans ce statut. Capture-en un nouveau ou change de filtre.',
              }
            : {})}
        />
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((import_) => (
            <ImportCard
              key={import_.id}
              import_={import_}
              busy={busyId === import_.id}
              onExtract={handleExtract}
              onVerify={handleVerify}
              onSave={handleSave}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => fetchMore()} disabled={isFetching}>
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Chargement…
              </>
            ) : (
              'Charger plus'
            )}
          </Button>
        </div>
      )}
    </section>
  );
};

export default RecipeInbox;
