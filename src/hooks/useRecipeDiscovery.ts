import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DiscoveryFeedSchema, type DiscoveryCreator, type DiscoveryFeed, type DiscoveryItem } from '@smart/shared';
import { useOwnedValue, readOwnedValue, removeOwnedValue, writeOwnedValue } from '@/lib/ownedStorage';
import { ApiError } from '@/lib/api';
import {
  discoveryApi, pendingDiscoveryWrite, replayDiscoveryWrite,
  type DiscoveryCaptureInput, type DiscoveryDecision, type DiscoveryFeedback,
} from '@/services/discoveryApi';

export function useRecipeDiscovery(owner: string) {
  const client = useQueryClient();
  const [cached, , cacheError] = useOwnedValue<unknown>(owner, 'discovery-feed', null);
  const [cacheSaveError, setCacheSaveError] = useState<string | null>(null);
  const controllers = useRef(new Set<AbortController>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const activeControllers = controllers.current;
    return () => {
      mounted.current = false;
      for (const controller of activeControllers) controller.abort();
      void client.cancelQueries({ queryKey: ['recipe-discovery', owner] });
      client.removeQueries({ queryKey: ['recipe-discovery', owner] });
    };
  }, [owner, client]);
  const creators = useQuery({
    queryKey: ['recipe-discovery', owner, 'creators'], retry: false, staleTime: 30_000,
    queryFn: ({ signal }) => discoveryApi.creators(owner, signal),
  });
  const links = useQuery({
    queryKey: ['recipe-discovery', owner, 'links'], retry: false, staleTime: 300_000,
    queryFn: ({ signal }) => discoveryApi.links(owner, signal),
  });
  const feed = useQuery({
    queryKey: ['recipe-discovery', owner, 'feed'], retry: false, staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const result = await discoveryApi.feed(owner, signal);
      if (!signal.aborted) try { writeOwnedValue(owner, 'discovery-feed', result); setCacheSaveError(null); }
      catch { setCacheSaveError('La sélection reste visible, mais n’a pas pu être conservée sur cet appareil.'); }
      return result;
    },
  });
  const cachedResult = DiscoveryFeedSchema.safeParse(cached);
  const savedFeed: DiscoveryFeed | undefined = cachedResult.success &&
    [...cachedResult.data.items, ...cachedResult.data.savedItems].every(item => item.userId === owner) ? cachedResult.data : undefined;
  const refresh = async () => {
    await Promise.all([feed.refetch(), creators.refetch(), links.refetch()]);
  };
  async function run<T>(action: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      const result = await action(controller.signal);
      if (!mounted.current || controller.signal.aborted) throw new ApiError('Le compte ou l’écran a changé. Reprends ce choix depuis son compte.', { status: 401, code: 'AUTH_CHANGED' });
      await client.invalidateQueries({ queryKey: ['recipe-discovery', owner] });
      return result;
    } finally { controllers.current.delete(controller); }
  }
  let pending = null, pendingError: string | null = null;
  try { pending = pendingDiscoveryWrite(owner); }
  catch (error) { pendingError = error instanceof Error ? error.message : 'Action conservée à vérifier.'; }
  return {
    owner, feed: feed.data ?? savedFeed, creators: creators.data?.creators ?? [],
    links: links.data?.links ?? [], linksError: links.error,
    isLoading: feed.isLoading && !savedFeed, creatorsLoading: creators.isLoading,
    error: feed.error ?? creators.error, cacheError: cacheError ?? cacheSaveError, isStale: feed.isError && !!(feed.data ?? savedFeed),
    pending, pendingError, refresh,
    pause: (creator: DiscoveryCreator, paused: boolean) => run(signal => discoveryApi.pauseCreator(owner, creator, paused, signal)),
    capture: (input: DiscoveryCaptureInput) => run(signal => discoveryApi.capture(owner, input, signal)),
    decide: (item: DiscoveryItem, decision: DiscoveryDecision) => run(signal => discoveryApi.decide(owner, item, decision, signal)),
    feedback: (item: DiscoveryItem, value: DiscoveryFeedback) => run(signal => discoveryApi.feedback(owner, item, value, signal)),
    replay: () => run(signal => replayDiscoveryWrite(owner, signal)),
    prepare: (item: DiscoveryItem) => run(async signal => {
      const key = `discovery-prepare:${item.id}`;
      const saved = readOwnedValue<unknown>(owner, key, null);
      let input = { itemId: item.id, commandId: crypto.randomUUID(), expectedVersion: item.version };
      if (saved) {
        if (typeof saved !== 'object' || !('itemId' in saved) || saved.itemId !== item.id ||
          !('commandId' in saved) || typeof saved.commandId !== 'string' || !('expectedVersion' in saved) ||
          !Number.isInteger(saved.expectedVersion) || Number(saved.expectedVersion) < 1) throw new Error('La préparation conservée doit être vérifiée.');
        input = saved as typeof input;
      }
      writeOwnedValue(owner, key, input);
      try {
        const result = await discoveryApi.prepareImport(owner, input, signal);
        removeOwnedValue(owner, key);
        return result;
      } catch (error) {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 &&
          !['IDEMPOTENCY_CONFLICT', 'COMMAND_CONFLICT'].includes(error.code ?? '')) removeOwnedValue(owner, key);
        throw error;
      }
    }),
  };
}
