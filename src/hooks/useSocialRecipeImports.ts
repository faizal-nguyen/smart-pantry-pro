/**
 * React Query hook for the social-recipe-imports inbox (PRP-220.12).
 *
 * Wraps the REST client (`src/services/recipe-import/api.ts`) with:
 *   - cursor-paginated infinite list (filterable by status / platform / search)
 *   - capture / extract / save / archive mutations
 *   - automatic invalidation of the imports list AND the user-recipes
 *     cache on save (so the saved recipe shows up immediately in
 *     "Mes Recettes" without a window.location.reload).
 *
 * Optimistic updates are intentionally NOT used: the server is the
 * source of truth for status transitions, and a wrong optimistic flip
 * would mislead the user about whether the AI extraction has actually
 * happened.
 */
import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { ImportedRecipeDraft } from '@smart/shared';

import { importsApi } from '@/services/recipe-import/api';
import type {
  ExtractRequest,
  ImportStatus,
  ListImportsQuery,
  ListResponse,
  PatchImportFields,
  SaveRequest,
  SocialImport,
  SocialPlatform,
} from '@/services/recipe-import/types';

export interface UseSocialRecipeImportsOptions {
  status?: ImportStatus;
  platform?: SocialPlatform;
  search?: string;
  limit?: number;
  /** Disable network access for storybook / unit tests. */
  enabled?: boolean;
}

const PENDING_STATUSES: ImportStatus[] = [
  'captured',
  'metadata_ready',
  'draft_ready',
  'needs_review',
];

const queryKey = (filters: Omit<ListImportsQuery, 'cursor'>) =>
  ['social-imports', filters] as const;

export function useSocialRecipeImports(options: UseSocialRecipeImportsOptions = {}) {
  const queryClient = useQueryClient();

  const filters = useMemo<Omit<ListImportsQuery, 'cursor'>>(
    () => ({
      status: options.status,
      platform: options.platform,
      search: options.search,
      limit: options.limit ?? 20,
    }),
    [options.status, options.platform, options.search, options.limit]
  );

  const list = useInfiniteQuery({
    queryKey: queryKey(filters),
    queryFn: ({ pageParam }) =>
      importsApi.list({ ...filters, cursor: pageParam ?? undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ListResponse) => lastPage.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
    staleTime: 30 * 1000,
  });

  const invalidateAllLists = () =>
    queryClient.invalidateQueries({ queryKey: ['social-imports'] });

  const captureMutation = useMutation({
    mutationFn: (url: string) => importsApi.capture(url),
    onSuccess: () => invalidateAllLists(),
  });

  const bulkMutation = useMutation({
    mutationFn: (urls: string[]) => importsApi.bulkCapture(urls),
    onSuccess: () => invalidateAllLists(),
  });

  const extractMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body?: ExtractRequest }) =>
      importsApi.extract(id, body),
    onSuccess: () => invalidateAllLists(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body?: SaveRequest }) =>
      importsApi.save(id, body),
    onSuccess: () => {
      invalidateAllLists();
      // The save operation creates a row in `recipes`. Refresh the
      // "Mes Recettes" view + any catalog that may be displaying the
      // user's library.
      queryClient.invalidateQueries({ queryKey: ['user-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => importsApi.patch(id, { status: 'archived' }),
    onSuccess: () => invalidateAllLists(),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => importsApi.patch(id, { status: 'captured' }),
    onSuccess: () => invalidateAllLists(),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: PatchImportFields }) =>
      importsApi.patch(id, fields),
    onSuccess: () => invalidateAllLists(),
  });

  const items = useMemo<SocialImport[]>(() => {
    const data = list.data as InfiniteData<ListResponse> | undefined;
    return data?.pages.flatMap((p) => p.items) ?? [];
  }, [list.data]);

  const pendingCount = useMemo(
    () => items.filter((i) => PENDING_STATUSES.includes(i.status)).length,
    [items]
  );

  return {
    // data
    items,
    pendingCount,
    // list state
    isLoading: list.isLoading,
    isFetching: list.isFetching,
    isError: list.isError,
    error: list.error,
    hasMore: !!list.hasNextPage,
    fetchMore: list.fetchNextPage,
    refetch: list.refetch,

    // mutations (return promises, callers can await + try/catch)
    capture: (url: string) => captureMutation.mutateAsync(url),
    bulkCapture: (urls: string[]) => bulkMutation.mutateAsync(urls),
    extract: (id: string, body?: ExtractRequest) =>
      extractMutation.mutateAsync({ id, body }),
    save: (id: string, body?: SaveRequest) => saveMutation.mutateAsync({ id, body }),
    archive: (id: string) => archiveMutation.mutateAsync(id),
    unarchive: (id: string) => unarchiveMutation.mutateAsync(id),
    patch: (id: string, fields: PatchImportFields) =>
      patchMutation.mutateAsync({ id, fields }),

    // pending flags for UI feedback
    isCapturing: captureMutation.isPending,
    isExtracting: extractMutation.isPending,
    isSaving: saveMutation.isPending,
    isArchiving: archiveMutation.isPending,

    // expose for tests / advanced consumers
    queryClient,
  };
}

// Re-export the canonical draft type for components that consume the
// hook + need the type for editing flows (PRP-220.08 modal).
export type { ImportedRecipeDraft, SocialImport };
