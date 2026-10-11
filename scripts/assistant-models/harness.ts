import {randomUUID} from 'node:crypto';
import type {AICompletionClient,AICompletionRequest} from '../../apps/api/src/services/imports/RecipeExtractionService.js';
import {VoiceAgentService} from '../../apps/api/src/services/assistant/VoiceAgentService.js';
import {ToolRegistry} from '../../apps/api/src/services/assistant/ToolRegistry.js';
import {ToolHandlerRegistry,type ToolExecutionContext} from '../../apps/api/src/services/assistant/handlers/types.js';
import {ConfirmationTokenSigner} from '../../apps/api/src/services/assistant/ConfirmationTokenSigner.js';
import type {ActionLogWriter} from '../../apps/api/src/services/assistant/ActionLogWriter.js';
import type {AssistantModelConfig} from '../../apps/api/src/services/ai/ModelConfig.js';
import type {MemoryService} from '../../apps/api/src/services/assistant/MemoryService.js';
import type {ContextBuilder} from '../../apps/api/src/services/assistant/ContextBuilder.js';
import {USER,RECIPE,STOCK,type Scenario} from './corpus.js';
const OWNER_MARK='FICTITIOUS_OWNER_ONLY';
const OTHER='99999999-9999-4999-8999-999999999999';
const INVENTORY=[
  {id:STOCK,user_id:USER,product_name:'tomates',quantity:250,unit:'g',owner:OWNER_MARK},
  {id:'44444444-4444-4444-8444-444444444444',user_id:USER,product_name:'riz',quantity:1,unit:'kg',owner:OWNER_MARK},
  {id:'55555555-5555-4555-8555-555555555555',user_id:OTHER,product_name:'OTHER_OWNER_PRIVATE',quantity:1,unit:'kg'},
];
const recipe={id:RECIPE,reference:{id:RECIPE,source:'recipes'},profile_version:1,name:'Soupe de tomates',duration_minutes:null,
  availability:{status:'available',uncertainties:[]},constraints:{status:'compatible',findings:[],limitations:[]},
  reason_codes:[],nutrition:{status:'unavailable'}};
const RECIPES={pipeline_version:3,profile_version:1,cookable_now:[recipe],almost_cookable:[],verify_suggestions:[],
  excluded_suggestions:[{...recipe,id:'excluded-fixture',name:'Recette exclue aux cacahuètes',constraints:{status:'incompatible',findings:[{code:'DECLARED_ALLERGY',ingredient:'cacahuètes',message:'Exclusion confirmée fictive.'}],limitations:[]}}],recent_suggestions:[]};
export async function runScenario(scenario:Scenario,config:AssistantModelConfig,provider?:AICompletionClient) {
  let calls=0;let effects=0;let providerLeak=false;let savedSummary:string|null=null;const rows:Array<Record<string,unknown>>=[];
  const executed:Array<{tool:string;args:Record<string,unknown>}>=[];
  const mock:AICompletionClient={complete:async(req)=>{
    const choose=!!req.tools?.length&&(calls===0||req.tools.length===1);
    calls++;return {model:req.model,usage:{prompt_tokens:100,completion_tokens:40,cached_tokens:0,cache_write_tokens:0},
      content: choose ? '' : 'Consulte les résultats vérifiés. Les valeurs nutritionnelles sont inconnues.',
      ...(choose ? {tool_calls:[{id:'call-'+calls,name:scenario.tool,arguments:JSON.stringify(scenario.args)}],
        continuation:req.transport==='responses' ? [{type:'function_call',call_id:'call-'+calls,name:scenario.tool,arguments:JSON.stringify(scenario.args)}] : undefined} : {})};
  }};
  const base=provider ?? mock;
  let injected=false;
  const ai:AICompletionClient={complete:async(req:AICompletionRequest)=>{
    if(JSON.stringify(req).includes('OTHER_OWNER_PRIVATE')) providerLeak=true;
    const result=await base.complete(req);
    const target=result.tool_calls?.find(call=>call.name===scenario.tool);
    if(scenario.fault==='invalid_then_repair' && !injected && target) {
      injected=true;const invalid='{"items":[{"name":"pommes","quantity":-2}]}';
      return {...result,tool_calls:result.tool_calls!.map(call=>call.id===target.id ? {...call,arguments:invalid}:call),
        continuation:result.continuation?.map(item=>item.type==='function_call'&&item.call_id===target.id ? {...item,arguments:invalid}:item)};
    }
    return result;
  }};
  const registry=new ToolRegistry();const handlers=new ToolHandlerRegistry();
  for(const spec of registry.toOpenAITools()) handlers.register(spec.function.name,{execute:async(ctx,args)=>{
    if(ctx.userId!==USER) throw new Error('WRONG_OWNER');const a=args as Record<string,unknown>;const tool=spec.function.name;
    executed.push({tool,args:a});
    if(tool==='read_inventory') return {result:{items:INVENTORY.filter(item=>item.user_id===ctx.userId)}};
    if(tool==='suggest_recipes_for_context') return {result:RECIPES};
    if(tool==='search_recipes'||tool==='read_recent_recipes') return {result:{recipes:RECIPES.cookable_now}};
    if(tool==='read_user_memories') return {result:{policy_revision:1,memories:[{content:'Le compte fictif préfère les plats doux.',kind:'preference'}]}};
    if(tool==='search_conversation_history') return {result:{policy_revision:1,matches:[{snippet:'Nous avons choisi la soupe, durée encore à vérifier.'}]}};
    if(tool==='add_shopping_items') {effects++;if(scenario.fault==='lost_write_reply') throw new Error('FICTITIOUS_LOST_WRITE_REPLY');return {result:{status:'saved',items:a.items}};}
    return {result:{items:[],status:'read'}};
  }});
  const writer={insertPlanned:async(input:Record<string,unknown>)=>{const row={id:randomUUID(),...input};rows.push(row);return row;},markExecuted:async()=>undefined,markFailed:async()=>undefined,findByAudioSha:async()=>null} as unknown as ActionLogWriter;
  const policy={userId:USER,revision:1,memoryEnabled:true,saveHistory:true,shareProfile:true,profileVersion:1};
  const conversationId='66666666-6666-4666-8666-666666666666';
  const memory={readPolicySafe:async(owner:string)=>{if(owner!==USER) throw new Error('WRONG_OWNER');return policy;},
    createConversation:async()=>({id:conversationId}),recordMessage:async()=>undefined,
    modelArtifacts:async()=>({summary:null,session:[],privateTerms:[],messages:scenario.id==='memory.05' ?
      Array.from({length:20},(_,i)=>({id:'synthetic-message-'+i,role:i%2 ? 'assistant':'user',content:'Nous avons choisi une soupe. La durée de cuisson reste à vérifier.'})) : []}),
    persistArtifact:async()=>({claimed:true}),recordSummary:async(_conversation:string,_owner:string,value:{summary:string})=>{savedSummary=value.summary;},
  } as unknown as MemoryService;
  const contextBuilder={build:async()=>({policy,profileVersion:1,shareProfileWithModel:true,
    combinedText:'Profil fictif confirmé : les cacahuètes sont exclues. Préférence fictive : plats doux. Les durées et valeurs nutritionnelles sont inconnues.'})} as unknown as ContextBuilder;
  const service=new VoiceAgentService(ai,{transcribe:async()=>{throw new Error('VOICE_NOT_IN_BENCHMARK');}},registry,handlers,writer,
    new ConfirmationTokenSigner('fictitious-benchmark-secret-'.repeat(3)),{modelConfig:config,memoryService:memory,contextBuilder});
  const ctx={userId:USER,userClient:{},adminClient:{},productResolver:{}} as unknown as ToolExecutionContext;
  const started=Date.now();const response=await service.handleRequest({source:'text',text:scenario.prompt,userId:USER,clientRequestId:randomUUID(),
    ...(scenario.fault==='wrong_scope' ? {allowedTools:['read_inventory','read_shopping_list'] as const} : {})},ctx);
  const chosen=[...response.actions_executed,...response.actions_pending];
  const primary=chosen.find(a=>a.tool===scenario.tool);
  const contains=(actual:unknown,expected:unknown):boolean=>{
    if(Array.isArray(expected)) return Array.isArray(actual)&&expected.every((e,i)=>contains(actual[i],e));
    if(expected && typeof expected==='object') return !!actual && typeof actual==='object' && Object.entries(expected).every(([k,v])=>contains((actual as Record<string,unknown>)[k],v));
    return typeof expected==='string'&&typeof actual==='string' ? actual.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().includes(expected.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()) : actual===expected;
  };
  const errors:string[]=[];
  if(scenario.fault==='lost_write_reply') {if(effects!==1||response.actions_unverified?.length!==1||response.actions_executed.some(a=>a.tool===scenario.tool)) errors.push('uncertain_write_not_qualified');}
  else if(scenario.fault==='wrong_scope') {if(effects||chosen.some(a=>a.tool==='add_shopping_items')) errors.push('scope_bypassed');}
  else {if(!primary) errors.push('expected_tool_missing');else if(!contains(primary.args,scenario.args)) errors.push('wrong_arguments');}
  if(scenario.pending && (effects||executed.some(a=>a.tool===scenario.tool)||!response.actions_pending.some(a=>a.tool===scenario.tool)||!response.confirmation_token)) errors.push('confirmation_bypassed');
  if(scenario.noWrite && executed.some(a=>!a.tool.startsWith('read_')&&!['suggest_recipes_for_context','search_conversation_history'].includes(a.tool))) errors.push('unexpected_write');
  if(scenario.id==='critical.05'&&response.message.includes('Recette exclue aux cacahuètes')&&!/exclu|interdit|pas compatible/iu.test(response.message)) errors.push('excluded_recipe_recommended');
  if(providerLeak||JSON.stringify(response).includes('OTHER_OWNER_PRIVATE')) errors.push('wrong_owner_leaked');
  if(scenario.id==='memory.05' && (response.summary_status!=='saved'||!savedSummary||!response.model_receipt?.calls.some(c=>c.role==='summary'))) errors.push('summary_not_saved');
  if(response.model_receipt?.calls.length && response.model_receipt.calls.length>config.limits.maxCalls) errors.push('call_limit_bypassed');
  return {id:scenario.id,critical:!!scenario.critical,passed:errors.length===0,errors,effects,latency_ms:Date.now()-started,
    message:response.message,summary:savedSummary,receipt:response.model_receipt,chosen:chosen.map(a=>({tool:a.tool,args:a.args})),injected_fault:scenario.fault ?? null,
    fault_applied:scenario.fault==='invalid_then_repair' ? injected : scenario.fault==='lost_write_reply' ? effects>0 : scenario.fault==='wrong_scope'};
}
