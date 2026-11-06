import {
  DiscoveryCreatorSchema, DiscoveryFeedSchema, DiscoveryItemSchema, ImportedRecipeDraftSchema,
  type DiscoveryCreator, type DiscoveryFeed, type DiscoveryItem, type DiscoveryPrepareImportResponse,
  type DiscoveryStarterLink,
} from '@smart/shared';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import { readOwnedValue, removeOwnedValue, writeOwnedValue } from '@/lib/ownedStorage';
import { safeRecipeSourceUrl } from '@/lib/recipeLinks';

const BASE = '/recipes/discovery';
export type DiscoveryDecision = 'keep' | 'pass' | 'not_today';
export type DiscoveryFeedback = 'repeat' | 'dislike' | 'too_long';
export interface DiscoveryCaptureInput { creatorId: string; sourceUrl: string; title?: string; description?: string }
export type { DiscoveryStarterLink } from '@smart/shared';
type PendingDiscoveryWrite = {
  kind: 'decision' | 'feedback' | 'capture'; targetId: string; body: Record<string, unknown>;
};
const PENDING = 'discovery-write';

export function pendingDiscoveryWrite(owner: string): PendingDiscoveryWrite | null {
  const saved = readOwnedValue<unknown>(owner, PENDING, null);
  if (saved == null) return null;
  if (!saved || typeof saved !== 'object' || !('kind' in saved) || !('targetId' in saved) || !('body' in saved)) {
    throw new Error('Une action de découverte conservée est illisible. Aucune autre action n’a été envoyée.');
  }
  const row = saved as PendingDiscoveryWrite;
  if (!['decision', 'feedback', 'capture'].includes(row.kind) || typeof row.targetId !== 'string' ||
    !row.body || typeof row.body !== 'object' || typeof row.body.commandId !== 'string') {
    throw new Error('Une action de découverte conservée doit être vérifiée.');
  }
  return row;
}

function owned<T extends { userId: string }>(row: T, owner: string): T {
  if (row.userId !== owner) throw new ApiError('La réponse appartient à un autre compte. Recharge la découverte.', { status: 503, code: 'INVALID_DISCOVERY_OWNER' });
  return row;
}

export async function replayDiscoveryWrite(owner: string, signal?: AbortSignal): Promise<{ item: DiscoveryItem; replayed?: boolean } | { item: DiscoveryItem; duplicate: boolean }> {
  const pending = pendingDiscoveryWrite(owner);
  if (!pending) throw new Error('Aucune action de découverte en attente.');
  const path = pending.kind === 'capture' ? '/items' : `/items/${encodeURIComponent(pending.targetId)}/${pending.kind}`;
  try {
    const result = await apiPost<{ item: DiscoveryItem; replayed?: boolean; duplicate: boolean }>(BASE + path, pending.body, { expectedUserId: owner, signal });
    const item = owned(DiscoveryItemSchema.parse(result.item), owner);
    if (pending.kind !== 'capture' && item.id !== pending.targetId) throw new ApiError('La réponse doit être vérifiée pour le lien choisi.', { status: 503, code: 'INVALID_DISCOVERY_ITEM' });
    removeOwnedValue(owner, PENDING);
    return result;
  } catch (error) {
    // A complete domain rejection has no effect. Auth/lost responses keep the exact command.
    if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 &&
      !['IDEMPOTENCY_CONFLICT', 'COMMAND_CONFLICT'].includes(error.code ?? '')) removeOwnedValue(owner, PENDING);
    throw error;
  }
}

async function command(owner: string, kind: PendingDiscoveryWrite['kind'], targetId: string, body: Record<string, unknown>, signal?: AbortSignal) {
  const pending = pendingDiscoveryWrite(owner);
  if (pending) throw new ApiError('Une action précédente reste à vérifier. Reprends-la avant un nouveau choix.', { status: 409, code: 'DISCOVERY_PENDING' });
  writeOwnedValue(owner, PENDING, { kind, targetId, body: { ...body, commandId: crypto.randomUUID() } });
  return replayDiscoveryWrite(owner, signal);
}

export const discoveryApi = {
  links(owner: string, signal?: AbortSignal) {
    return apiGet<{ links: DiscoveryStarterLink[] }>(`${BASE}/links`, undefined, { expectedUserId: owner, signal });
  },
  async feed(owner: string, signal?: AbortSignal): Promise<DiscoveryFeed> {
    const result = DiscoveryFeedSchema.parse(await apiGet<unknown>(BASE, undefined, { expectedUserId: owner, signal }));
    result.items.forEach(item => owned(item, owner));
    result.savedItems.forEach(item => owned(item, owner));
    return result;
  },
  async creators(owner: string, signal?: AbortSignal): Promise<{ creators: DiscoveryCreator[] }> {
    const result = await apiGet<{ creators: DiscoveryCreator[] }>(`${BASE}/creators`, undefined, { expectedUserId: owner, signal });
    return { creators: result.creators.map(creator => owned(DiscoveryCreatorSchema.parse(creator), owner)) };
  },
  async pauseCreator(owner: string, creator: DiscoveryCreator, paused: boolean, signal?: AbortSignal): Promise<{ creator: DiscoveryCreator }> {
    const result = await apiPatch<{ creator: DiscoveryCreator }>(`${BASE}/creators/${encodeURIComponent(creator.id)}`, {
      paused, expectedVersion: creator.version, commandId: crypto.randomUUID(),
    }, { expectedUserId: owner, signal });
    owned(DiscoveryCreatorSchema.parse(result.creator), owner);
    return result;
  },
  capture(owner: string, input: DiscoveryCaptureInput, signal?: AbortSignal) {
    return command(owner, 'capture', input.creatorId, input as unknown as Record<string, unknown>, signal);
  },
  decide(owner: string, item: DiscoveryItem, decision: DiscoveryDecision, signal?: AbortSignal) {
    return command(owner, 'decision', item.id, { expectedVersion: item.version, decision }, signal);
  },
  async prepareImport(owner: string, input: { itemId: string; commandId: string; expectedVersion: number }, signal?: AbortSignal): Promise<DiscoveryPrepareImportResponse> {
    const result = await apiPost<DiscoveryPrepareImportResponse>(`${BASE}/items/${encodeURIComponent(input.itemId)}/prepare-import`, {
      commandId: input.commandId, expectedVersion: input.expectedVersion,
    }, { expectedUserId: owner, signal });
    const item = owned(DiscoveryItemSchema.parse(result.item), owner);
    ImportedRecipeDraftSchema.parse(result.draft.draft_json);
    if (item.id !== input.itemId || item.importId !== result.import.id || result.import.user_id !== owner || result.draft.user_id !== owner || result.draft.import_id !== result.import.id) {
      throw new ApiError('Le brouillon reçu ne correspond pas à ce compte et à cet import.', { status: 503, code: 'INVALID_DISCOVERY_IMPORT' });
    }
    return result;
  },
  feedback(owner: string, item: DiscoveryItem, feedback: DiscoveryFeedback, signal?: AbortSignal) {
    return command(owner, 'feedback', item.id, { expectedVersion: item.version, feedback, cooked: true }, signal);
  },
};

export function safeDiscoverySourceUrl(value: string): string | null {
  return safeRecipeSourceUrl(value);
}
