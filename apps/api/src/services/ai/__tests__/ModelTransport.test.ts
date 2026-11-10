import { completionParams,parseCompletion,createOpenAICompletionClient,ProviderOutputError,providerErrorSummary } from '../OpenAITransport.js';
import { measureCost } from '../ModelPricing.js';
import { benchmarkConfig,freezeConfig,loadAssistantModelConfig,modelCatalog,observeModel } from '../ModelConfig.js';
import { ModelInvocation } from '../ModelInvocation.js';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {AICompletionRequest,AICompletionResponse} from '../../imports/RecipeExtractionService.js';
const request:AICompletionRequest={model:'gpt-6.1-sol',transport:'responses',reasoningEffort:'low',messages:[{role:'user',content:'Une soupe'}],temperature:0.2,max_tokens:500,
  tools:[{type:'function',function:{name:'read_inventory',description:'Stock',parameters:{type:'object',properties:{location:{type:'string'}}}}}]};
const raw={model:'gpt-6-luna',status:'completed',usage:{input_tokens:100,output_tokens:20,input_tokens_details:{cached_tokens:40,cache_write_tokens:10},output_tokens_details:{reasoning_tokens:5}},
  output:[{type:'reasoning',id:'reason1',encrypted_content:'opaque',summary:[{text:'PRIVATE REASONING'}]},
    {type:'message',content:[{type:'output_text',text:'Première partie'},{type:'output_text',text:'Deuxième partie'}]},
    {type:'function_call',id:'item1',call_id:'call1',name:'read_inventory',arguments:'{}'},
    {type:'function_call',id:'item2',call_id:'call2',name:'read_shopping_list',arguments:'{}'}]};
test('Web search is bounded, required, cited and priced from actual search receipts',async()=>{
  const params=completionParams({...request,tools:undefined,webSearch:{allowedDomains:['marmiton.org'],maxCalls:2}});
  expect(params).toMatchObject({tool_choice:'required',max_tool_calls:2,tools:[{type:'web_search',filters:{allowed_domains:['marmiton.org']}}]});
  expect(()=>completionParams({...request,webSearch:{allowedDomains:[],maxCalls:2}})).toThrow('WEB_SEARCH_TRANSPORT_INVALID');
  const response=parseCompletion({...raw,output:[{type:'web_search_call',action:{type:'search'}},
    {type:'message',content:[{type:'output_text',text:'Une soupe',annotations:[{type:'url_citation',url:'https://marmiton.org/soupe',title:'Soupe'}]}]}]},'responses');
  expect(response.webSearch).toEqual({searchCalls:1,citations:[{url:'https://marmiton.org/soupe',title:'Soupe'}]});
  const ai={complete:jest.fn(async()=>response)},invocation=new ModelInvocation('web',freezeConfig({...benchmarkConfig('luna'),version:'web-isolated-test'}),ai);
  await invocation.complete('dialogue',{messages:[],webSearch:{allowedDomains:['marmiton.org'],maxCalls:2}},'search');
  expect(invocation.receipt().llm_usd).toBeCloseTo(measureCost(response).usd!+0.01,8);
  const limited=freezeConfig({...benchmarkConfig('luna'),limits:{...benchmarkConfig('luna').limits,maxUsd:0.01}});
  await expect(new ModelInvocation('capped',limited,ai).complete('dialogue',{messages:[],webSearch:{allowedDomains:[],maxCalls:2}},'search')).rejects.toThrow('COST_LIMIT');
  expect(ai.complete).toHaveBeenCalledTimes(1);
});
test('Responses reads every useful item, associates call_id, and only retains encrypted reasoning',()=>{
  const result=parseCompletion(raw,'responses');expect(result.content).toBe('Première partie\nDeuxième partie');
  expect(result.tool_calls?.map(t=>t.id)).toEqual(['call1','call2']);expect(JSON.stringify(result.continuation)).not.toContain('PRIVATE REASONING');
  expect(result.continuation?.[0]).toMatchObject({encrypted_content:'opaque',summary:[]});
});
test('wire parameters preserve optional schemas, use text.format, and drop incompatible sampling',()=>{
  const params=completionParams({...request,response_format:{type:'json_object'},continuation:[{type:'function_call_output',call_id:'call1',output:'{"status":"failed"}'}]});
  expect(params).toMatchObject({store:false,text:{format:{type:'json_object'}},reasoning:{effort:'low'},max_output_tokens:500});
  expect(params).not.toHaveProperty('temperature');expect(params).not.toHaveProperty('response_format');expect(params).not.toHaveProperty('max_tokens');
  expect(params.tools).toEqual([expect.objectContaining({name:'read_inventory',strict:false})]);
  expect((params.input as unknown[])[1]).toMatchObject({call_id:'call1',output:'{"status":"failed"}'});
  expect(completionParams({...request,reasoningEffort:'none'})).toHaveProperty('temperature',0.2);
});
test.each(['incomplete','failed','cancelled'])('rejects %s output before a tool can execute',status=>expect(()=>parseCompletion({...raw,status},'responses')).toThrow(ProviderOutputError));
test('refusal, malformed calls, duplicate call IDs and missing encrypted replay are rejected',()=>{
  expect(()=>parseCompletion({...raw,output:[{type:'message',content:[{type:'refusal',refusal:'no'}]}]},'responses')).toThrow();
  expect(()=>parseCompletion({...raw,output:[{type:'function_call',name:'read_inventory',arguments:'{}'}]},'responses')).toThrow();
  expect(()=>parseCompletion({...raw,output:[raw.output[2],raw.output[2]]},'responses')).toThrow();
  expect(()=>parseCompletion({...raw,output:[{type:'reasoning',summary:[]}]},'responses')).toThrow();
});
test('usage with cache writes and reasoning is counted once at verified standard prices',()=>{
  const result=parseCompletion(raw,'responses');const cost=measureCost(result);
  expect(cost.quality).toBe('known');expect(cost.usd).toBeCloseTo((50*0.1+40*0.01+10*0.125+20*0.5)/1e6,12);
  expect(measureCost({...result,model:'future-alias'})).toMatchObject({usd:null,quality:'unknown'});
  expect(measureCost({...result,model:'__proto__'})).toMatchObject({usd:null,quality:'unknown'});
  expect(measureCost({...result,usageKnown:false})).toMatchObject({usd:null,quality:'unknown'});
  expect(measureCost({...result,usage:{...result.usage,cached_tokens:1000}})).toMatchObject({usd:null,quality:'unknown'});
  expect(measureCost({...result,usage:{prompt_tokens:100,completion_tokens:20}}).quality).toBe('estimated');
  expect(measureCost({...result,serviceTier:'fast'}).usd).toBeNull();
});
test('old chat extraction keeps JSON mode and does not synthesize an observed usage/model',async()=>{
  const create=jest.fn(async(_params:Record<string,unknown>,_options:Record<string,unknown>)=>({choices:[{message:{content:'{"title":"Soupe"}'},finish_reason:'stop'}]}));
  const client=createOpenAICompletionClient({sdk:async()=>({chat:{completions:{create}},responses:{create}})});
  const result=await client.complete({...request,transport:'chat_completions',tools:undefined,response_format:{type:'json_object'}});
  expect(create.mock.calls[0]).toEqual([expect.objectContaining({store:false,response_format:{type:'json_object'},max_tokens:500}),expect.objectContaining({maxRetries:0})]);
  expect(result.model).toBe('');expect(result.usageKnown).toBe(false);expect(measureCost(result).usd).toBeNull();
});
test('both streams expose deltas and an actual terminal usage; Responses requires completion',async()=>{
  const create=jest.fn(async(params:Record<string,unknown>)=>(async function*(){
    if(params.input) {yield {type:'response.output_text.delta',delta:'Première partie'};yield {type:'response.completed',response:{...raw,output:[raw.output[1]]}};}
    else {yield {model:'gpt-4o-mini',choices:[{delta:{content:'Soupe'},finish_reason:'stop'}]};yield {usage:{prompt_tokens:5,completion_tokens:2},choices:[]};}
  })());
  const client=createOpenAICompletionClient({sdk:async()=>({chat:{completions:{create}},responses:{create}})});
  for(const transport of ['responses','chat_completions'] as const) {
    const events=[];for await(const event of client.completeStream!({...request,tools:undefined,transport})) events.push(event);
    expect(events[0].done).toBe(false);expect(events[events.length-1]).toMatchObject({done:true,usageKnown:true});
  }
});
test.each(['chat_completions','responses'] as const)('an interrupted %s stream is rejected even if it emitted text',async transport=>{
  const create=async()=>(async function*(){yield transport==='responses' ? {type:'response.output_text.delta',delta:'partial'} : {model:'gpt-4o-mini',choices:[{delta:{content:'partial'}}]};})();
  const client=createOpenAICompletionClient({sdk:async()=>({chat:{completions:{create}},responses:{create}})});
  await expect((async()=>{for await(const _event of client.completeStream!({...request,tools:undefined,transport})) { /* consume */ }})()).rejects.toThrow('MISSING_TERMINAL');
});
test('invocation sums success/failure/summary, times out once, and preserves unknown subtotal',async()=>{
  const response:AICompletionResponse={model:'gpt-4o-mini',content:'ok',usage:{prompt_tokens:100,completion_tokens:20,cached_tokens:0}};
  const ai={complete:jest.fn().mockResolvedValueOnce(response).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response)};
  const invocation=new ModelInvocation('id',benchmarkConfig('baseline'),ai);
  await invocation.complete('dialogue',{messages:[]},'first');await expect(invocation.complete('dialogue',{messages:[]},'synthesis')).rejects.toThrow();
  await invocation.complete('summary',{messages:[]},'summary');expect(invocation.receipt()).toMatchObject({quality:'unknown',llm_usd:null,calls:expect.any(Array)});
  expect(invocation.receipt().known_subtotal_usd).toBeGreaterThan(0);expect(ai.complete).toHaveBeenCalledTimes(3);
});
test('deadline, call and reserve caps prevent dispatch, including after a failed call',async()=>{
  const config=benchmarkConfig('baseline'),ai={complete:jest.fn(async()=>parseCompletion({...raw,model:'gpt-4o-mini'},'responses'))};
  const countLimited=new ModelInvocation('id',freezeConfig({...config,roles:{...config.roles},limits:{...config.limits,maxCalls:1}}),ai);
  await countLimited.complete('dialogue',{messages:[]},'first');await expect(countLimited.complete('dialogue',{messages:[]},'second')).rejects.toThrow('CALL_LIMIT');
  const budgetLimited=new ModelInvocation('id',freezeConfig({...config,roles:{...config.roles},limits:{...config.limits,maxUsd:0.00000001}}),ai);
  await expect(budgetLimited.complete('dialogue',{messages:[]},'first')).rejects.toThrow('COST_LIMIT');expect(ai.complete).toHaveBeenCalledTimes(1);
  const expired=new ModelInvocation('id',config,ai,Date.now()-60000);await expect(expired.complete('dialogue',{messages:[]},'first')).rejects.toThrow('DEADLINE');
});
test('gpt-6-luna is the adopted default with no approval file; gpt-4o-mini only when chosen; an unapproved candidate serves luna',()=>{
  for(const env of [{},{ASSISTANT_MODEL_PRESET:'luna'}]) {
    const config=loadAssistantModelConfig(env);
    expect(config).toMatchObject({preset:'luna',activation:'owner_adopted'});
    expect(Object.values(config.roles).map(role=>role.model)).toEqual(['gpt-6-luna','gpt-6-luna','gpt-6-luna','gpt-6-luna']);
  }
  expect(loadAssistantModelConfig({ASSISTANT_MODEL_PRESET:'baseline'})).toMatchObject({preset:'baseline',activation:'baseline',roles:{dialogue:{model:'gpt-4o-mini'}}});
  const error=jest.spyOn(console,'error').mockImplementation(()=>undefined);
  expect(loadAssistantModelConfig({ASSISTANT_MODEL_PRESET:'luna-sol'})).toMatchObject({preset:'luna',activation:'owner_adopted'});
  expect(error).toHaveBeenCalledWith(expect.stringContaining('serving luna'));error.mockRestore();
  expect(modelCatalog(loadAssistantModelConfig({}),'prices').activation).toBe('owner_adopted');
  expect(()=>loadAssistantModelConfig({ASSISTANT_MODEL_PRESET:'invented'})).toThrow('PRESET_INVALID');
  expect(modelCatalog(benchmarkConfig('baseline'),'prices').roles).toHaveLength(4);
  const config=benchmarkConfig('baseline');expect(Reflect.set(config.roles.dialogue,'model','gpt-4o')).toBe(false);
});
test('only a complete reviewed live report can enable a candidate, including when adoption was manually claimed',()=>{
  const directory=mkdtempSync(join(tmpdir(),'v10-model-approval-'));
  const path=join(directory,'approval.json');
  const reviewed={mode:'live',environment:'local-fictitious',is_fictitious:true,corpus_version:'v10-03d-40-v1',
    configuration_versions:{'luna-sol':benchmarkConfig('luna-sol').version},scenario_count:40,critical_count:12,
    observed_cost_complete:true,stop_reason:null,finished_at:new Date().toISOString(),
    availability:{'gpt-6-luna':{accessible:true},'gpt-6.1-sol':{accessible:true}},
    criteria:{correct_rate:0.95,critical_failures:0,p95_ratio:1.6,cost_per_success_ratio:1},
    decisions:{'luna-sol':{decision:'adopt',completed_trials:120,critical_failures:0,correct_rate:0.975,
      latency_pass:true,cost_pass:true,human_review:{status:'approved',reviewer:'Fictitious test reviewer'}}}};
  const load=(report:unknown)=>{writeFileSync(path,JSON.stringify(report));return loadAssistantModelConfig({ASSISTANT_MODEL_PRESET:'luna-sol',ASSISTANT_MODEL_APPROVAL_FILE:path});};
  const candidate=reviewed.decisions['luna-sol'];
  const error=jest.spyOn(console,'error').mockImplementation(()=>undefined);
  try {
    expect(load(reviewed)).toMatchObject({preset:'luna-sol',activation:'benchmark_approved',roles:{culinary:{model:'gpt-6.1-sol'}}});
    for(const report of [{...reviewed,mode:'offline'},{...reviewed,observed_cost_complete:false},
      {...reviewed,decisions:{'luna-sol':{...candidate,correct_rate:undefined}}},
      {...reviewed,decisions:{'luna-sol':{...candidate,critical_failures:1}}},
      {...reviewed,decisions:{'luna-sol':{...candidate,latency_pass:false}}},
      {...reviewed,criteria:{...reviewed.criteria,p95_ratio:1.15}},
      {...reviewed,finished_at:new Date(Date.now()-31*86400000).toISOString()},
      {...reviewed,decisions:{'luna-sol':{...candidate,human_review:{status:'pending',reviewer:null}}}}])
      expect(load(report)).toMatchObject({preset:'luna',activation:'owner_adopted'});
    expect(error).toHaveBeenCalledTimes(8);
  } finally {rmSync(directory,{recursive:true,force:true});error.mockRestore();}
});
test('an observation for one configuration is not a verification of another',()=>{
  const baseline=benchmarkConfig('baseline');observeModel(baseline,'dialogue','gpt-4o-mini-2024-07-18');
  expect(modelCatalog(baseline,'prices').roles[0].verification).toBe('observed_in_process');
  expect(modelCatalog(benchmarkConfig('luna'),'prices').roles[0].verification).toBe('not_observed');
});
test('associated paid tool estimates are included, while an unknown surcharge stops further dispatch',async()=>{
  const ai={complete:jest.fn(async()=>({model:'gpt-4o-mini',content:'ok',usage:{prompt_tokens:10,completion_tokens:2}}))};
  const invocation=new ModelInvocation('id',benchmarkConfig('baseline'),ai);
  await invocation.complete('dialogue',{messages:[]},'first');invocation.addToolCost('action-1','paid-tool',0.01);
  expect(invocation.receipt()).toMatchObject({quality:'estimated',associated_tool_costs:[{usd:0.01}]});
  expect(invocation.receipt().llm_usd).toBeGreaterThan(0.01);
  invocation.addToolCost('action-2','unknown-tool',null);expect(invocation.receipt().llm_usd).toBeNull();
  await expect(invocation.complete('dialogue',{messages:[]},'second')).rejects.toThrow('COST_LIMIT');expect(ai.complete).toHaveBeenCalledTimes(1);
});
test('a failed call is summarised without its free-text message, which can quote the API key or the user',()=>{
  const sdk=Object.assign(new Error('Incorrect API key provided: sk-proj-abcd****wxyz'),{name:'AuthenticationError',status:401,code:'invalid_api_key',type:'invalid_request_error'});
  expect(providerErrorSummary(sdk)).toEqual({name:'AuthenticationError',status:401,code:'invalid_api_key',type:'invalid_request_error'});
  expect(providerErrorSummary(new Error('PROVIDER_TIMEOUT'))).toEqual({name:'Error',code:'PROVIDER_TIMEOUT'});
  expect(providerErrorSummary(new ProviderOutputError('PROVIDER_TOOL_INVALID'))).toEqual({name:'Error',code:'PROVIDER_TOOL_INVALID'});
  expect(providerErrorSummary(new Error('ajoute 1 pot de tahini'))).toEqual({name:'Error'});
  expect(providerErrorSummary('boom')).toEqual({name:'unknown'});
});
test('images ride with their user message in both transports, high detail by default',()=>{
  const messages=[{role:'system' as const,content:'Liste'},{role:'user' as const,content:'Mes courses',images:[{url:'data:image/jpeg;base64,AAAA'}]}];
  const chat=completionParams({model:'gpt-4o-mini',transport:'chat_completions',messages});
  expect(chat.messages).toEqual([{role:'system',content:'Liste'},{role:'user',content:[{type:'text',text:'Mes courses'},{type:'image_url',image_url:{url:'data:image/jpeg;base64,AAAA',detail:'high'}}]}]);
  const responses=completionParams({model:'gpt-6-luna',transport:'responses',reasoningEffort:'none',messages});
  expect(responses.input).toEqual([{role:'system',content:'Liste'},{role:'user',content:[{type:'input_text',text:'Mes courses'},{type:'input_image',image_url:'data:image/jpeg;base64,AAAA',detail:'high'}]}]);
});
test('a photo reserves its image tokens, not the size of its base64',async()=>{
  const base=benchmarkConfig('baseline');
  const config=freezeConfig({...base,roles:{...base.roles,vision:{model:'gpt-6.1-sol',transport:'responses',effort:'low',maxOutputTokens:1500,timeoutMs:30000}},limits:{...base.limits}});
  const ai={complete:jest.fn(async()=>parseCompletion({...raw,model:'gpt-6.1-sol'},'responses'))};
  const photo='data:image/jpeg;base64,'+'A'.repeat(1_400_000);
  await new ModelInvocation('id',config,ai).complete('vision',{messages:[{role:'user',content:'x',images:[1,2,3,4].map(()=>({url:photo}))}]},'grocery_photo');
  expect(ai.complete).toHaveBeenCalledTimes(1);
});
test('photos have their own role: gpt-6-luna by default, gpt-6.1-sol on request, nothing older',()=>{
  for(const preset of ['baseline','luna','luna-sol'] as const) expect(benchmarkConfig(preset).roles.vision).toMatchObject({model:'gpt-6-luna',transport:'responses',effort:'none'});
  expect(loadAssistantModelConfig({ASSISTANT_VISION_MODEL:'gpt-6.1-sol'}).roles.vision).toMatchObject({model:'gpt-6.1-sol',transport:'responses',effort:'low'});
  expect(()=>loadAssistantModelConfig({ASSISTANT_VISION_MODEL:'gpt-4o-mini'})).toThrow('ASSISTANT_VISION_MODEL_UNSUPPORTED');
});
