import { ApiError } from '@/lib/api';
import { confirmDiscard,editDiscard,prepareDiscard,readDiscardDraft,abandonDiscardDraft } from '../stockDiscard';
import { executeStockCommand,getStockCommandResult } from '../stockCommands';
import type { StockCommand,StockCommandResult } from '@smart/shared';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',ID='40000000-0000-4000-8000-000000000001',LOT='20000000-0000-4000-8000-000000000001',PRODUCT='10000000-0000-4000-8000-000000000001';
let mockOwner=A,mockEvent:Record<string,unknown>|null=null,mockRecordFailure=false,mockLostStockReply=false;
const mockInsert=jest.fn();
jest.mock('@/integrations/supabase/client',()=>({ supabase:{
  auth:{ getSession:async()=>({ data:{ session:{ user:{ id:mockOwner } } } }) },
  from:()=>{ let row:Record<string,unknown>|null=null;const query={ select:()=>query,eq:()=>query,maybeSingle:async()=>({ data:mockEvent,error:null }),insert:(value:Record<string,unknown>)=>{ row=value;mockInsert(value);return query; },single:async()=>{ mockEvent=row;if (mockRecordFailure) { mockRecordFailure=false;return { data:null,error:new Error('Réponse perdue') }; } return { data:{ id:row!.id },error:null }; } };return query; },
} }));
jest.mock('../stockCommands',()=>({ executeStockCommand:jest.fn(),getStockCommandResult:jest.fn() }));
jest.mock('@/lib/api',()=>({ ApiError:class extends Error { status:number;code:string;constructor(message:string,options:{ status:number;code:string }) { super(message);this.status=options.status;this.code=options.code; } } }));
jest.mock('@/lib/agentEvents',()=>({ dispatchAgentDbChanged:jest.fn() }));
const item={ id:LOT,product_id:PRODUCT,quantity:.3,unit:'kg',stock_version:0,product:{ id:PRODUCT,name:'Farine',category:'Épicerie',unit_type:'g' } };
const receipts=new Map<string,StockCommandResult>();let debits=0;
beforeEach(()=>{
  localStorage.clear();jest.clearAllMocks();mockOwner=A;mockEvent=null;mockRecordFailure=false;mockLostStockReply=false;receipts.clear();debits=0;
  Object.defineProperty(crypto,'randomUUID',{ configurable:true,value:()=>ID });
  jest.mocked(executeStockCommand).mockImplementation(async(command:StockCommand)=>{
    const existing=receipts.get(command.command_id);if (existing) return existing;
    debits++;const receipt:StockCommandResult={ command_id:command.command_id,command_type:'consume_inventory',status:'confirmed',inventory_ids:[LOT],affected_tables:['inventory'] };
    receipts.set(command.command_id,receipt);
    if (mockLostStockReply) { mockLostStockReply=false;throw new Error('Réseau coupé'); }
    return receipt;
  });
  jest.mocked(getStockCommandResult).mockImplementation(async(id)=>{
    const receipt=receipts.get(id);if (!receipt) throw new ApiError('Pas de reçu',{ status:404,code:'COMMAND_NOT_FOUND' });return receipt;
  });
  prepareDiscard(A,item);
});
test('a lost stock reply is checked before the same receipt-only replay; the loss is recorded once in the lot unit',async()=>{
  mockLostStockReply=true;
  await expect(confirmDiscard(A)).rejects.toThrow('Réseau');
  expect(readDiscardDraft(A)?.command?.command_id).toBe(ID);
  expect(()=>editDiscard(A,{ quantity:'1',reason:'other',notes:'',cost:'' })).toThrow('Vérifiez');
  await confirmDiscard(A);
  expect(getStockCommandResult).toHaveBeenCalledWith(ID,A);
  expect(debits).toBe(1);expect(mockInsert).toHaveBeenCalledTimes(1);
  expect(mockEvent).toMatchObject({ id:ID,user_id:A,quantity:.3,unit_type:'kg',reason:'expired' });
  expect(readDiscardDraft(A)).toBeNull();
});
test('lost logging response keeps a confirmed-stock state; reload finds the event without another debit or insertion',async()=>{
  mockRecordFailure=true;
  await expect(confirmDiscard(A)).rejects.toThrow('stock est confirmé');
  expect(readDiscardDraft(A)?.stock_confirmed).toBe(true);
  await confirmDiscard(A);
  expect(debits).toBe(1);expect(mockInsert).toHaveBeenCalledTimes(1);expect(readDiscardDraft(A)).toBeNull();
});
test('account changes, receipt read failures and local storage refusal prevent an additional stock or log write',async()=>{
  mockOwner=B;await expect(confirmDiscard(A)).rejects.toThrow('Reconnectez');expect(debits).toBe(0);expect(mockInsert).not.toHaveBeenCalled();
  mockOwner=A;mockLostStockReply=true;await expect(confirmDiscard(A)).rejects.toThrow();
  jest.mocked(getStockCommandResult).mockRejectedValueOnce(new ApiError('Indisponible',{ status:503,code:'MIGRATION_REQUIRED' }));
  await expect(confirmDiscard(A)).rejects.toThrow('Indisponible');expect(debits).toBe(1);expect(mockInsert).not.toHaveBeenCalled();
  localStorage.clear();prepareDiscard(A,item);
  const spy=jest.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{ throw new Error('Quota'); });
  await expect(confirmDiscard(A)).rejects.toThrow('conserver');expect(debits).toBe(1);spy.mockRestore();
});
test('another product cannot replace an unresolved declaration, and an invalid amount never consumes anything',async()=>{
  expect(()=>prepareDiscard(A,{ ...item,id:'20000000-0000-4000-8000-000000000002' })).toThrow('précédente');
  editDiscard(A,{ quantity:'',reason:'other',notes:'',cost:'' });await expect(confirmDiscard(A)).rejects.toThrow('quantité positive');
  expect(debits).toBe(0);expect(mockInsert).not.toHaveBeenCalled();
  abandonDiscardDraft(A);expect(readDiscardDraft(A)).toBeNull();
  expect(prepareDiscard(A,{ ...item,id:'20000000-0000-4000-8000-000000000002' }).inventory_id).not.toBe(LOT);
});
