/* Synthetic HTTP contracts for visual QA only. No creator content, network or provider. */
import {
  assessImportedRecipeQuality, ImportedRecipeDraftSchema,
  type DiscoveryCreator, type DiscoveryItem, type ImportedRecipeDraft,
} from '@smart/shared';
import { data, OWNER, persistFixtureData } from './supabase';

const DATE = '2026-10-12T10:00:00.000Z';
const PREFIX = '/recipes/discovery';
const id = (group: number, n: number) => `a${group}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const photo = (asset: string) => new URL(`/scripts/fixtures/v10/assets/${asset}`, location.origin).href;
type FixtureImport = { id: string; user_id: string; source_url: string; canonical_url: string; platform: string; status: string; recipe_id: string | null; title: string; author_name: string; source_hash: string; author_handle: null; thumbnail_url: null; metadata: Record<string, never>; error_code: null; error_message: null; confidence: number; created_at: string; updated_at: string };
type FixtureDraft = { id: string; user_id: string; import_id: string; version: number; draft_json: ImportedRecipeDraft; is_current: true; source_extraction_method: string; ai_model: null; ai_input_tokens: null; ai_output_tokens: null; cost_usd_estimate: null; created_at: string };
type FixtureState = { creators: DiscoveryCreator[]; items: DiscoveryItem[]; imports: FixtureImport[]; drafts: FixtureDraft[]; receipts: Record<string, unknown>; lostReplySimulated: boolean };

function draft(n: number, incomplete = false): ImportedRecipeDraft {
  const title = n === 1 ? 'Soupe du test local' : n === 2 ? 'Gratin fictif à compléter' : 'Riz du test local — aperçu expiré';
  const sourceUrl = `https://example.invalid/recette-fictive/${n}`;
  return { title, description: 'Recette fictive pour vérifier le parcours. Aucune recette de créateur n’a été copiée.',
    ingredients: [{ name: n === 3 ? 'Riz' : 'Tomate', ...(incomplete ? {} : { quantity: 200, unit: 'g' }), rawText: incomplete ? 'Tomate : quantité absente du test' : '200 g — texte synthétique' }],
    instructions: [{ step: 1, description: 'Préparer puis cuire les ingrédients du test.' }],
    ...(incomplete ? {} : { prepTimeMinutes: 5, cookTimeMinutes: 20, servings: 2 }),
    tags: ['Test local'], confidence: 0.5, extractionWarnings: [],
    source: { platform: 'web', sourceUrl, canonicalUrl: sourceUrl, authorName: 'Auteur fictif', originalTitle: title, importedAt: DATE, extractionMethod: 'manual_text' },
  };
}
function initialState(): FixtureState {
  const creators: DiscoveryCreator[] = ['LouLouKitchen', 'Olivier Lin', 'Andy Cooks'].map((name, i) => ({
    id: id(1, i + 1), userId: OWNER, name, paused: false, version: 1,
    sources: [{ id: id(2, i + 1), platform: 'web', url: `https://example.invalid/createur-fictif/${i + 1}`, accessMode: 'manual', identityStatus: 'unverified', lastSuccessAt: null, lastError: null }],
  }));
  const items: DiscoveryItem[] = creators.map((creator, i) => {
    const value = draft(i + 1, i === 1);
    return { id: id(3, i + 1), userId: OWNER, creatorId: creator.id, sourceUrl: value.source.sourceUrl!, title: value.title,
      description: value.description ?? null, imageUrl: photo(i === 2 ? 'image-expiree-fictive.jpg' : i === 1 ? 'pain.svg' : 'soupe.svg'),
      createdAt: DATE, publishedAt: null, version: 1, status: 'new', quality: assessImportedRecipeQuality(value), draft: value,
      importId: null, recipeReference: null, snoozedUntil: null, reasons: ['Donnée fictive du contrôle local.'], constraints: 'unknown', lastFeedback: null };
  });
  return { creators, items, imports: [], drafts: [], receipts: {}, lostReplySimulated: false };
}
let state: FixtureState;
try { state = JSON.parse(localStorage.getItem('v10-discovery-fixture') ?? 'null') ?? initialState(); }
catch { state = initialState(); }
const persist = () => localStorage.setItem('v10-discovery-fixture', JSON.stringify(state));
const copy = <T,>(value: T): T => structuredClone(value);
function error(message: string, status: number, code: string): never {
  throw Object.assign(new Error(message), { status, code });
}
const itemById = (itemId: string) => state.items.find(item => item.id === itemId) ?? error('Lien fictif absent.', 404, 'NOT_FOUND');
function checkVersion(item: { version: number }, expected: unknown) {
  if (item.version !== expected) error('La version fictive a changé. Relis la sélection.', 409, 'VERSION_CONFLICT');
}
export function isDiscoveryFixturePath(path: string) {
  return path.startsWith(PREFIX) || /^\/imports\/social\/a4000000-/.test(path);
}

export async function discoveryFixtureRequest(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<unknown> {
  const request = (body ?? {}) as Record<string, unknown>;
  const command = typeof request.commandId === 'string' ? request.commandId : undefined;
  if (command && state.receipts[command]) return copy(state.receipts[command]);
  const reply = (result: unknown) => { if (command) state.receipts[command] = copy(result); persist(); return copy(result); };
  if (method === 'GET' && path === PREFIX) return copy({
    items: state.items.filter(item => item.status === 'new' && !state.creators.find(creator => creator.id === item.creatorId)?.paused).slice(0, 5),
    savedItems: state.items.filter(item => item.status === 'kept' || item.status === 'added'), selectionAt: DATE, mode: 'manual', limit: 5, errors: [],
  });
  if (method === 'GET' && path === `${PREFIX}/creators`) return copy({ creators: state.creators });
  if (method === 'GET' && path === `${PREFIX}/links`) return { links: state.creators.map((creator, i) => ({ creatorId: creator.id, title: `Marque-page fictif ${i + 1}`, sourceUrl: `https://example.invalid/marque-page/${i + 1}` })) };
  const creatorId = path.match(/\/creators\/([^/]+)$/)?.[1];
  if (method === 'PATCH' && creatorId) {
    const creator = state.creators.find(row => row.id === creatorId) ?? error('Créateur fictif absent.', 404, 'NOT_FOUND');
    checkVersion(creator, request.expectedVersion); creator.paused = request.paused === true; creator.version++;
    return reply({ creator });
  }
  if (method === 'POST' && path === `${PREFIX}/items`) {
    const value = draft(1);
    value.title = String(request.title || 'Inspiration fictive à compléter'); value.description = 'Lien ajouté par le contrôle local, sans extraction réelle.';
    value.ingredients = []; value.instructions = [];
    delete value.prepTimeMinutes; delete value.cookTimeMinutes; delete value.servings;
    value.source = { ...value.source, sourceUrl: String(request.sourceUrl), canonicalUrl: String(request.sourceUrl), originalTitle: value.title, extractionMethod: 'metadata' };
    const item: DiscoveryItem = { ...state.items[0], id: crypto.randomUUID(), creatorId: String(request.creatorId), sourceUrl: String(request.sourceUrl), title: value.title, description: value.description, imageUrl: null,
      version: 1, status: 'new', draft: value, quality: assessImportedRecipeQuality(value), importId: null, recipeReference: null, lastFeedback: null };
    state.items.unshift(item); return reply({ item });
  }
  const action = path.match(/\/items\/([^/]+)\/(decision|prepare-import|feedback)$/);
  if (method === 'POST' && action) {
    const item = itemById(action[1]); checkVersion(item, request.expectedVersion);
    if (action[2] === 'decision') {
      item.status = request.decision === 'keep' ? 'kept' : request.decision === 'pass' ? 'passed' : 'snoozed'; item.version++;
      if (item.status === 'snoozed') item.snoozedUntil = '2026-10-13T10:00:00.000Z';
      return reply({ item });
    }
    if (action[2] === 'feedback') {
      if (request.cooked !== true || !item.recipeReference) error('Confirme la cuisine du test avant ton avis.', 422, 'COOKED_CONFIRMATION_REQUIRED');
      item.lastFeedback = request.feedback as DiscoveryItem['lastFeedback']; item.version++;
      return reply({ item });
    }
    let imported = state.imports.find(row => row.id === item.importId);
    let row = state.drafts.find(value => value.import_id === item.importId);
    if (!imported || !row) {
      const n = state.imports.length + 1;
      imported = { id: id(4, n), user_id: OWNER, source_url: item.sourceUrl, canonical_url: item.sourceUrl, platform: 'web', status: 'draft_ready', recipe_id: null, title: item.title, author_name: 'Auteur fictif', source_hash: `fixture-${n}`, author_handle: null, thumbnail_url: null, metadata: {}, error_code: null, error_message: null, confidence: 0.5, created_at: DATE, updated_at: DATE };
      row = { id: id(5, n), user_id: OWNER, import_id: imported.id, version: 3, draft_json: copy(item.draft!), is_current: true, source_extraction_method: item.draft!.source.extractionMethod, ai_model: null, ai_input_tokens: null, ai_output_tokens: null, cost_usd_estimate: null, created_at: DATE };
      state.imports.push(imported); state.drafts.push(row); item.importId = imported.id;
    }
    return reply({ item, import: imported, draft: row, quality: assessImportedRecipeQuality(row.draft_json) });
  }
  const importedId = path.match(/^\/imports\/social\/([^/]+)(?:\/(current-draft|review|save))?$/);
  if (importedId) {
    const imported = state.imports.find(row => row.id === importedId[1]) ?? error('Import fictif absent.', 404, 'NOT_FOUND');
    const row = state.drafts.find(value => value.import_id === imported.id)!;
    if (method === 'GET' && !importedId[2]) return copy(imported);
    if (method === 'GET' && importedId[2] === 'current-draft') return copy({ import: imported, draft: row, quality: assessImportedRecipeQuality(row.draft_json), adaptations: [] });
    if (method === 'POST' && importedId[2] === 'save' && imported.recipe_id) return reply({ import: imported, recipe_id: imported.recipe_id, reconciled: true });
    if (method === 'POST' && (importedId[2] === 'review' || importedId[2] === 'save')) {
      if (request.expected_revision !== row.version) error('Révision fictive périmée.', 409, 'REVISION_CONFLICT');
      const value = ImportedRecipeDraftSchema.parse(request.draft);
      value.source = copy(row.draft_json.source);
      const quality = assessImportedRecipeQuality(value, { sourceReviewed: request.source_reviewed === true });
      if (importedId[2] === 'review') return copy({ draft: value, revision: row.version, quality, adaptations: [] });
      if (!quality.can_save || request.source_reviewed !== true) error('Vérifie les champs et la source du test.', 422, 'SOURCE_REVIEW_REQUIRED');
      if (quality.requires_acknowledgement && request.acknowledge_unknowns !== true) error('Confirme les champs inconnus du test.', 422, 'UNKNOWN_FIELDS_REVIEW_REQUIRED');
      const recipeId = crypto.randomUUID();
      data.recipes.push({ id: recipeId, user_id: OWNER, name: value.title, description: value.description ?? null, instructions: value.instructions.map(step => step.description).join('\n'),
        servings: value.servings ?? null, prep_time: value.prepTimeMinutes ?? null, cook_time: value.cookTimeMinutes ?? null, rest_time: value.restTimeMinutes ?? null, image_url: value.imageUrl ?? null,
        tags: value.tags, difficulty: null, source_url: value.source.sourceUrl, created_at: DATE, updated_at: DATE, is_public: false });
      data.recipe_ingredients.push(...value.ingredients.map((ingredient, index) => ({ id: crypto.randomUUID(), recipe_id: recipeId, ingredient_name: ingredient.name, quantity: ingredient.quantity ?? null, unit: ingredient.unit ?? null, inventory_product_id: null, is_essential: ingredient.isEssential !== false, order_index: index })));
      imported.status = 'saved'; imported.recipe_id = recipeId; row.draft_json = value;
      const item = state.items.find(item => item.importId === imported.id)!; item.status = 'added'; item.recipeReference = { id: recipeId, source: 'recipes' }; item.draft = value; item.title = value.title; item.description = value.description ?? null; item.quality = quality; item.version++;
      persistFixtureData(); persist();
      if (new URLSearchParams(location.search).get('discoveryLostReply') === '1' && !state.lostReplySimulated) {
        state.lostReplySimulated = true; persist(); error('Réponse fictive perdue après ajout. Vérifie l’ajout conservé.', 503, 'FIXTURE_REPLY_LOST');
      }
      return reply({ import: imported, recipe_id: recipeId, reconciled: false, quality });
    }
  }
  return error('Contrat absent du contrôle Découvrir.', 503, 'FIXTURE_ROUTE_ABSENT');
}
