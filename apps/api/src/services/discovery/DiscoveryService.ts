import type { SupabaseClient } from '@supabase/supabase-js';
import { assessImportedRecipeQuality, DiscoveryCreatorSchema, DiscoveryItemSchema, ImportedRecipeDraftSchema,
  type DiscoveryCreator, type DiscoveryFeed, type DiscoveryItem, type DiscoveryPrepareImportResponse,
  type ImportedRecipeDraft, type NutritionProfileSettings } from '@smart/shared';
import { canonicalizeUrl } from '../imports/canonicalUrl.js';
import { computeSourceHash } from '../imports/sourceHash.js';
import { NutritionProfileService } from '../recommendations/NutritionProfileService.js';
import { chooseDiscoveryItems, discoveryContentEvidence, discoverySelectionKey } from './DiscoverySelection.js';
import { STARTER_LINKS } from './StarterLinks.js';

export class DiscoveryError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}
export function discoveryDatabaseError(error: { code?: string; message?: string }): never {
  const codes = ['IDEMPOTENCY_CONFLICT', 'VERSION_CONFLICT', 'SELECTION_WINDOW_CHANGED', 'CREATOR_NOT_FOUND', 'ITEM_NOT_FOUND',
    'KEEP_REQUIRED', 'RECIPE_REQUIRED', 'COOKING_REQUIRED', 'QUOTA_EXCEEDED', 'ALREADY_ADDED', 'CREATOR_LIMIT', 'ITEM_LIMIT', 'INVALID_COMMAND', 'INVALID_URL', 'UNAUTHORIZED'];
  const code = codes.find(value => error.message?.includes(value));
  if (code) throw new DiscoveryError(code, code.includes('CONFLICT') || code === 'SELECTION_WINDOW_CHANGED' ? 409 :
    code.endsWith('NOT_FOUND') ? 404 : code === 'QUOTA_EXCEEDED' ? 402 : code === 'UNAUTHORIZED' ? 401 : 422);
  throw new DiscoveryError(['42P01', '42703', 'PGRST202', 'PGRST204'].includes(error.code ?? '') ? 'MIGRATION_REQUIRED' : 'DISCOVERY_UNAVAILABLE', 503);
}
type Row = Record<string, unknown> & {
  id: string; user_id: string; import_id?: string | null; recipe_id?: string | null; kind?: string;
  metadata?: { review_quality?: { can_save?: boolean } } | null;
};
type Query = ReturnType<ReturnType<SupabaseClient['from']>['select']>;
const iso = (date: unknown) => new Date(String(date)).toISOString();
const resultId = (result: Record<string, unknown>, key: 'item_id' | 'import_id' | 'creator_id'): string => {
  const value = result[key];
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new DiscoveryError('INVALID_DISCOVERY_RECEIPT', 503);
  }
  return value;
};

export function validateDiscoveryUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new DiscoveryError('INVALID_URL', 400); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
    url.hostname === 'localhost' || url.hostname.endsWith('.local') || url.hostname.endsWith('.localhost') ||
    !url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) {
    throw new DiscoveryError('INVALID_URL', 400);
  }
  // This path stores a link only. It never performs a server request or renders embedded HTML.
  return url.href;
}

export class DiscoveryService {
  constructor(private readonly client: SupabaseClient, private readonly owner: string, private readonly now = () => new Date()) {}
  private async rows(table: string, query?: (builder: Query) => Query): Promise<Row[]> {
    const rows: Row[] = [];
    for (let start = 0; start <= 2000; start += 200) {
      let builder = this.client.from(table).select('*').eq('user_id', this.owner);
      if (query) builder = query(builder);
      const { data, error } = await builder.order('id', { ascending: true }).range(start, start + 199);
      if (error) discoveryDatabaseError(error);
      if (!Array.isArray(data) || data.some(row => row.user_id !== this.owner || typeof row.id !== 'string')) throw new DiscoveryError('DISCOVERY_UNAVAILABLE', 503);
      rows.push(...data);
      if (data.length < 200) return rows;
    }
    throw new DiscoveryError('DISCOVERY_LIMIT_EXCEEDED', 503);
  }
  private async related(table: string, column: string, ids: string[], query?: (builder: Query) => Query): Promise<Row[]> {
    const rows: Row[] = [];
    const unique = [...new Set(ids)];
    // Small requests fit the REST/proxy URL limits. Pagination remains bounded.
    for (let start = 0; start < unique.length; start += 50) {
      rows.push(...await this.rows(table, builder => {
        const filtered = builder.in(column, unique.slice(start, start + 50));
        return query ? query(filtered) : filtered;
      }));
    }
    return rows;
  }
  async command(op: string, payload: Record<string, unknown>, commandId?: string): Promise<Record<string, unknown>> {
    const { data, error } = await this.client.rpc('execute_recipe_discovery', { p_command: { op, payload, ...(commandId ? { commandId } : {}) } });
    if (error) discoveryDatabaseError(error);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new DiscoveryError('DISCOVERY_UNAVAILABLE', 503);
    return data;
  }
  async ensureCreators() { await this.command('seed', {}); }
  async creators(): Promise<DiscoveryCreator[]> {
    await this.ensureCreators();
    const [creators, sources] = await Promise.all([this.rows('recipe_discovery_creators'), this.rows('recipe_discovery_sources')]);
    return creators.map(row => DiscoveryCreatorSchema.parse({
      id: row.id, userId: row.user_id, name: row.name, paused: row.paused, version: row.version,
      sources: sources.filter(source => source.creator_id === row.id).map(source => ({
        id: source.id, platform: source.platform, url: source.url, accessMode: source.access_mode,
        identityStatus: source.identity_status, lastSuccessAt: source.last_success_at ? iso(source.last_success_at) : null,
        lastError: source.last_error,
      })),
    }));
  }
  async starterLinks() {
    await this.ensureCreators();
    const creators = await this.rows('recipe_discovery_creators');
    return STARTER_LINKS.flatMap(link => {
      const creator = creators.find(row => row.seed_key === link.creatorKey);
      return creator ? [{ creatorId: creator.id, title: link.title, sourceUrl: link.url }] : [];
    });
  }
  private async profile(): Promise<{ settings: NutritionProfileSettings | null; error?: string }> {
    try { return { settings: (await new NutritionProfileService(this.client).read(this.owner)).profile.settings }; }
    catch { return { settings: null, error: 'Votre profil n’a pas pu être vérifié. Aucune compatibilité n’est annoncée.' }; }
  }
  private async allItems(id?: string): Promise<{ items: DiscoveryItem[]; errors: string[] }> {
    const rawItems = await this.rows('recipe_discovery_items', q => id ? q.eq('id', id) : q.order('created_at', { ascending: false }));
    if (!rawItems.length) return { items: [], errors: [] };
    const importIds = rawItems.flatMap(row => row.import_id ? [row.import_id] : []);
    const [imports, drafts, events, profile] = await Promise.all([
      this.related('social_recipe_imports', 'id', importIds),
      this.related('imported_recipe_drafts', 'import_id', importIds, q => q.eq('is_current', true)),
      this.related('recipe_discovery_latest_feedback', 'item_id', rawItems.map(row => row.id)),
      this.profile(),
    ]);
    const items = rawItems.map(row => {
      const imported = imports.find(candidate => candidate.id === row.import_id);
      const stored = drafts.find(candidate => candidate.import_id === row.import_id);
      const parsed = ImportedRecipeDraftSchema.safeParse(stored?.draft_json);
      if (stored && !parsed.success) throw new DiscoveryError('INVALID_DISCOVERY_DRAFT', 503);
      const draft = parsed.success ? parsed.data : null;
      const evidence = discoveryContentEvidence(draft, profile.settings);
      const quality = draft ? assessImportedRecipeQuality(draft, {
        sourceReviewed: imported?.metadata?.review_quality?.can_save === true,
      }) : { state: 'inspiration' as const, unknowns: [{ path: 'ingredients', label: 'Ingrédients et étapes à compléter' }],
        metadata_only: true, can_save: false, requires_acknowledgement: false };
      const feedback = events.find(event => event.item_id === row.id && typeof event.kind === 'string' && ['repeat', 'dislike', 'too_long'].includes(event.kind));
      return DiscoveryItemSchema.parse({
        id: row.id, userId: row.user_id, creatorId: row.creator_id, sourceUrl: row.source_url, title: draft?.title ?? row.title,
        description: draft?.description ?? row.description, imageUrl: null, // No image reuse right has been established for starter sources.
        createdAt: iso(row.created_at), publishedAt: row.published_at ? iso(row.published_at) : null,
        version: row.version, status: imported?.recipe_id ? 'added' : row.status, quality, draft,
        importId: row.import_id, recipeReference: imported?.recipe_id ? { id: imported.recipe_id, source: 'recipes' } : null,
        snoozedUntil: row.snoozed_until ? iso(row.snoozed_until) : null,
        constraints: evidence.constraints, reasons: evidence.reasons, lastFeedback: feedback?.kind ?? null,
      });
    });
    return { items, errors: profile.error ? [profile.error] : [] };
  }
  async item(id: string): Promise<DiscoveryItem> {
    const { items } = await this.allItems(id);
    const item = items.find(row => row.id === id);
    if (!item) throw new DiscoveryError('ITEM_NOT_FOUND', 404);
    return item;
  }
  async feed(): Promise<DiscoveryFeed> {
    const creators = await this.creators();
    const { items, errors } = await this.allItems();
    const paused = new Set(creators.filter(creator => creator.paused).map(creator => creator.id));
    const selected = chooseDiscoveryItems(items, paused, this.now());
    const batch = await this.command('selection', { key: discoverySelectionKey(this.now()), itemIds: selected.map(item => item.id) });
    if (!Array.isArray(batch.item_ids) || batch.item_ids.length > 5 || batch.item_ids.some(id => typeof id !== 'string')) {
      throw new DiscoveryError('INVALID_DISCOVERY_RECEIPT', 503);
    }
    const chosen = (batch.item_ids as string[]).flatMap(id => {
      const item = items.find(candidate => candidate.id === id);
      return item ? [item] : [];
    });
    return {
      items: chosen.filter(item => !paused.has(item.creatorId) && item.constraints !== 'incompatible' &&
        (item.status === 'new' || (item.status === 'snoozed' && !!item.snoozedUntil && new Date(item.snoozedUntil) <= this.now()))),
      // Kept/added proposals remain accessible even if the source is paused.
      savedItems: items.filter(item => ['kept', 'added'].includes(item.status)),
      selectionAt: batch.selected_at ? iso(batch.selected_at) : null, mode: 'manual', limit: 5, errors,
    };
  }
  async capture(input: { creatorId: string; sourceUrl: string; title?: string; description?: string; commandId: string }) {
    const sourceUrl = validateDiscoveryUrl(input.sourceUrl);
    const canonicalUrl = canonicalizeUrl(sourceUrl);
    const { commandId, ...payload } = input;
    const result = await this.command('capture', { ...payload, sourceUrl, canonicalUrl, sourceHash: computeSourceHash(canonicalUrl) }, commandId);
    return { item: await this.item(resultId(result, 'item_id')), duplicate: result.duplicate === true, replayed: result.replayed === true };
  }
  async decide(itemId: string, input: { commandId: string; expectedVersion: number; decision: string }) {
    const { commandId, ...payload } = input;
    const result = await this.command('decision', { ...payload, itemId }, commandId);
    return { item: await this.item(resultId(result, 'item_id')), replayed: result.replayed === true };
  }
  async feedback(itemId: string, input: { commandId: string; expectedVersion: number; feedback: string; cooked: true }) {
    const { commandId, ...payload } = input;
    const result = await this.command('feedback', { ...payload, itemId }, commandId);
    return { item: await this.item(resultId(result, 'item_id')), replayed: result.replayed === true };
  }
  async prepareImport(itemId: string, input: { commandId: string; expectedVersion: number }): Promise<DiscoveryPrepareImportResponse> {
    const result = await this.command('prepare_import', { itemId, expectedVersion: input.expectedVersion }, input.commandId);
    const item = await this.item(resultId(result, 'item_id'));
    const importId = resultId(result, 'import_id');
    const [imports, drafts] = await Promise.all([
      this.rows('social_recipe_imports', q => q.eq('id', importId)),
      this.rows('imported_recipe_drafts', q => q.eq('import_id', importId).eq('is_current', true)),
    ]);
    if (imports.length !== 1 || drafts.length !== 1) throw new DiscoveryError('DISCOVERY_UNAVAILABLE', 503);
    const draft = ImportedRecipeDraftSchema.parse(drafts[0].draft_json);
    return { item, import: imports[0] as DiscoveryPrepareImportResponse['import'],
      draft: drafts[0] as DiscoveryPrepareImportResponse['draft'], quality: assessImportedRecipeQuality(draft), replayed: result.replayed === true };
  }
  async createCreator(input: { name: string; url: string; commandId: string }) {
    const result = await this.command('create_creator', { name: input.name, url: validateDiscoveryUrl(input.url) }, input.commandId);
    const id = resultId(result, 'creator_id');
    const creator = (await this.creators()).find(row => row.id === id);
    if (!creator) throw new DiscoveryError('INVALID_DISCOVERY_RECEIPT', 503);
    return { creator };
  }
  async pauseCreator(creatorId: string, input: { paused: boolean; expectedVersion: number; commandId: string }) {
    const result = await this.command('pause_creator', { creatorId, paused: input.paused, expectedVersion: input.expectedVersion }, input.commandId);
    const id = resultId(result, 'creator_id');
    const creator = (await this.creators()).find(row => row.id === id);
    if (!creator) throw new DiscoveryError('INVALID_DISCOVERY_RECEIPT', 503);
    return { creator, replayed: result.replayed === true };
  }
}
