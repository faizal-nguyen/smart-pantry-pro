import type { SupabaseClient } from '@supabase/supabase-js';
import { emptyNutritionProfile, WeekProposalSchema, type WeekProposalRequest } from '@smart/shared';
import { RecommendationEngine } from '../../recommendations/RecommendationEngine.js';
import type { RecommendationContext } from '../../recommendations/types.js';
import { WeekPlanService } from '../WeekPlanService.js';

// V11-01 E4a: a week proposed from the engine, without any write (PRP V11-01 §6).
const USER = '00000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-11-30T09:00:00Z');
const WEEK = '2026-11-30';

const basis = { week_start: WEEK, as_of: '2026-11-30', menu_version: 'a'.repeat(32), context_revision: 7, meals: [] as unknown[] };
/** A resolved recipe needing `grams` of flour (product p). */
const resolved = (id: string, grams = 0) => ({ id, source: 'recipes', canonicalId: id, name: `Recette ${id}`, servings: 2, version: 'v',
  ingredients: grams ? [{ ingredient_name: 'farine', quantity: grams, unit: 'g', inventory_product_id: 'p', is_essential: true }] : [] });

interface Week { entries?: unknown[]; lots?: unknown[]; asOf?: string; recipes?: Record<string, ReturnType<typeof resolved>> }
function client({ entries = [], lots = [], asOf = '2026-11-30', recipes = {} }: Week = {}) {
  const rows: Record<string, unknown[]> = { inventory: lots, weekly_meal_plans: entries.length ? [{ id: 'plan', meal_plan_entries: entries }] : [] };
  const writes: string[] = [];
  const from = jest.fn((table: string) => {
    const query = {
      select: () => query, order: () => query, eq: () => query, range: () => query, limit: () => query,
      insert: () => { writes.push(table); return query; }, update: () => { writes.push(table); return query; },
      upsert: () => { writes.push(table); return query; }, delete: () => { writes.push(table); return query; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows[table] ?? [], error: null, count: (rows[table] ?? []).length }).then(resolve),
    };
    return query;
  });
  const rpc = jest.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'menu_shopping_basis') return { data: { ...basis, as_of: asOf }, error: null };
    if (name === 'resolve_stock_recipe') {
      const recipe = recipes[String(args.p_recipe_id)] ?? resolved(String(args.p_recipe_id));
      return { data: recipe, error: null };
    }
    writes.push(name);
    return { data: null, error: null };
  });
  return { supabase: { from, rpc } as unknown as SupabaseClient, rpc, writes };
}

const candidate = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: `Recette ${id}`, reference: { id, source: 'recipes' }, image_url: null, servings: 2, duration_minutes: 30,
  reason_codes: [{ code: 'TIME_FITS', text: 'Prête en 30 min.' }, { code: 'STOCK_AVAILABLE', text: 'Tout est en stock.' }],
  expiring_ingredients_used: [], ...extra,
});
type Buckets = Partial<Record<'cookable_now' | 'almost_cookable' | 'recent_suggestions' | 'verify_suggestions' | 'excluded_suggestions', unknown[]>>;
const result = (buckets: Buckets, profile_version = 3) => ({ cookable_now: [], almost_cookable: [], recent_suggestions: [], verify_suggestions: [],
  excluded_suggestions: [], total_user_recipes: 10, pipeline_version: 3, profile_version, calculated_at: NOW.toISOString(), has_constraints: false, ...buckets });
/** The engine answers by meal type. */
function engine(byMeal: Record<string, Buckets>, profileVersion = 3) {
  return jest.spyOn(RecommendationEngine.prototype, 'suggestForUser')
    .mockImplementation(async (_ctx, input: RecommendationContext) => result(byMeal[input.mealType ?? 'dinner'] ?? {}, profileVersion) as never);
}
const slot = (date: string, meal_type = 'dinner') => ({ date, meal_type }) as WeekProposalRequest['slots'][number];
const ask = (slots: WeekProposalRequest['slots'], extra: Partial<WeekProposalRequest> = {}): WeekProposalRequest => ({ week_start: WEEK, slots, ...extra });
const propose = (mocked: ReturnType<typeof client>, request: WeekProposalRequest) =>
  new WeekPlanService(mocked.supabase, { now: () => NOW }).propose(USER, request);
const picked = (proposal: Awaited<ReturnType<typeof propose>>) => proposal.slots.map(item => item.status === 'empty' ? `${item.date}:${item.cause}` : `${item.date}:${item.recipe.reference.id}`);

afterEach(() => jest.restoreAllMocks());

test('the engine is read once per meal type, without any writer, 20 per bucket, the week’s recipes left out', async () => {
  const spy = engine({ dinner: { cookable_now: [candidate('a'), candidate('b')] }, lunch: { cookable_now: [candidate('c')] } });
  const mocked = client({ entries: [
    { id: 'm1', version: 1, day_of_week: 0, meal_type: 'dinner', recipe_reference: { id: 'planned', source: 'recipes' }, recipe_id: null, cooked_command_id: null, leftover_of: null },
    { id: 'm2', version: 0, day_of_week: 0, meal_type: 'lunch', recipe_reference: null, recipe_id: 'older', cooked_command_id: 'cooked', leftover_of: null },
  ] });
  await propose(mocked, ask([slot('2026-12-01'), slot('2026-12-02'), slot('2026-12-03', 'lunch')], {
    keep: [{ date: '2026-12-04', meal_type: 'dinner', recipe: { id: 'kept', source: 'recipes' }, servings: 2 }], avoid: [{ id: 'avoided', source: 'auto' }],
    servings: 4, constraints: { timeLimitMinutes: 40, excludedIngredients: ['poisson'] },
  }));
  expect(spy).toHaveBeenCalledTimes(2);
  for (const [ctx, input] of spy.mock.calls) {
    expect(ctx).toEqual(expect.objectContaining({ userId: USER, now: NOW }));
    expect(ctx.eventWriter).toBeUndefined();
    expect(input).toEqual(expect.objectContaining({ limitPerBucket: 20, servings: 4, timeLimitMinutes: 40, excludedIngredients: ['poisson'] }));
    expect(input.excludeRecipeIds).toEqual(expect.arrayContaining(['planned', 'older', 'kept', 'avoided']));
  }
  expect(spy.mock.calls.map(([, input]) => input.mealType).sort()).toEqual(['dinner', 'lunch']);
  // Nothing is written: no event, no cache, no command.
  expect(mocked.writes).toEqual([]);
});

test('never a recipe to verify or excluded, never twice the same; the closer lists first, the farther last', async () => {
  engine({
    dinner: { cookable_now: [candidate('a')], almost_cookable: [candidate('b')], recent_suggestions: [candidate('c')],
      verify_suggestions: [candidate('v')], excluded_suggestions: [candidate('x')] },
    lunch: { cookable_now: [candidate('a'), candidate('d')] },
  });
  const proposal = await propose(client(), ask([slot('2026-12-01'), slot('2026-12-02'), slot('2026-12-03'), slot('2026-12-05', 'lunch')]));
  expect(picked(proposal)).toEqual(['2026-12-01:a', '2026-12-02:b', '2026-12-03:c', '2026-12-05:d']);
});

test('a recipe using a lot close to its date is placed earlier in the week', async () => {
  engine({ dinner: { cookable_now: [candidate('a'), candidate('b', { expiring_ingredients_used: [{ product_id: 'p', product_name: 'Courgettes', days_to_expiry: 2 }] })] } });
  const proposal = await propose(client(), ask([slot('2026-12-01'), slot('2026-12-02')]));
  expect(picked(proposal)).toEqual(['2026-12-01:b', '2026-12-02:a']);
});

test('stock is judged again for the week: a lot promised to an earlier meal is no longer in stock for a later one', async () => {
  engine({ dinner: { cookable_now: [candidate('a'), candidate('b')] } });
  const lots = [{ id: 'l1', product_id: 'p', quantity: 300, unit: 'g', stock_version: 1, expiry_date: null, date_kind: 'unknown', quantity_quality: 'measured', location: null, notes: null, product: { name: 'farine', unit_type: 'g' } }];
  const proposal = await propose(client({ lots, recipes: { a: resolved('a', 200), b: resolved('b', 200) } }), ask([slot('2026-12-01'), slot('2026-12-02')]));
  const [first, second] = proposal.slots;
  expect(first).toMatchObject({ status: 'proposed', availability: 'in_stock', missing: [], reasons: ['Prête en 30 min.'] });
  expect(second).toMatchObject({ status: 'proposed', availability: 'to_buy', missing: [{ name: 'farine', quantity: 100, unit: 'g', status: 'to_buy' }] });
});

test('an empty slot says why: nothing compatible, or every compatible recipe already placed', async () => {
  engine({ dinner: { cookable_now: [candidate('a')], verify_suggestions: [candidate('v')] }, lunch: {} });
  const proposal = await propose(client(), ask([slot('2026-12-01'), slot('2026-12-02'), slot('2026-12-03', 'lunch')]));
  expect(picked(proposal)).toEqual(['2026-12-01:a', '2026-12-02:POOL_EXHAUSTED', '2026-12-03:NO_COMPATIBLE_RECIPE']);
});

test('kept slots stay as they are, count in the stock, and are never chosen again', async () => {
  engine({ dinner: { cookable_now: [candidate('k'), candidate('b')] } });
  const lots = [{ id: 'l1', product_id: 'p', quantity: 200, unit: 'g', stock_version: 1, expiry_date: null, date_kind: 'unknown', quantity_quality: 'measured', location: null, notes: null, product: { name: 'farine', unit_type: 'g' } }];
  const proposal = await propose(client({ lots, recipes: { k: resolved('k', 200), b: resolved('b', 200) } }),
    ask([slot('2026-12-02')], { keep: [{ date: '2026-12-01', meal_type: 'dinner', recipe: { id: 'k', source: 'recipes' }, servings: 2 }] }));
  expect(proposal.slots.map(item => [item.date, item.status])).toEqual([['2026-12-01', 'kept'], ['2026-12-02', 'proposed']]);
  expect(proposal.slots[0]).toMatchObject({ recipe: { reference: { id: 'k', source: 'recipes' }, name: 'Recette k', servings: 2 }, availability: 'in_stock' });
  expect(proposal.slots[1]).toMatchObject({ recipe: { reference: { id: 'b' } }, availability: 'to_buy' });
});

test('a slot taken since the screen read the week, or a day already passed, is refused', async () => {
  engine({ dinner: { cookable_now: [candidate('a')] } });
  const taken = client({ entries: [{ id: 'm1', version: 2, day_of_week: 1, meal_type: 'dinner', recipe_reference: null, recipe_id: null, cooked_command_id: null, leftover_of: 'x' }] });
  await expect(propose(taken, ask([slot('2026-12-01')]))).rejects.toMatchObject({ code: 'MENU_CHANGED', status: 409 });
  await expect(propose(client({ asOf: '2026-12-02' }), ask([slot('2026-12-01')]))).rejects.toMatchObject({ code: 'INVALID_PROPOSAL', status: 400 });
});

test('a proposal is identified by its inputs and the versions it read, expires in 30 minutes, and is what the screen accepts', async () => {
  engine({ dinner: { cookable_now: [candidate('a'), candidate('b')] } });
  const first = await propose(client(), ask([slot('2026-12-01')]));
  const again = await propose(client(), ask([slot('2026-12-01')]));
  const other = await propose(client(), ask([slot('2026-12-01')], { avoid: [{ id: 'a', source: 'recipes' }] }));
  expect(WeekProposalSchema.safeParse(first).success).toBe(true);
  expect(first.proposal_id).toBe(again.proposal_id);
  expect(other.proposal_id).not.toBe(first.proposal_id);
  expect([first.calculated_at, first.expires_at]).toEqual([NOW.toISOString(), new Date(NOW.getTime() + 30 * 60_000).toISOString()]);
  expect([first.context_revision, first.profile_version]).toEqual([7, 3]);
  expect(first.menu_version).toMatch(/^[0-9a-f]{32}$/);
});

// The real engine, on a fake client: its output (references, reasons, near dates) carries through,
// and no table is written (the fake client has no write method at all).
test('with the real engine: references and reasons carry through, stock is judged for the week, nothing is written', async () => {
  const recipe = (id: string) => ({ id, name: `Plat ${id}`, description: null, prep_time: 10, cook_time: 20, servings: 2, image_url: null, cuisine_category: null,
    meal_type: 'dinner', tags: null, created_at: '2026-11-01T00:00:00Z', user_id: USER,
    recipe_ingredients: [{ id: `${id}-1`, ingredient_name: 'farine', quantity: 200, unit: 'g', inventory_product_id: 'p', is_essential: true }] });
  const lot = { id: 'l1', product_id: 'p', quantity: 300, unit: 'g', stock_version: 1, expiry_date: '2027-01-30', date_kind: 'best_before', quantity_quality: 'measured',
    location: null, notes: null, products: { name: 'farine', unit_type: 'g' }, product: { name: 'farine', unit_type: 'g' } };
  const tables: Record<string, unknown[]> = { recipes: [recipe('a'), recipe('b')], inventory: [lot] };
  const from = (table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'is', 'gte', 'ilike', 'order', 'limit', 'range', 'or']) chain[method] = () => chain;
    chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: tables[table] ?? [], error: null, count: (tables[table] ?? []).length }).then(resolve);
    return chain;
  };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    if (name === 'menu_shopping_basis') return { data: basis, error: null };
    if (name === 'resolve_stock_recipe') return { data: resolved(String(args.p_recipe_id), 200), error: null };
    return { data: null, error: { message: `unexpected rpc ${name}` } };
  };
  const proposal = await new WeekPlanService({ from, rpc } as unknown as SupabaseClient, { now: () => NOW })
    .propose(USER, ask([slot('2026-12-01'), slot('2026-12-02')], { constraints: { timeLimitMinutes: 60 } }));
  expect(proposal.slots.map(item => item.status)).toEqual(['proposed', 'proposed']);
  const [first, second] = proposal.slots as Array<Extract<typeof proposal.slots[number], { status: 'proposed' }>>;
  expect([first.recipe.reference, second.recipe.reference].map(reference => reference.source)).toEqual(['recipes', 'recipes']);
  expect(new Set([first.recipe.reference.id, second.recipe.reference.id])).toEqual(new Set(['a', 'b']));
  expect([first.availability, second.availability]).toEqual(['in_stock', 'to_buy']);
  expect(second.missing).toEqual([{ name: 'farine', quantity: 100, unit: 'g', status: 'to_buy' }]);
  // The engine's « in stock » is false for the second meal: no reason about stock passes, the time one does.
  for (const item of [first, second]) {
    expect(item.reasons.some(reason => /stock/i.test(reason))).toBe(false);
    expect(item.reasons.some(reason => /min/.test(reason))).toBe(true);
  }
  expect(WeekProposalSchema.safeParse(proposal).success).toBe(true);
});

// Review of E4a.
test('a kept slot whose recipe no longer resolves stays, named from the request and to check, instead of failing the proposal', async () => {
  engine({ dinner: { cookable_now: [candidate('a')] } });
  const mocked = client();
  mocked.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => name === 'menu_shopping_basis' ? { data: basis, error: null }
    : args.p_recipe_id === 'gone' ? { data: null, error: { message: 'RECIPE_NOT_FOUND' } } : { data: resolved(String(args.p_recipe_id)), error: null });
  const proposal = await propose(mocked, ask([slot('2026-12-02')], { keep: [{ date: '2026-12-01', meal_type: 'dinner', recipe: { id: 'gone', source: 'auto' }, servings: 2 }] }));
  expect(proposal.slots[0]).toMatchObject({ status: 'kept', recipe: { reference: { id: 'gone', source: 'auto' } }, availability: 'to_check' });
  expect(WeekProposalSchema.safeParse(proposal).success).toBe(true);
});

test('a pool drained by the week’s own recipes is exhausted, not incompatible', async () => {
  jest.spyOn(RecommendationEngine.prototype, 'suggestForUser').mockImplementation(async (_ctx, input: RecommendationContext) =>
    result(input.excludeRecipeIds?.length ? {} : { cookable_now: [candidate('planned')] }) as never);
  const taken = client({ entries: [{ id: 'm1', version: 1, day_of_week: 0, meal_type: 'dinner', recipe_reference: { id: 'planned', source: 'recipes' }, recipe_id: null, cooked_command_id: null, leftover_of: null }] });
  expect(picked(await propose(taken, ask([slot('2026-12-01')])))).toEqual(['2026-12-01:POOL_EXHAUSTED']);
  expect(picked(await propose(client(), ask([slot('2026-12-01')], { avoid: [] })))).toEqual(['2026-12-01:planned']);
});

test('the identity is the same for the same slots in another order, and names what was placed', async () => {
  const spy = engine({ dinner: { cookable_now: [candidate('a'), candidate('b')] } });
  const first = await propose(client(), ask([slot('2026-12-01'), slot('2026-12-02')]));
  const reordered = await propose(client(), ask([slot('2026-12-02'), slot('2026-12-01')]));
  expect(reordered.proposal_id).toBe(first.proposal_id);
  spy.mockImplementation(async () => result({ cookable_now: [candidate('b'), candidate('a')] }) as never);
  const other = await propose(client(), ask([slot('2026-12-01'), slot('2026-12-02')]));
  expect(other.proposal_id).not.toBe(first.proposal_id);
});

test('results read on different profile versions keep the oldest, so the validation errs towards a refusal', async () => {
  jest.spyOn(RecommendationEngine.prototype, 'suggestForUser').mockImplementation(async (_ctx, input: RecommendationContext) =>
    result({ cookable_now: [candidate(input.mealType === 'lunch' ? 'l' : 'd')] }, input.mealType === 'lunch' ? 5 : 4) as never);
  const proposal = await propose(client(), ask([slot('2026-12-01'), slot('2026-12-02', 'lunch')]));
  expect(proposal.profile_version).toBe(4);
});

test('a recipe named by several meals is resolved once', async () => {
  engine({ dinner: { cookable_now: [candidate('a')] } });
  const mocked = client();
  await propose(mocked, ask([slot('2026-12-03')], { keep: [
    { date: '2026-12-01', meal_type: 'dinner', recipe: { id: 'k', source: 'recipes' }, servings: 2 },
    { date: '2026-12-02', meal_type: 'dinner', recipe: { id: 'k', source: 'recipes' }, servings: 2 },
  ] }));
  expect(mocked.rpc.mock.calls.filter(([name, args]) => name === 'resolve_stock_recipe' && args.p_recipe_id === 'k')).toHaveLength(1);
});

// V11-01 E4b: recomputing an expired proposal keeps its choices: only kept slots, no engine read.
test('a proposal of kept slots only reads no engine and takes the profile version from the profile', async () => {
  const spy = jest.spyOn(RecommendationEngine.prototype, 'suggestForUser');
  const mocked = client();
  const from = mocked.supabase.from as unknown as jest.Mock;
  const base = from.getMockImplementation()!;
  from.mockImplementation((table: string) => table === 'nutrition_profiles'
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: USER, version: 6, schema_version: 1, settings: emptyNutritionProfile(), updated_at: null, origin: 'explicit' }, error: null }) }) }) }
    : base(table));
  const proposal = await propose(mocked, ask([], { keep: [{ date: '2026-12-01', meal_type: 'dinner', recipe: { id: 'k', source: 'recipes' }, servings: 2 }] }));
  expect(spy).not.toHaveBeenCalled();
  expect(proposal.profile_version).toBe(6);
  expect(proposal.slots.map(item => item.status)).toEqual(['kept']);
});
