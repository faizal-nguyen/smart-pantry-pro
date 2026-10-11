import OpenAI from 'openai';
import type { AICompletionClient, AICompletionRequest, AICompletionResponse, AICompletionStreamEvent } from '../imports/RecipeExtractionService.js';

type ObjectValue = Record<string, unknown>;
const obj = (value: unknown): ObjectValue => value && typeof value === 'object' ? value as ObjectValue : {};
const str = (value: unknown): string => typeof value === 'string' ? value : '';
const count = (value: unknown): number | undefined => typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
export interface ProviderSDK {
  chat: { completions: { create(params: ObjectValue, options: ObjectValue): Promise<unknown> } };
  responses: { create(params: ObjectValue, options: ObjectValue): Promise<unknown> };
}
export class ProviderOutputError extends Error {
  constructor(readonly code: string, readonly measured?: AICompletionResponse) { super(code); }
}
export function completionParams(req: AICompletionRequest, stream = false): ObjectValue {
  if (req.transport !== 'responses') {
    if (req.continuation?.length) throw new Error('CHAT_CONTINUATION_NOT_SUPPORTED');
    return { model:req.model, messages:req.messages, store:false, stream, service_tier:'default',
      ...(req.temperature !== undefined ? { temperature:req.temperature } : {}),
      ...(req.max_tokens !== undefined ? { max_tokens:req.max_tokens } : {}),
      ...(req.response_format ? { response_format:req.response_format } : {}),
      ...(req.tools?.length ? { tools:req.tools,tool_choice:req.tool_choice ?? 'auto' } : {}),
      ...(stream ? { stream_options:{include_usage:true} } : {}),
    };
  }
  if (JSON.stringify(req.continuation ?? []).length > 48000) throw new Error('CONTINUATION_LIMIT');
  return { model:req.model, store:false, stream, service_tier:'default',
    input: [...req.messages,...(req.continuation ?? [])], max_output_tokens:req.max_tokens,
    ...(req.reasoningEffort ? { reasoning:{effort:req.reasoningEffort},include:['reasoning.encrypted_content'] } : {}),
    ...(req.reasoningEffort === 'none' && req.temperature !== undefined ? {temperature:req.temperature} : {}),
    // Explicit non-strict mode preserves the optional legacy tool fields. Zod remains authoritative.
    ...(req.tools?.length ? { tools:req.tools.map(t=>({type:'function',...t.function,strict:false})),tool_choice:req.tool_choice ?? 'auto',parallel_tool_calls:false } : {}),
    ...(req.response_format ? { text:{format:req.response_format} } : {}),
  };
}
export function parseCompletion(raw: unknown, transport: 'responses'|'chat_completions'): AICompletionResponse {
  const r=obj(raw); const u=obj(r.usage); const responses=transport==='responses';
  const input=count(responses ? u.input_tokens : u.prompt_tokens), output=count(responses ? u.output_tokens : u.completion_tokens);
  const detail=obj(responses ? u.input_tokens_details : u.prompt_tokens_details);
  const outDetail=obj(responses ? u.output_tokens_details : u.completion_tokens_details);
  const measured: AICompletionResponse={content:'',model:str(r.model),usage:{prompt_tokens:input ?? 0,completion_tokens:output ?? 0,
    ...(count(detail.cached_tokens)!==undefined ? {cached_tokens:count(detail.cached_tokens)} : {}),
    ...(count(detail.cache_write_tokens)!==undefined ? {cache_write_tokens:count(detail.cache_write_tokens)} : {}),
    ...(count(outDetail.reasoning_tokens)!==undefined ? {reasoning_tokens:count(outDetail.reasoning_tokens)} : {})},
    usageKnown:input!==undefined&&output!==undefined, serviceTier:str(r.service_tier)||undefined};
  if (!responses) {
    const choice=obj(Array.isArray(r.choices) ? r.choices[0] : null); const message=obj(choice.message);
    measured.content=str(message.content);
    measured.tool_calls=(Array.isArray(message.tool_calls)?message.tool_calls:[]).map(value=>{
      const call=obj(value), fn=obj(call.function);return {id:str(call.id),name:str(fn.name),arguments:str(fn.arguments)};
    });
    if (message.refusal || ['length','content_filter'].includes(str(choice.finish_reason))) throw new ProviderOutputError('PROVIDER_OUTPUT_REJECTED',measured);
  } else {
    const texts:string[]=[]; const calls:NonNullable<AICompletionResponse['tool_calls']>=[]; const continuation:ObjectValue[]=[];
    let refused=false;
    for (const value of Array.isArray(r.output)?r.output:[]) {
      const item=obj(value);
      if (item.type==='message') for(const part of Array.isArray(item.content)?item.content:[]) {
        const content=obj(part);if(content.type==='output_text') texts.push(str(content.text));if(content.type==='refusal') refused=true;
      }
      if (item.type==='function_call') {
        const call={id:str(item.call_id),name:str(item.name),arguments:str(item.arguments)};
        if(!call.id||!call.name||!call.arguments) throw new ProviderOutputError('PROVIDER_TOOL_INVALID',measured);
        calls.push(call);continuation.push({type:'function_call',call_id:call.id,name:call.name,arguments:call.arguments});
      }
      if (item.type==='reasoning') {
        if (!str(item.encrypted_content)) throw new ProviderOutputError('REASONING_REPLAY_UNAVAILABLE',measured);
        // No reasoning summary/text is retained, displayed or logged.
        continuation.push({type:'reasoning',id:item.id,encrypted_content:item.encrypted_content,summary:[]});
      }
    }
    measured.content=texts.join('\n'); measured.tool_calls=calls; measured.continuation=continuation;
    if(refused || r.status!=='completed') throw new ProviderOutputError('PROVIDER_OUTPUT_INCOMPLETE_OR_REFUSED',measured);
    if(JSON.stringify(continuation).length>48000) throw new ProviderOutputError('CONTINUATION_LIMIT',measured);
  }
  if(measured.tool_calls?.some(call=>!call.id||!call.name||!call.arguments)) throw new ProviderOutputError('PROVIDER_TOOL_INVALID',measured);
  if(new Set(measured.tool_calls?.map(c=>c.id)).size !== (measured.tool_calls?.length ?? 0)) throw new ProviderOutputError('DUPLICATE_CALL_ID',measured);
  return measured;
}
export function createOpenAICompletionClient(options: { sdk?:()=>Promise<ProviderSDK> } = {}): AICompletionClient {
  let cached:ProviderSDK|undefined;
  const sdk=async()=>{
    if(cached) return cached;
    if(options.sdk) return cached=await options.sdk();
    if(!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,baseURL:'https://api.openai.com/v1'});
    // v4.104 has both endpoints/streaming. Its old effort union is narrower than current wire docs.
    return cached={
      chat:{completions:{create:(params,opts)=>client.chat.completions.create(params as unknown as Parameters<typeof client.chat.completions.create>[0],opts)}},
      responses:{create:(params,opts)=>client.responses.create(params as unknown as Parameters<typeof client.responses.create>[0],opts)},
    };
  };
  const dispatch=async(req:AICompletionRequest,stream:boolean)=>{
    const client=await sdk(); const options={timeout:req.timeoutMs ?? 20000,maxRetries:req.maxRetries ?? 0,signal:req.signal};
    return req.transport==='responses' ? client.responses.create(completionParams(req,stream),options) : client.chat.completions.create(completionParams(req,stream),options);
  };
  return {
    async complete(req) { return parseCompletion(await dispatch(req,false),req.transport ?? 'chat_completions'); },
    async *completeStream(req): AsyncIterable<AICompletionStreamEvent> {
      if(req.tools?.length) throw new Error('STREAM_TOOLS_NOT_SUPPORTED');
      let content='';let terminal:AICompletionResponse|undefined;let chatModel='';let chatUsage:unknown;let chatFinished=false;
      const events=await dispatch(req,true) as AsyncIterable<unknown>;
      for await(const raw of events) {
        const event=obj(raw);
        if(req.transport==='responses') {
          if(event.type==='response.output_text.delta' && str(event.delta)) yield {delta:str(event.delta),done:false};
          if(['response.completed','response.incomplete','response.failed'].includes(str(event.type))) terminal=parseCompletion(event.response,'responses');
          if(event.type==='error') throw new Error('PROVIDER_STREAM_ERROR');
        } else {
          chatModel=str(event.model)||chatModel; if(event.usage) chatUsage=event.usage;
          const choice=obj(Array.isArray(event.choices)?event.choices[0]:null); const delta=obj(choice.delta);
          if(choice.finish_reason==='stop') chatFinished=true;
          if(delta.refusal||['length','content_filter'].includes(str(choice.finish_reason))) throw new Error('PROVIDER_OUTPUT_REJECTED');
          if(str(delta.content)) {content+=str(delta.content);yield {delta:str(delta.content),done:false};}
        }
      }
      if(req.transport!=='responses') {
        terminal=parseCompletion({model:chatModel,usage:chatUsage,choices:[{message:{content}}]},'chat_completions');
        if(!chatFinished) throw new ProviderOutputError('PROVIDER_STREAM_MISSING_TERMINAL',terminal);
      }
      if(!terminal) throw new Error('PROVIDER_STREAM_MISSING_TERMINAL');
      yield {...terminal,done:true};
    },
  };
}
