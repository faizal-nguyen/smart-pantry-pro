import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { type MemoryCommand, type MemoryWriteResult } from '@smart/shared';
import { ApiError } from '@/lib/api';
import { readPendingMemoryCommand, storePendingMemoryCommand, clearPendingMemoryCommand } from '@/lib/assistantMemoryCommands';
import { type AssistantMemoryItem, type AssistantMemoryKind, type AssistantMemoryStatus, getAssistantMemories,
  getAssistantMemoryPolicy, executeAssistantMemoryCommand, getAssistantMemoryReceipt, newClientRequestId } from '@/services/assistantApi';

export function useAssistantMemories(opts: { status?: AssistantMemoryStatus; kind?: AssistantMemoryKind; limit?: number; enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuthSessionOptional();
  const owner = user?.id;
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const ownerEpoch = useRef({ owner, value: 0 });
  if (ownerEpoch.current.owner !== owner) ownerEpoch.current = { owner, value: ownerEpoch.current.value + 1 };
  const busyRef = useRef(false);
  const [busyOwner, setBusyOwner] = useState<string | null>(null);
  const [pending, setPending] = useState<{ owner: string; command: MemoryCommand } | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  useEffect(() => {
    setPending(null); setStorageError(null); busyRef.current = false; setBusyOwner(null);
    if (!owner) return;
    try { const command = readPendingMemoryCommand(owner); if (command) setPending({ owner, command }); }
    catch { setStorageError('La commande précédente ne peut pas être relue. Vérifiez la mémoire avant une nouvelle modification.'); }
  }, [owner]);
  const query = useInfiniteQuery({
    queryKey: ['assistant-memories', owner, opts.status ?? 'visible', opts.kind ?? 'all'],
    enabled: !!owner && (opts.enabled ?? true), staleTime: 15_000,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getAssistantMemories({ status: opts.status, kind: opts.kind, limit: 100, cursor: pageParam ?? undefined }, { expectedUserId: owner }),
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
  const policy = useQuery({ queryKey: ['assistant-memory-policy', owner], enabled: !!owner && (opts.enabled ?? true),
    queryFn: () => getAssistantMemoryPolicy(owner!), staleTime: 0 });
  const { refetch: refetchMemories } = query;
  const { refetch: refetchPolicy } = policy;
  const refresh = useCallback(async () => { const [memories, permission] = await Promise.all([refetchMemories(), refetchPolicy()]); return { memories: memories.data?.pages.flatMap(page => page.items) ?? [], policy: permission.data }; }, [refetchMemories, refetchPolicy]);
  const invalidate = async (actor: string) => {
    window.dispatchEvent(new CustomEvent('assistant-memory-changed', { detail: { owner: actor } }));
    await Promise.all(['assistant-memories', 'assistant-memory-policy', 'assistant-messages', 'assistant-search', 'recommendations', 'nutrition-profile']
      .map(key => queryClient.invalidateQueries({ queryKey: [key] })));
  };
  const run = async (command: MemoryCommand): Promise<MemoryWriteResult> => {
    const actor = owner;
    const epoch = ownerEpoch.current.value;
    const current = () => ownerRef.current === actor && ownerEpoch.current.value === epoch;
    if (!actor || ownerRef.current !== actor) throw new Error('Connectez-vous pour modifier la mémoire.');
    if (busyRef.current) throw new Error('Vérification déjà en cours.');
    busyRef.current = true; setBusyOwner(actor);
    try {
      storePendingMemoryCommand(actor, command); setPending({ owner: actor, command });
      // Re-read a receipt first. If absent, replay the identical frozen envelope.
      const receipt = await getAssistantMemoryReceipt(command.command_id, actor) ?? await executeAssistantMemoryCommand(command, actor);
      if (!current()) throw new Error('Le compte a changé. Le résultat appartient au compte précédent.');
      if (receipt.status !== 'verification_required') { clearPendingMemoryCommand(actor); setPending(null); }
      await invalidate(actor);
      return receipt;
    } catch (failure) {
      if (current() && failure instanceof ApiError && [400,403,404,409,426].includes(failure.status)) {
        clearPendingMemoryCommand(actor); setPending(null); await refresh();
      }
      throw failure;
    } finally { if (current()) { busyRef.current = false; setBusyOwner(null); } }
  };
  const execute = (memory: AssistantMemoryItem, operation: Exclude<MemoryCommand['operation'],'save'>, content?: string) => {
    if (!owner || storageError) throw new Error(storageError ?? 'Connectez-vous.');
    const previous = readPendingMemoryCommand(owner);
    if (previous) {
      if (previous.memory_id !== memory.id || previous.operation !== operation || previous.payload?.content !== content)
        throw new Error('Vérifiez la commande en attente avant une autre modification.');
      return run(previous);
    }
    if (!policy.data) throw new Error('Les autorisations mémoire doivent être relues.');
    return run({ command_id: newClientRequestId(), operation, memory_id: memory.id,
      expected_version: memory.version ?? 0, expected_revision: policy.data.revision,
      expected_profile_version: policy.data.profileVersion,
      ...(operation === 'correct' ? { payload: { content: content!, kind: memory.kind, source: 'user_explicit' as const, evidence: { channel: 'manual' as const } } } : {}),
    });
  };
  const memories = query.data?.pages.flatMap(page => page.items) ?? [];
  return { owner, memories, candidates: memories.filter(m => m.status === 'candidate'), actives: memories.filter(m => m.status === 'active'),
    isLoading: query.isLoading, error: query.error, policy: policy.data, policyError: policy.error, refetch: refresh,
    hasMore: query.hasNextPage, loadMore: query.fetchNextPage, isLoadingMore: query.isFetchingNextPage,
    pendingCommand: pending && pending.owner === owner ? pending.command : null, storageError,
    execute, verifyPending: () => { if (!pending || pending.owner !== owner) throw new Error('Aucune commande à vérifier.'); return run(pending.command); },
    isBusy: busyOwner === owner, promote: (id: string) => execute(memories.find(m => m.id === id)!, 'confirm'),
    forget: (id: string) => execute(memories.find(m => m.id === id)!, 'forget'),
  };
}
