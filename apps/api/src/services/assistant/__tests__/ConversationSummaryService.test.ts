import { ConversationSummaryService, SUMMARY_BUDGET } from '../ConversationSummaryService.js';
import { MemoryService } from '../MemoryService.js';
import type { AICompletionClient, AICompletionRequest } from '../../imports/RecipeExtractionService.js';
import { policy, message, USER, CONV } from '../__fixtures__/memory.js';
function setup() {
  const rows=Array.from({length:20},(_,i)=>message({ id:'id-'+i,content:'Étape fictive de cuisine '+i }));
  const memory={ modelArtifacts:jest.fn(async()=>({ messages:rows,summary:null,session:[],privateTerms:[] })),
    persistArtifact:jest.fn(async()=>({ claimed:true })),readPolicySafe:jest.fn(async()=>policy()),recordSummary:jest.fn(async()=>({ id:'summary' })) };
  const ai={ complete:jest.fn(async(_request:AICompletionRequest)=>({ content:'La soupe a été choisie. Le temps de cuisson reste à vérifier.',model:'gpt-4o-mini',usage:{ prompt_tokens:500,completion_tokens:40 } })) };
  const service=new ConversationSummaryService(memory as unknown as MemoryService,ai as AICompletionClient);
  return {rows,memory,ai,service};
}
test('20 uncovered messages trigger one awaited bounded call and actual persistence',async()=>{
  const {service,memory,ai}=setup();const result=await service.maintain(USER,CONV,policy());
  expect(result.status).toBe('saved');expect(result.costUsd).toBeGreaterThan(0);
  expect(ai.complete).toHaveBeenCalledTimes(1);expect(ai.complete).toHaveBeenCalledWith(expect.objectContaining({ max_tokens:320,maxRetries:0,timeoutMs:5000,signal:expect.any(AbortSignal) }));
  expect(ai.complete.mock.calls[0][0].messages[1].content.length).toBeLessThanOrEqual(SUMMARY_BUDGET.inputChars);
  expect(memory.recordSummary).toHaveBeenCalledWith(CONV,USER,expect.objectContaining({ covered_message_ids:expect.arrayContaining(['id-0','id-19']),policy:policy() }));
});
test('history disabled, threshold not reached, or duplicate claim do not call the provider',async()=>{
  const {service,memory,ai,rows}=setup();await service.maintain(USER,CONV,policy({ saveHistory:false }));expect(ai.complete).not.toHaveBeenCalled();
  rows.pop();expect((await service.maintain(USER,CONV,policy())).status).toBe('not_needed');
  rows.push(message());memory.persistArtifact.mockResolvedValueOnce(null);
  expect((await service.maintain(USER,CONV,policy())).status).toBe('already_attempted');expect(ai.complete).not.toHaveBeenCalled();
});
test('revocation during provider call discards the returned summary',async()=>{
  const {service,memory,ai}=setup();ai.complete.mockImplementationOnce(async()=>{memory.readPolicySafe.mockResolvedValue(policy({revision:5}));return { content:'Une soupe.',model:'mock',usage:{prompt_tokens:10,completion_tokens:2} };});
  expect((await service.maintain(USER,CONV,policy())).status).toBe('revision_changed');expect(memory.recordSummary).not.toHaveBeenCalled();
});
test('failed provider call is qualified and no in-progress job or ghost write is announced',async()=>{
  const {service,memory,ai}=setup();ai.complete.mockRejectedValueOnce(new Error('offline'));
  expect(await service.maintain(USER,CONV,policy())).toMatchObject({status:'not_saved',costUnknown:true});expect(ai.complete).toHaveBeenCalledTimes(1);expect(memory.recordSummary).not.toHaveBeenCalled();
});
test('timeout aborts the single call; a late result cannot persist',async()=>{
  jest.useFakeTimers();
  try {
    const {service,memory,ai}=setup();let finish!: (value:Awaited<ReturnType<AICompletionClient['complete']>>)=>void;
    ai.complete.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const running=service.maintain(USER,CONV,policy());await jest.advanceTimersByTimeAsync(5001);
    expect((await running).status).toBe('not_saved');expect(ai.complete.mock.calls[0][0].signal.aborted).toBe(true);
    finish({ content:'Late text',model:'mock',usage:{prompt_tokens:1,completion_tokens:1} });await Promise.resolve();
    expect(memory.recordSummary).not.toHaveBeenCalled();
  } finally {jest.useRealTimers();}
});
