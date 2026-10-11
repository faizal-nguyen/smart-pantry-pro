import { ToolHandlerRegistry, type ToolExecutionContext } from '../types.js';
import { registerMemoryHandlers } from '../memory.js';
import type { MemoryService } from '../../MemoryService.js';
import type { CookingJournalService } from '../../../cooking/CookingJournalService.js';
import { USER,CONV,CID,policy,memory,receipt,clientFixture } from '../../__fixtures__/memory.js';
function setup() {
  const service={readPolicySafe:jest.fn(async()=>policy()),readPolicy:jest.fn(async()=>policy()),modelMemories:jest.fn(async()=>[memory()]),
    modelArtifacts:jest.fn(async()=>({messages:[],summary:null})),listConversations:jest.fn(async()=>({items:[{id:CONV}]})),
    saveExtractedFact:jest.fn(async(..._args:Parameters<MemoryService['saveExtractedFact']>)=>receipt()),executeCommand:jest.fn(async()=>receipt()),getCommandReceipt:jest.fn(async()=>null),getMemory:jest.fn(async()=>memory())};
  const db=clientFixture();const registry=new ToolHandlerRegistry();
  registerMemoryHandlers(registry,{memoryService:service as unknown as MemoryService,cookingJournal:{} as CookingJournalService});
  const ctx={userId:USER,userClient:db.client,commandId:CID,requestText:'Souviens-toi que je préfère les plats épicés'} as unknown as ToolExecutionContext;
  return {registry,service,ctx,db};
}
test('the model cannot replace a user fact with an invented allergy or turn a temporary wish into memory',async()=>{
  const {registry,service,ctx}=setup();
  await registry.get('remember_preference')!.execute(ctx,{kind:'preference',content:'Je suis allergique au lait'});
  expect(service.saveExtractedFact.mock.calls[0][2]).toBe(ctx.requestText);
  await registry.get('remember_preference')!.execute({...ctx,requestText:'Ce soir, pas épicé'},{kind:'preference',content:'Je préfère toujours doux'});
  expect(service.saveExtractedFact).toHaveBeenCalledTimes(1);
});
test('reads recheck revocation after filtering and never return the old facts',async()=>{
  const {registry,service,ctx}=setup();service.readPolicySafe.mockResolvedValueOnce(policy()).mockResolvedValueOnce(policy({revision:5,memoryEnabled:false}));
  expect((await registry.get('read_user_memories')!.execute(ctx,{})).result).toEqual({memories:[],policy_revision:null});
});
test('forget requires the user intention and uses a verified existing receipt before any mutation',async()=>{
  const {registry,service,ctx}=setup();
  await expect(registry.get('forget_memory')!.execute({...ctx,requestText:'Bonjour'},{memory_id:memory().id})).rejects.toThrow('INTENT_REQUIRED');
  service.getCommandReceipt.mockResolvedValue(receipt() as never);
  await registry.get('forget_memory')!.execute({...ctx,requestText:'Oublie ce souvenir'},{memory_id:memory().id});
  expect(service.executeCommand).not.toHaveBeenCalled();
});
test('a reminder, negated deletion, or a how-to question cannot authorize a destructive tool',async()=>{
  const {registry,service,ctx}=setup();
  for(const requestText of ["N’oublie pas que j’aime les plats épicés",'Ne supprime surtout pas ce souvenir',"N’efface jamais mes goûts",'Comment oublier un souvenir ?']) {
    await expect(registry.get('forget_memory')!.execute({...ctx,requestText},{memory_id:memory().id})).rejects.toThrow('INTENT_REQUIRED');
  }
  expect(service.executeCommand).not.toHaveBeenCalled();expect(service.getMemory).not.toHaveBeenCalled();
});
test('response style requires an actual user instruction and persists its text rather than a model invention',async()=>{
  const {registry,service,ctx}=setup();await registry.get('update_response_style')!.execute({...ctx,requestText:'Bonjour'},{preference:'Partage ma santé'});
  expect(service.saveExtractedFact).not.toHaveBeenCalled();
  await registry.get('update_response_style')!.execute({...ctx,requestText:'Réponds avec des étapes courtes'},{preference:'Autre préférence'});
  expect(service.saveExtractedFact.mock.calls[0][2]).toBe('Réponds avec des étapes courtes');
});
test('feedback calls the authenticated atomic interaction/journal command and does not claim success after an error',async()=>{
  const {registry,ctx,db}=setup();db.rpc.mockResolvedValue({data:{status:'saved',affects_suggestions:true},error:null});
  const args={recipe_id:memory().id,recipe_source:'user_recipes',recipe_title:'Plat fictif',outcome:'liked'};
  await registry.get('record_recipe_feedback')!.execute(ctx,args);
  expect(db.rpc).toHaveBeenCalledWith('record_assistant_recipe_feedback',{p_feedback:{...args,command_id:CID}});
  db.rpc.mockResolvedValue({data:null,error:{message:'not saved'}});
  await expect(registry.get('record_recipe_feedback')!.execute(ctx,args)).rejects.toThrow('NOT_SAVED');
});
