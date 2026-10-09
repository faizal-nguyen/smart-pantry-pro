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
