import { allocateCookingStock } from '@smart/shared';
import { ApiError } from '@/lib/api';
import { confirmCookingSession,patchCookingSession,readCookingSessions,recoverCookingConfirmation,startCookingSession,timerRemaining,type CookingSession } from '../cookingSessions';
import { executeStockCommand,getStockCommandResult,previewRecipeStock,finishIntent } from '../stockCommands';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',ID='40000000-0000-4000-8000-000000000001',RECIPE='30000000-0000-4000-8000-000000000001',LOT='20000000-0000-4000-8000-000000000001',PRODUCT='10000000-0000-4000-8000-000000000001';
let mockOwner:string|null=A;
jest.mock('@/integrations/supabase/client',()=>({ supabase:{ auth:{ getSession:async()=>({ data:{ session:mockOwner ? { user:{ id:mockOwner } } : null } }) } } }));
jest.mock('@/lib/api',()=>({ ApiError:class extends Error { status:number;code:string;constructor(message:string,options:{ status:number;code:string }) { super(message);this.status=options.status;this.code=options.code; } } }));
jest.mock('../stockCommands',()=>({ executeStockCommand:jest.fn(),getStockCommandResult:jest.fn(),previewRecipeStock:jest.fn(),pendingIntent:async()=>null,finishIntent:jest.fn() }));
const preview={ recipe:{ id:RECIPE,source:'recipes' as const,canonicalId:RECIPE,name:'Pain',servings:4,version:'v1',ingredients:[{ ingredient_name:'Farine',quantity:200,unit:'g',inventory_product_id:PRODUCT }] },servings:4,lots:[{ id:LOT,product_id:PRODUCT,product_name:'Farine',quantity:1,unit:'kg',stock_version:0 }],allocations:[],missing:[] };
const confirmed={ command_id:ID,command_type:'consume_recipe',status:'confirmed' as const,journal_id:'journal',affected_tables:['inventory','cooking_journal'] };
let session:CookingSession;
beforeEach(async()=>{
  localStorage.clear();jest.clearAllMocks();mockOwner=A;
  Object.defineProperty(crypto,'randomUUID',{ configurable:true,value:()=>ID });
  jest.mocked(previewRecipeStock).mockResolvedValue(preview);
  session=await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger','Cuire']);
});
test('starting, changing steps or abandoning never consumes stock; owner/progress survives reload',()=>{
  patchCookingSession(A,session.id,{ state:'in_progress',step:1,servings:8 });
  expect(readCookingSessions(A)[0]).toMatchObject({ owner:A,step:1,servings:8,state:'in_progress' });
  expect(readCookingSessions(B)).toEqual([]);
  patchCookingSession(A,session.id,{ state:'abandoned' });
  expect(executeStockCommand).not.toHaveBeenCalled();
});
test('portion changes always derive from the unchanged base, including a return to original value',()=>{
  patchCookingSession(A,session.id,{ servings:8 });
  patchCookingSession(A,session.id,{ servings:2 });
  patchCookingSession(A,session.id,{ servings:4 });
  const restored=readCookingSessions(A)[0];
  expect(restored.ingredients[0].quantity! * restored.servings/restored.base_servings).toBe(200);
});
test('a lost reply freezes the same command; reload checks the receipt without sending another consumption',async()=>{
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new Error('Réseau coupé'));
  await expect(confirmCookingSession(A,session.id,preview)).rejects.toThrow('Réseau coupé');
  expect(readCookingSessions(A)[0].state).toBe('pending');
  expect(()=>patchCookingSession(A,session.id,{ servings:2 })).toThrow('Vérifiez');
  jest.mocked(getStockCommandResult).mockResolvedValueOnce(confirmed);
  expect(await recoverCookingConfirmation(A,session.id)).toMatchObject({ state:'done',journal_id:'journal' });
  await confirmCookingSession(A,session.id);
  expect(executeStockCommand).toHaveBeenCalledTimes(1);
  expect(finishIntent).toHaveBeenCalledWith(`recipe:${RECIPE}:cooked`,{ owner:A,commandId:ID });
});
test('a missing receipt permits only the same saved command, even if stock has changed',async()=>{
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new Error('Réseau coupé'));
  await expect(confirmCookingSession(A,session.id,preview)).rejects.toThrow();
  const command=readCookingSessions(A)[0].command;
  jest.mocked(getStockCommandResult).mockRejectedValueOnce(new ApiError('Pas encore de reçu',{ status:404,code:'COMMAND_NOT_FOUND' }));
  jest.mocked(executeStockCommand).mockResolvedValueOnce(confirmed);
  await confirmCookingSession(A,session.id);
  expect(executeStockCommand).toHaveBeenLastCalledWith(command,A);
  expect(readCookingSessions(A)[0].state).toBe('done');
});
test('server failure during receipt verification does not replay the consumption',async()=>{
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new Error('Réseau'));
  await expect(confirmCookingSession(A,session.id,preview)).rejects.toThrow();
  jest.mocked(getStockCommandResult).mockRejectedValueOnce(new ApiError('Serveur indisponible',{ status:503,code:'MIGRATION_REQUIRED' }));
  await expect(confirmCookingSession(A,session.id)).rejects.toThrow('Serveur');
  expect(executeStockCommand).toHaveBeenCalledTimes(1);
});
test('a rolled-back conflict unlocks corrections; auth expiry keeps the original command',async()=>{
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new ApiError('Stock modifié',{ status:409,code:'CONFLICT' }));
  await expect(confirmCookingSession(A,session.id,preview)).rejects.toThrow();
  expect(readCookingSessions(A)[0]).toMatchObject({ state:'error',command:null });
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new ApiError('Session expirée',{ status:401,code:'UNAUTHORIZED' }));
  await expect(confirmCookingSession(A,session.id,preview)).rejects.toThrow();
  expect(readCookingSessions(A)[0].state).toBe('pending');
  mockOwner=B;
  await expect(confirmCookingSession(A,session.id)).rejects.toThrow('Reconnectez');
  expect(readCookingSessions(B)).toEqual([]);
});
test('a rate-limited confirmation stays pending and is checked by its receipt before any resend',async()=>{
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new ApiError('Trop de demandes',{ status:429,code:'RATE_LIMITED' }));
  await expect(confirmCookingSession(A,session.id,preview)).rejects.toMatchObject({ status:429 });
  expect(readCookingSessions(A)[0]).toMatchObject({ state:'pending',command:{ command_id:ID } });
  jest.mocked(getStockCommandResult).mockResolvedValueOnce(confirmed);
  await expect(confirmCookingSession(A,session.id)).resolves.toMatchObject({ state:'done',journal_id:'journal' });
  expect(getStockCommandResult).toHaveBeenCalledWith(ID,A);
  expect(executeStockCommand).toHaveBeenCalledTimes(1);
});
test('no confirmation is sent when durable storage refuses the command',async()=>{
  const spy=jest.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{ throw new Error('Quota'); });
  await expect(confirmCookingSession(A,session.id,preview)).rejects.toThrow('conserver');
  expect(executeStockCommand).not.toHaveBeenCalled();spy.mockRestore();
});
test('absolute timer deadlines survive screen lock, pause and elapsed time',()=>{
  const timer={ id:ID,step:1,duration_ms:60000,remaining_ms:60000,ends_at:100000 };
  expect(timerRemaining(timer,90000)).toBe(10000);
  expect(timerRemaining(timer,110000)).toBe(0);
  expect(timerRemaining(timer,39000)).toBe(60000);
  expect(timerRemaining({ ...timer,ends_at:null,remaining_ms:25000 },110000)).toBe(25000);
});
test('actual quantities and selected substitutions reserve each lot only once',()=>{
  const ingredients=[...preview.recipe.ingredients,...preview.recipe.ingredients];
  const actual=allocateCookingStock(ingredients,[{ ...preview.lots[0],quantity:.3 }],4,8,[{ ingredient_index:0,quantity:150,unit:'g',inventory_product_id:PRODUCT,inventory_id:LOT },{ ingredient_index:1,quantity:100,unit:'g' }]);
  expect(actual.missing).toEqual([]);expect(actual.allocations.map(row=>row.quantity)).toEqual([.15,.1]);
  const without=allocateCookingStock(ingredients,preview.lots,4,4,[{ ingredient_index:0,quantity:0,unit:'g' }],[1]);
  expect(without).toEqual({ allocations:[],missing:[] });
});
// Audit 2026-11-07: « Cuisiner » for 2 reopened an unfinished session for 4, ignoring the portions asked.
test('reopening an unfinished session keeps its progress and takes the portions asked now',async()=>{
  patchCookingSession(A,session.id,{ state:'in_progress',step:1,outside_inventory:[0] });
  const resumed=await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger','Cuire'],2);
  expect(resumed).toMatchObject({ id:session.id,step:1,servings:2,outside_inventory:[] });
  expect(readCookingSessions(A)).toHaveLength(1);
  expect(await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger','Cuire'])).toMatchObject({ id:session.id,servings:2 });
});
test('a session whose confirmation was sent is reopened as it is',async()=>{
  patchCookingSession(A,session.id,{ state:'pending' });
  expect(await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger','Cuire'],2)).toMatchObject({ id:session.id,servings:4,state:'pending' });
});
// V11-01 E1: opened from a planned meal, the confirmation marks it as cooked.
const MEAL='60000000-0000-4000-8000-000000000001',OTHER_MEAL='60000000-0000-4000-8000-000000000002';
test('a session opened from a planned meal confirms the meal with the version read',async()=>{
  patchCookingSession(A,session.id,{ state:'abandoned' });
  const linked=await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger'],undefined,{ id:MEAL,version:2 });
  expect(readCookingSessions(A)[0]).toMatchObject({ meal:{ id:MEAL,version:2 } });
  jest.mocked(executeStockCommand).mockResolvedValueOnce(confirmed);
  await confirmCookingSession(A,linked.id,preview);
  expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_type:'consume_recipe',
    payload:expect.objectContaining({ meal_plan_entry_id:MEAL,entry_version:2 }) }),A);
});
test('a session started without a meal sends no meal fields',async()=>{
  jest.mocked(executeStockCommand).mockResolvedValueOnce(confirmed);
  await confirmCookingSession(A,session.id,preview);
  const sent=jest.mocked(executeStockCommand).mock.calls[0][0];
  expect(sent.payload).not.toHaveProperty('meal_plan_entry_id');
});
test('reopened from the menu, an unfinished session takes the meal as read now; reopened without one, it keeps it',async()=>{
  patchCookingSession(A,session.id,{ state:'in_progress',step:1 });
  await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger','Cuire'],undefined,{ id:MEAL,version:1 });
  const reread=await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger','Cuire'],undefined,{ id:OTHER_MEAL,version:4 });
  expect(reread).toMatchObject({ id:session.id,step:1,meal:{ id:OTHER_MEAL,version:4 } });
  expect(await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger','Cuire'])).toMatchObject({ meal:{ id:OTHER_MEAL,version:4 } });
});
test('a sent confirmation keeps its meal and command when reopened from the menu',async()=>{
  patchCookingSession(A,session.id,{ state:'pending' });
  expect(await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger'],undefined,{ id:MEAL,version:7 })).not.toHaveProperty('meal');
});
test('sessions saved before the meal link are read as they are',()=>{
  const saved=readCookingSessions(A)[0];
  expect(saved).not.toHaveProperty('meal');
  expect(()=>patchCookingSession(A,saved.id,{ step:1 })).not.toThrow();
});
// Review 2026-11-24: a meal cooked elsewhere during the session refused every confirmation, and
// reopening the recipe did not drop the link.
test('a meal refused at confirmation says how to reread it; reopened as no longer linkable, the session confirms without it',async()=>{
  patchCookingSession(A,session.id,{ state:'abandoned' });
  const linked=await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger'],undefined,{ id:MEAL,version:2 });
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new ApiError('Ce repas est déjà marqué cuisiné.',{ status:409,code:'ALREADY_COOKED' }));
  await expect(confirmCookingSession(A,linked.id,preview)).rejects.toThrow();
  expect(readCookingSessions(A)[0]).toMatchObject({ state:'error',command:null,meal:{ id:MEAL,version:2 },
    error:'Ce repas est déjà marqué cuisiné. Ouvre « Voir la recette » pour relire le repas du menu, puis reprends la cuisine.' });
  const reopened=await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger'],undefined,null);
  expect(reopened.meal).toBeUndefined();
  expect(readCookingSessions(A)[0].meal).toBeUndefined();
  jest.mocked(executeStockCommand).mockResolvedValueOnce(confirmed);
  await confirmCookingSession(A,reopened.id,preview);
  expect(jest.mocked(executeStockCommand).mock.calls[1][0].payload).not.toHaveProperty('meal_plan_entry_id');
});
test('an unrelated refusal keeps its own message',async()=>{
  patchCookingSession(A,session.id,{ state:'abandoned' });
  const linked=await startCookingSession(A,{ id:RECIPE,source:'recipes' },['Mélanger'],undefined,{ id:MEAL,version:2 });
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new ApiError('Stock modifié',{ status:409,code:'CONFLICT' }));
  await expect(confirmCookingSession(A,linked.id,preview)).rejects.toThrow();
  expect(readCookingSessions(A)[0]).toMatchObject({ error:'Stock modifié' });
});
