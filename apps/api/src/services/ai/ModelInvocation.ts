import type { AssistantModelReceipt, AssistantRole, ModelCallReceipt, AssociatedToolCost } from '@smart/shared';
import type { AICompletionClient, AICompletionRequest, AICompletionResponse } from '../imports/RecipeExtractionService.js';
import type { AssistantModelConfig } from './ModelConfig.js';
import { observeModel } from './ModelConfig.js';
import { maximumCallCost, measureCost, PRICING_VERSION } from './ModelPricing.js';
import { ProviderOutputError } from './OpenAITransport.js';

export class ModelInvocation {
  readonly calls:ModelCallReceipt[]=[];
  private readonly toolCosts:AssociatedToolCost[]=[];
  private reserved=0;
  private limitReason:string|null=null;
  private readonly deadline:number;
  constructor(readonly id:string,readonly config:AssistantModelConfig,private readonly ai:AICompletionClient,start=Date.now()) { this.deadline=start+config.limits.deadlineMs; }
  checkWork() { if(Date.now()>=this.deadline) {this.limitReason='deadline';throw new Error('INVOCATION_DEADLINE');} }
  addToolCost(actionId:string,tool:string,usd:number|null) {
    const value=typeof usd==='number'&&Number.isFinite(usd)&&usd>=0 ? usd : null;
    this.toolCosts.push({action_id:actionId,tool,usd:value,quality:value===null ? 'unknown':'estimated'});
    if(value!==null) this.reserved+=value;
    else this.reserved=this.config.limits.maxUsd; // no new paid round after an unpriced paid tool
  }
  receipt():AssistantModelReceipt {
    const incomplete=this.calls.some(c=>c.quality==='unknown')||this.toolCosts.some(c=>c.quality==='unknown');
    const estimated=this.calls.some(c=>c.quality==='estimated')||this.toolCosts.some(c=>c.quality==='estimated');
    const sum=[...this.calls,...this.toolCosts].reduce((n,c)=>n+(c.usd ?? 0),0);
    return {invocation_id:this.id,configuration_version:this.config.version,calls:[...this.calls],associated_tool_costs:[...this.toolCosts],llm_usd:incomplete ? null : sum,
      known_subtotal_usd:this.calls.filter(c=>c.quality==='known').reduce((n,c)=>n+(c.usd ?? 0),0),
      quality:incomplete ? 'unknown' : estimated ? 'estimated' : 'known',limit_reason:this.limitReason,
      disclaimer:'Application estimate, not an OpenAI invoice'};
  }
  async complete(role:AssistantRole,request:Omit<AICompletionRequest,'model'>,purpose:string,stream=false):Promise<AICompletionResponse> {
    this.checkWork();const target=this.config.roles[role];
    if(this.calls.length>=this.config.limits.maxCalls) {this.limitReason='calls';throw new Error('INVOCATION_CALL_LIMIT');}
    const reserve=maximumCallCost(target.model,Buffer.byteLength(JSON.stringify([request.messages,request.tools,request.continuation])),target.maxOutputTokens);
    if(this.reserved+reserve>this.config.limits.maxUsd) {this.limitReason='budget';throw new Error('INVOCATION_COST_LIMIT');}
    this.reserved+=reserve;
    const started=Date.now();const timeout=Math.min(target.timeoutMs,this.deadline-started);const controller=new AbortController();
    let timer:ReturnType<typeof setTimeout>|undefined;
    const req:AICompletionRequest={...request,model:target.model,transport:target.transport,reasoningEffort:target.effort,
      max_tokens:Math.min(request.max_tokens ?? target.maxOutputTokens,target.maxOutputTokens),timeoutMs:timeout,maxRetries:0,signal:controller.signal};
    const row:ModelCallReceipt={role,purpose,transport:target.transport,requested_model:target.model,served_model:null,status:'failed',
      input_tokens:null,output_tokens:null,cached_input_tokens:null,cache_write_tokens:null,reasoning_tokens:null,usd:null,quality:'unknown',reason:'provider_failed_without_usage',pricing_version:PRICING_VERSION,duration_ms:0};
    this.calls.push(row);
    const absorb=(result:AICompletionResponse)=>{
      Object.assign(row,measureCost(result),{served_model:result.model||null,input_tokens:result.usageKnown===false ? null : result.usage?.prompt_tokens ?? null,
        output_tokens:result.usageKnown===false ? null : result.usage?.completion_tokens ?? null,cached_input_tokens:result.usage?.cached_tokens ?? null,cache_write_tokens:result.usage?.cache_write_tokens ?? null,reasoning_tokens:result.usage?.reasoning_tokens ?? null});
      observeModel(this.config,role,result.model);
    };
    try {
      const work=async()=>{
        if(!stream) return this.ai.complete(req);
        if(!this.ai.completeStream) throw new Error('STREAM_NOT_SUPPORTED');
        let terminal:AICompletionResponse|undefined;
        for await(const event of this.ai.completeStream(req)) if(event.done) terminal=event;
        if(!terminal) throw new Error('PROVIDER_STREAM_MISSING_TERMINAL');return terminal;
      };
      const limit=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('PROVIDER_TIMEOUT'));},timeout);});
      const result=await Promise.race([work(),limit]);absorb(result);row.status='completed';return result;
    } catch(error) {
      if(error instanceof ProviderOutputError && error.measured) absorb(error.measured);
      throw error;
    } finally { if(timer) clearTimeout(timer);row.duration_ms=Date.now()-started; }
  }
}
