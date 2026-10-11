import type {AssistantModelCatalog,AssistantModelReceipt} from '@smart/shared';
// Visual contracts only. This fixture makes no provider calls and proves no live deployment.
export const MODEL_CONVERSATION='90000000-0000-4000-8000-000000000001';
export const modelCatalog:AssistantModelCatalog={configuration_version:'visual-fixture',preset:'baseline',activation:'baseline',
  pricing_version:'openai-text-standard-usd-2026-10-11',
  roles:['dialogue','culinary','summary'].map(role=>({role:role as 'dialogue'|'culinary'|'summary',
    model:role==='culinary' ? 'gpt-4o':'gpt-4o-mini',transport:'chat_completions',effort:null,
    max_output_tokens:role==='summary' ? 320:1500,timeout_ms:role==='summary' ? 5000:20000,
    last_served_model:null,last_verified_at:null,verification:'not_observed'})),
  limits:{max_calls:4,max_tools:6,deadline_ms:45000,max_usd:0.15}};
export const modelReceipt:AssistantModelReceipt={invocation_id:'visual-fixture',configuration_version:'visual-fixture',
  associated_tool_costs:[],calls:[{role:'dialogue',purpose:'tool_selection',transport:'chat_completions',requested_model:'gpt-4o-mini',served_model:'gpt-4o-mini-2024-07-18',
    status:'completed',input_tokens:100,output_tokens:20,cached_input_tokens:0,cache_write_tokens:0,reasoning_tokens:0,usd:0.000027,quality:'known',reason:null,
    pricing_version:'openai-text-standard-usd-2026-10-11',duration_ms:250},
    {role:'culinary',purpose:'synthesis_stream',transport:'chat_completions',requested_model:'gpt-4o',served_model:null,status:'failed',input_tokens:null,output_tokens:null,
      cached_input_tokens:null,cache_write_tokens:null,reasoning_tokens:null,usd:null,quality:'unknown',reason:'provider_failed_without_usage',pricing_version:'openai-text-standard-usd-2026-10-11',duration_ms:200}],
  llm_usd:null,known_subtotal_usd:0.000027,quality:'unknown',limit_reason:null,disclaimer:'Application estimate, not an OpenAI invoice'};
