import { emptyNutritionProfile,mapLibraryRecipe,recipeDurationMinutes,type LibraryRecipeRow,type RecipeCatalogRow,type RecipeEvaluationInput,type RecipeEvaluation,type NutritionProfile,type ProfileWrite,allocateRecipeStock, allocateCookingStock, convertQuantity, type RecipeStockPreview, type StockCommand, type StockCommandResult, type StockIngredient, type StockLot } from '@smart/shared';
import { data, failures, OWNER,persistFixtureData } from './supabase';

export class ApiError extends Error {
  status: number; code?: string;
  constructor(message: string, opts: { status: number; code?: string }) { super(message); this.status = opts.status; this.code = opts.code; }
}
function fixtureRecipe(id:string,source='auto') {
  const legacy=(source==='auto' || source==='recipes') && data.recipes.find(row=>row.id===id);
  if (legacy) return { ...legacy,id,source:'recipes',inlineIngredients:data.recipe_ingredients.filter(row=>row.recipe_id===id) };
  if (source==='auto' || source==='user_recipes') {
    const row=data.user_recipes.find(row=>row.id===id);
    if (row) return mapLibraryRecipe({ ...row,catalog_recipe:data.recipes_catalog.find(catalog=>catalog.id===row.recipe_id) } as unknown as LibraryRecipeRow);
  }
  if (source==='auto' || source==='recipes_catalog') {
    const row=data.recipes_catalog.find(row=>row.id===id);
    if (row) return { ...mapLibraryRecipe({ id,user_id:OWNER,is_from_catalog:true,catalog_recipe:row as unknown as RecipeCatalogRow,created_at:String(row.created_at),updated_at:String(row.updated_at) }),source:'recipes_catalog' };
  }
  throw new ApiError('Recette absente du jeu de test.',{ status:404,code:'RECIPE_NOT_FOUND' });
}
function preview(id: string, requested?: number,source='auto'): RecipeStockPreview {
  const row = fixtureRecipe(id,source) as Record<string,unknown>;
  if (!row) throw new Error('Recette introuvable dans le jeu de test.');
  const ingredients: StockIngredient[] = (row.inlineIngredients as Array<Record<string,unknown>>).map(ingredient => ({
    ingredient_name: String(ingredient.ingredient_name), quantity: ingredient.quantity == null ? null : Number(ingredient.quantity),
    unit: ingredient.unit == null ? null : String(ingredient.unit), inventory_product_id: ingredient.inventory_product_id == null ? null : String(ingredient.inventory_product_id),
    is_essential: ingredient.is_essential !== false,
  }));
  const lots: StockLot[] = data.inventory.map(lot => ({ id: String(lot.id), product_id: String(lot.product_id), quantity: Number(lot.quantity),
    unit: String(lot.unit), stock_version: Number(lot.stock_version), expiry_date: lot.expiry_date == null ? null : String(lot.expiry_date),
    product_name: String(data.products.find(product => product.id === lot.product_id)?.name ?? ''),
  }));
  if (!Number.isFinite(row.servings) || !(Number(row.servings)>0)) throw new ApiError('Portions de base inconnues dans le test.',{ status:409 });
  const recipe = { id, source: row.source, canonicalId: row.canonicalId ?? id, name: row.name, servings: row.servings, version: 'local-fixture', ingredients } as RecipeStockPreview['recipe'];
  const servings = requested ?? Number(row.servings);
  return { recipe, servings, lots, ...allocateRecipeStock(ingredients,lots,Number(row.servings),servings) } as RecipeStockPreview;
}
function fixtureProfile():NutritionProfile { return (data.nutrition_profiles?.[0] ?? { user_id:OWNER,version:0,schema_version:1,settings:emptyNutritionProfile(),origin:'empty',updated_at:null }) as unknown as NutritionProfile; }
const results = new Map<string,StockCommandResult>(JSON.parse(localStorage.getItem('v10-fixture-results') ?? '[]'));
const snapshots = new Map<string,{ inventory:typeof data.inventory;shopping:typeof data.shopping_list }>(JSON.parse(localStorage.getItem('v10-fixture-snapshots') ?? '[]'));
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const request = body as { recipe: { id: string;source?:string }; servings?: number };
  if (path === '/v1/stock/preview') return preview(request.recipe.id,request.servings,request.recipe.source) as T;
  if (path==='/v1/recommendations/evaluate') {
    if (failures.evaluationOffline) throw new ApiError('Vérification indisponible dans le test local. Réessaie.',{ status:503 });
    // Presentation contract only. The actual common evaluator is exercised in API tests.
    const input=body as RecipeEvaluationInput,row=fixtureRecipe(input.recipe.id,input.recipe.source) as Record<string,unknown>;
    const base=Number(row.servings)>0 ? Number(row.servings) : null;
    const computed=base ? preview(input.recipe.id,input.servings,input.recipe.source) : null;
    const result:RecipeEvaluation={ reference:input.recipe,servings:input.servings,base_servings:base,recipe_version:'visual-fixture',profile_version:fixtureProfile().version,
      stock_version:'visual-fixture',calculated_at:new Date().toISOString(),duration_minutes:recipeDurationMinutes(row),
      constraints:{ status:base ? 'compatible':'verify',findings:[],registry_version:'visual-fixture',limitations:['Présentation fictive ; aucun résultat médical.'] },
      availability:{ status:!base || !computed?.recipe.ingredients.length ? 'verify' : computed.missing.length ? 'missing':'available',missing:computed?.missing ?? [],allocations:computed?.allocations ?? [],excluded_lots:[],uncertainties:base ? [] : ['Portions de base inconnues ; quantités à vérifier.'] },
      nutrition:{ status:base ? 'partial':'unavailable',coverage:base ? 1:0,known_ingredients:base ? 1:0,total_ingredients:1,
        per_serving:{ energyKcal:base ? 100:null,proteinG:null,fiberG:base ? 0:null },sources:base ? [{ product_id:'visual-fixture',source:'manual',updated_at:'2026-10-08T12:00:00Z',base:'100g' }] : [],limitations:['Valeurs fictives pour vérifier la présentation de zéro et des inconnues.'] } };
    return result as T;
  }
  if (path==='/v1/settings/nutrition-profile') {
    const command=body as ProfileWrite,current=fixtureProfile();
    const receipt=localStorage.getItem(`v10-fixture-profile:${command.command_id}`);
    if (receipt) return { applied_version:Number(receipt),profile:current } as T;
    if (command.expected_version!==current.version) throw new ApiError('Le profil a changé sur un autre appareil.',{ status:409,code:'PROFILE_VERSION_CONFLICT' });
    const updated={ ...current,settings:command.operation==='clear' ? emptyNutritionProfile() : command.settings,origin:command.origin,version:current.version+1,updated_at:new Date().toISOString() };
    data.nutrition_profiles=[updated];persistFixtureData();localStorage.setItem(`v10-fixture-profile:${command.command_id}`,String(updated.version));
    if (failures.nextReplyLost) { failures.nextReplyLost=false;throw new ApiError('Réponse perdue après sauvegarde du profil.',{ status:503 }); }
    return { applied_version:updated.version,profile:updated } as T;
  }
  if (path==='/v1/recommendations/feedback') {
    const command=body as Record<string,unknown>;
    const previous=data.recipe_interactions.find(row=>row.feedback_command_id===command.command_id);
    const row=previous ?? { id:crypto.randomUUID(),user_id:OWNER,feedback_command_id:command.command_id,recipe_reference:command.recipe,feedback:command.feedback };
    if (!previous) { data.recipe_interactions.push(row);persistFixtureData(); }
    return { id:row.id } as T;
  }
  if (path==='/v1/recommendations/suggest') {
    // Contract fixtures for visual QA only; server scoring is verified by the API tests.
    const profile=fixtureProfile(),input=body as Record<string,unknown>,settings=profile.settings;
    const cookable:unknown[]=[],almost:unknown[]=[],verify:unknown[]=[],excluded:unknown[]=[];
    const rows=[...data.recipes.map(row=>fixtureRecipe(String(row.id),'recipes')),...data.user_recipes.map(row=>fixtureRecipe(String(row.id),'user_recipes')),...data.recipes_catalog.map(row=>fixtureRecipe(String(row.id),'recipes_catalog'))] as Array<Record<string,unknown>>;
    for (const row of rows) {
      if (input.query && !String(row.name).toLowerCase().includes(String(input.query).toLowerCase())) continue;
      const servings=Number(input.servings ?? settings.usualServings ?? row.servings ?? 2);
      const evaluation=await apiPost<RecipeEvaluation>('/v1/recommendations/evaluate',{ recipe:{ id:row.id,source:row.source },servings });
      const incompatible=settings.allergies.some(value=>['lait','milk'].includes(value.toLowerCase())) && (row.inlineIngredients as StockIngredient[]).some(item=>['lait','beurre'].includes(item.ingredient_name.toLowerCase()));
      const minutes=evaluation.duration_minutes,limit=Number(input.timeLimitMinutes ?? settings.usualTimeMinutes ?? 600);
      if (minutes!=null && minutes>limit) continue;
      const reasons=[{ code:evaluation.availability.status==='available' ? 'STOCK_AVAILABLE':'STOCK_UNCERTAIN',text:evaluation.availability.status==='available' ? 'Quantités et lots utilisables renseignés pour les portions demandées.' : 'Des quantités ou des ingrédients sont à vérifier.' },{ code:minutes==null ? 'TIME_UNKNOWN':'TIME_FITS',text:minutes==null ? 'Durée à vérifier.' : `Durée enregistrée ${minutes} min.` }];
      const candidate={ ...row,...evaluation,score_total:80,
        constraints:incompatible ? { ...evaluation.constraints,status:'incompatible',findings:[{ code:'DECLARED_ALLERGY',ingredient:'Lait',message:'Un ingrédient signalé est exclu par votre profil.' }] } : evaluation.constraints,
        reason_codes:reasons,reasons:reasons.map(item=>item.text),unavailable_criteria:['nutrition','variety'] };
      const feedback=data.recipe_interactions.filter(item=>(item.recipe_reference as { id:string })?.id===row.id).at(-1)?.feedback;
      if (incompatible || feedback==='dislike') excluded.push(candidate);else if (feedback==='not_today' || evaluation.availability.status==='verify') verify.push(candidate);else if (evaluation.availability.missing.length) almost.push(candidate);else cookable.push(candidate);
    }
    return { cookable_now:cookable,almost_cookable:almost,verify_suggestions:verify,excluded_suggestions:excluded,recent_suggestions:[],total_user_recipes:rows.length,pipeline_version:3,profile_version:profile.version,calculated_at:new Date().toISOString(),has_constraints:settings.allergies.length+settings.diets.length>0 } as T;
  }
  if (path==='/v1/settings/export') return { nutrition_profile:fixtureProfile(),assistant_memory:data.assistant_memory_items } as T;
  if (path==='/v1/settings/delete-request') return { id:crypto.randomUUID(),status:'pending',requestedAt:new Date().toISOString(),alreadyPending:false } as T;
  if (path === '/v1/stock/commands') {
    const command = body as StockCommand;
    if (results.has(command.command_id)) return results.get(command.command_id) as T;
    if (failures.nextCommand) { failures.nextCommand = false; throw new ApiError('Connexion interrompue : résultat à vérifier. Réessaie la même action.',{ status: 503, code: 'STOCK_WRITE_FAILED' }); }
    const result: StockCommandResult = { command_id: command.command_id, command_type: command.command_type, status: 'confirmed', affected_tables: [] };
    snapshots.set(command.command_id,structuredClone({ inventory:data.inventory,shopping:data.shopping_list }));
    if (command.command_type === 'transfer_shopping') {
      const selected = data.shopping_list.filter(row => command.payload.items.some(item => item.id === row.id));
      const inserted = selected.map(row => { const edited=command.payload.items.find(item=>item.id===row.id)!;return { ...row,id:crypto.randomUUID(),stock_version:0,quantity:edited.quantity ?? row.quantity,unit:edited.unit ?? row.unit,location:edited.location ?? null,expiry_date:edited.expiry_date ?? null }; });
      data.inventory.push(...inserted); data.shopping_list = data.shopping_list.filter(row => !selected.includes(row));
      result.affected_tables = ['inventory','shopping_list']; result.inventory_ids = inserted.map(row => String(row.id));
    } else if (command.command_type === 'consume_recipe') {
      const computed = preview(command.payload.recipe.id,command.payload.servings);
      const actual=allocateCookingStock(computed.recipe.ingredients,computed.lots,computed.recipe.servings,computed.servings,command.payload.adjustments,command.payload.outside_inventory);
      if (actual.missing.length) throw new ApiError('Stock insuffisant.',{ status:409,code:'INSUFFICIENT_QUANTITY' });
      for (const allocation of actual.allocations) {
        const lot = data.inventory.find(row => row.id === allocation.inventory_id)!;
        lot.quantity = Number(lot.quantity)-allocation.quantity; lot.stock_version = Number(lot.stock_version)+1;
      }
      result.journal_id = crypto.randomUUID(); result.affected_tables = ['inventory','cooking_journal'];
      data.cooking_journal_entries.push({ id:result.journal_id,user_id:OWNER,stock_command_id:command.command_id });
    } else if (command.command_type==='adjust_inventory' || command.command_type==='consume_inventory') {
      result.changes=[];
      for (const item of command.payload.items) {
        const lot=data.inventory.find(row=>row.id===item.id)!;
        if (!lot || item.expected_version!==undefined && lot.stock_version!==item.expected_version) throw new ApiError('Le stock a changé.',{ status:409,code:'CONFLICT' });
        const before=Number(lot.quantity);
        if (command.command_type==='adjust_inventory') Object.assign(lot,item,{ stock_version:Number(lot.stock_version)+1 });
        else { lot.quantity=before-convertQuantity(item.quantity,item.unit,String(lot.unit));lot.stock_version=Number(lot.stock_version)+1; }
        result.changes.push({ id:item.id,before_quantity:before,after_quantity:Number(lot.quantity),unit:String(lot.unit),stock_version:Number(lot.stock_version) });
      }
      result.affected_tables=['inventory'];
    } else if (command.command_type==='undo_stock') {
      const previous=snapshots.get(command.payload.original_command_id);
      if (!previous) throw new ApiError('Action introuvable.',{ status:409,code:'COMMAND_NOT_FOUND' });
      data.inventory=structuredClone(previous.inventory);data.shopping_list=structuredClone(previous.shopping);
      result.affected_tables=['inventory','shopping_list','cooking_journal'];
    } else if (command.command_type === 'save_recipe') {
      result.recipe_id = crypto.randomUUID();
      data.recipes.push({ ...command.payload.recipe, id: result.recipe_id, user_id: OWNER });
      data.recipe_ingredients.push(...command.payload.ingredients.map(ingredient => ({ ...ingredient, id: crypto.randomUUID(), recipe_id: result.recipe_id })));
      result.affected_tables = ['recipes','recipe_ingredients'];
    } else throw new ApiError('Cette action ne fait pas partie du contrôle visuel.',{ status: 409, code: 'UNSUPPORTED_FIXTURE_ACTION' });
    results.set(command.command_id,result);persistFixtureData();
    localStorage.setItem('v10-fixture-results',JSON.stringify([...results]));
    localStorage.setItem('v10-fixture-snapshots',JSON.stringify([...snapshots]));
    if (failures.nextReplyLost) { failures.nextReplyLost=false;throw new ApiError('Réponse perdue après écriture. Vérifie la confirmation.',{ status:503 }); }
    return result as T;
  }
  throw new ApiError('Service absent du jeu de test visuel.',{ status: 503 });
}
export async function apiGet<T>(path:string):Promise<T> {
  if (path==='/v1/settings/nutrition-profile') return { profile:fixtureProfile(),legacyServerPresent:false } as T;
  if (path.startsWith('/assistant/memories')) return { items:data.assistant_memory_items,nextCursor:null } as T;
  if (path==='/assistant/conversations' || path.startsWith('/assistant/conversations?')) return { items:[],nextCursor:null } as T;
  if (path==='/v1/settings/privacy') return { settings:{ hasConsent:false,allowAnalytics:false,saveHistory:true,allowImageProcessing:false,shareAnonymizedData:false,batterySaver:false,dataRetention:'standard' } } as T;
  if (path.startsWith('/v1/stock/commands/')) {
    const result=results.get(path.split('/').pop()!);
    if (!result) throw new ApiError('Aucun reçu pour cette commande.',{ status:404,code:'COMMAND_NOT_FOUND' });
    return result as T;
  }
  if (path==='/imports/social') return { items:[],nextCursor:null } as T;
  if (path==='/imports/social/counts') return { total:0,active:0,byPlatform:{},byStatus:{},quota:{ tier:'free',limit:50,remaining:50 } } as T;
  throw new ApiError('Service absent du jeu de test visuel.',{ status:503 });
}
export const apiPatch = apiPost;
export const apiDelete = apiGet;
