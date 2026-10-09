/* Fictitious local QA data, persisted only on this dedicated localhost origin. */
export const OWNER = '00000000-0000-4000-8000-000000000001';
export const RECIPE = '30000000-0000-4000-8000-000000000001';
export const CATALOG = '60000000-0000-4000-8000-000000000001';
export const WRAPPER = '70000000-0000-4000-8000-000000000001';
const uuid = (prefix: string, n: number) => `${prefix}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
type Row = Record<string, unknown>;
export const data: Record<string, Row[]> = {
  user_profiles: [{ id: OWNER, user_id: OWNER, onboarding_completed: true, display_name: 'Test local' }],
  profiles: [{ id: OWNER, user_id: OWNER, onboarding_completed: true, display_name: 'Test local' }],
  products: ['Farine','Lait','Tomate','Pomme','Riz','Œuf'].map((name,index) => ({ id: uuid('1',index+1), name,normalized_name:name.toLowerCase(),
    category: 'Autres', unit_type: index === 0 || index === 4 ? 'kg' : index === 1 ? 'l' : 'pièce',
    nutrition_json: { source: 'manual', per100g: { energyKcal: 200, proteinG: 8, carbsG: 30, fatG: 4 } },
  })),
  recipes: [{ id: RECIPE, user_id: OWNER, name: 'Pain maison', instructions: 'Mélanger les ingrédients.\nCuire le pain.',
    servings: 4, prep_time: 15, cook_time: 30, difficulty: 2, tags: ['Maison'], is_public: false,
    created_at: '2026-10-08T10:00:00Z', updated_at: '2026-10-08T10:00:00Z' }],
  recipe_ingredients: [{ id: uuid('4',1), recipe_id: RECIPE, ingredient_name: 'Farine', quantity: 200, unit: 'g',
    inventory_product_id: uuid('1',1), is_essential: true, order_index: 0 }],
  inventory: [{ id: uuid('2',1), user_id: OWNER, product_id: uuid('1',1), quantity: 1, unit: 'kg', stock_version: 0,
    location: 'Placard', expiry_date: '2026-11-08', created_at: '2026-10-08T10:00:00Z' }],
  shopping_list: Array.from({ length: 6 },(_,index) => ({ id: uuid('5',index+1), user_id: OWNER,
    product_id: uuid('1',index+1), quantity: 1, unit: index === 0 || index === 4 ? 'kg' : index === 1 ? 'l' : 'pièce',
    stock_version: 0, is_purchased: false, priority: 1, created_at: '2026-10-08T10:00:00Z', updated_at: '2026-10-08T10:00:00Z' })),
  user_recipes: [], recipes_catalog: [], stock_commands: [], cooking_journal_entries: [],
  mobile_routine_preferences: [],routine_recipe_favorites: [],user_meal_preferences: [],
};
try { Object.assign(data,JSON.parse(localStorage.getItem('v10-fixture-data') ?? '{}')); } catch { /* New fixture. */ }
if (!data.recipes_catalog.some(row=>row.id===CATALOG)) data.recipes_catalog.push({ id:CATALOG,title:'Riz express',prep_time:5,cook_time:15,servings:2,instructions:'Rincer le riz.\nCuire le riz.',ingredients_json:[{ name:'Riz',amount:'100',unit:'g' }],tags:[],created_at:'2026-10-08T10:00:00Z',updated_at:'2026-10-08T10:00:00Z' });
if (!data.user_recipes.some(row=>row.id===WRAPPER)) data.user_recipes.push({ id:WRAPPER,user_id:OWNER,is_from_catalog:false,custom_title:'Soupe personnelle',custom_instructions:'Couper les tomates.\nFaire cuire.',custom_ingredients_json:[{ name:'Tomate',amount:'2',unit:'pièce' }],custom_modifications:{},personal_tags:[],collections:[],created_at:'2026-10-08T10:00:00Z',updated_at:'2026-10-08T10:00:00Z' });
export function persistFixtureData() { localStorage.setItem('v10-fixture-data',JSON.stringify(data)); }
export const failures = { nextCommand: false,nextReplyLost:false };
const session = { user: { id: OWNER, email: 'test@example.invalid' }, access_token: 'local-test-only' };
class Query implements PromiseLike<{ data: unknown; error: null; count: number }> {
  private filters: Array<(row: Row) => boolean> = [];
  private mode = 'read'; private patch: Row = {}; private added: Row[] = []; private singleResult = false;
  private offset=0;private maximum=Infinity;private sortKey:string|null=null;private ascending=true;
  constructor(private table: string) {}
  select() { return this; }
  eq(key: string,value: unknown) { this.filters.push(row => row[key] === value); return this; }
  in(key: string,values: unknown[]) { this.filters.push(row => values.includes(row[key])); return this; }
  is(key: string,value: unknown) { this.filters.push(row => (row[key] ?? null) === value); return this; }
  lte(key:string,value:string|number) { this.filters.push(row=>row[key]!=null && String(row[key])<=String(value));return this; }
  gte(key:string,value:string|number) { this.filters.push(row=>row[key]!=null && String(row[key])>=String(value));return this; }
  not(key:string,operator:string,value:unknown) { if (operator==='is') this.filters.push(row=>(row[key] ?? null)!==value);return this; }
  or() { return this; }
  ilike(key:string,value:string) { const needle=value.replace(/^%|%$/g,'').replace(/\\([%_\\])/g,'$1').toLowerCase();this.filters.push(row=>String(row[key] ?? '').toLowerCase().includes(needle));return this; }
  gt(key: string,value: number) { this.filters.push(row => Number(row[key]) > value); return this; }
  order(key:string,options?:{ ascending?:boolean }) { this.sortKey=key;this.ascending=options?.ascending!==false;return this; }
  limit(value:number) { this.maximum=value;return this; }
  range(from:number,to:number) { this.offset=from;this.maximum=to-from+1;return this; }
  abortSignal() { return this; }
  update(value: Row) { this.mode = 'update'; this.patch = value; return this; }
  insert(value: Row | Row[]) { this.mode = 'insert'; this.added = Array.isArray(value) ? value : [value]; return this; }
  upsert(value: Row | Row[]) { this.mode='upsert';this.added=Array.isArray(value) ? value:[value];return this; }
  delete() { this.mode = 'delete'; return this; }
  single() { this.singleResult = true; return this; }
  maybeSingle() { return this.single(); }
  then<TResult1 = { data: unknown; error: null; count: number }, TResult2 = never>(
    resolve?: ((value: { data: unknown; error: null; count: number }) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    let rows = data[this.table] ?? [];
    if (this.mode === 'upsert') {
      const all=data[this.table] ?? [];
      rows=this.added.map(row=>{
        const previous=all.find(item=>row.id ? item.id===row.id : item.user_id===row.user_id && (!row.recipe_id || row.recipe_id===item.recipe_id));
        if (previous) { Object.assign(previous,row);return previous; }
        const inserted={ id:crypto.randomUUID(),...row };all.push(inserted);return inserted;
      });data[this.table]=all;
    } else if (this.mode === 'insert') { rows = this.added.map(row => ({ id: crypto.randomUUID(), ...row })); data[this.table] = [...(data[this.table] ?? []),...rows]; }
    else {
      rows = rows.filter(row => this.filters.every(filter => filter(row)));
      if (this.mode === 'update') rows.forEach(row => Object.assign(row, this.patch, { stock_version: Number(row.stock_version ?? 0)+1 }));
      if (this.mode === 'delete') data[this.table] = (data[this.table] ?? []).filter(row => !rows.includes(row));
    }
    if (this.mode!=='read') persistFixtureData();
    const count=rows.length;
    if (this.sortKey) rows=[...rows].sort((a,b)=>String(a[this.sortKey!] ?? '').localeCompare(String(b[this.sortKey!] ?? ''))*(this.ascending ? 1:-1));
    const mapped = rows.slice(this.offset,this.offset+this.maximum).map(row => ({ ...row,
      ...(row.product_id ? { product: data.products.find(product => product.id === row.product_id), products: data.products.find(product => product.id === row.product_id) } : {}),
      ...(this.table === 'recipes' ? { recipe_ingredients: data.recipe_ingredients.filter(ingredient => ingredient.recipe_id === row.id) } : {}),
    }));
    return Promise.resolve({ data: this.singleResult ? mapped[0] ?? null : mapped, error: null, count }).then(resolve,reject);
  }
}
const channel = { on: () => channel, subscribe: () => channel, unsubscribe: async () => {} };
export const supabase = {
  auth: { getSession: async () => ({ data: { session }, error: null }), getUser: async () => ({ data: { user: session.user }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), signOut: async () => ({ error: null }) },
  from: (table: string) => new Query(table), channel: () => channel, removeChannel: async () => {},
  rpc: async () => ({ data: [], error: null }),
  functions: { invoke: async () => ({ data: null, error: new Error('Service indisponible dans le test local.') }) },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
};
