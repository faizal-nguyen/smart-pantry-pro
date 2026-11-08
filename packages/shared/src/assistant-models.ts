import { z } from 'zod';

export const AssistantRoleSchema = z.enum(['dialogue', 'culinary', 'summary', 'vision']);
export type AssistantRole = z.infer<typeof AssistantRoleSchema>;
export const ModelCallReceiptSchema = z.object({
  role: AssistantRoleSchema,
  purpose: z.string(),
  transport: z.enum(['chat_completions', 'responses']),
  requested_model: z.string(),
  served_model: z.string().nullable(),
  status: z.enum(['completed', 'failed']),
  input_tokens: z.number().int().nonnegative().nullable(),
  output_tokens: z.number().int().nonnegative().nullable(),
  cached_input_tokens: z.number().int().nonnegative().nullable(),
  cache_write_tokens: z.number().int().nonnegative().nullable(),
  reasoning_tokens: z.number().int().nonnegative().nullable(),
  usd: z.number().nonnegative().nullable(),
  quality: z.enum(['known', 'estimated', 'unknown']),
  reason: z.string().nullable(),
  pricing_version: z.string(),
  duration_ms: z.number().nonnegative(),
}).strict();
export type ModelCallReceipt = z.infer<typeof ModelCallReceiptSchema>;
export const AssociatedToolCostSchema = z.object({
  action_id:z.string(), tool:z.string(), usd:z.number().nonnegative().nullable(),
  quality:z.enum(['estimated','unknown']),
}).strict();
export type AssociatedToolCost = z.infer<typeof AssociatedToolCostSchema>;
export const AssistantModelReceiptSchema = z.object({
  invocation_id: z.string(),
  configuration_version: z.string(),
  calls: z.array(ModelCallReceiptSchema),
  associated_tool_costs:z.array(AssociatedToolCostSchema).default([]),
  llm_usd: z.number().nonnegative().nullable(),
  known_subtotal_usd: z.number().nonnegative(),
  quality: z.enum(['known', 'estimated', 'unknown']),
  limit_reason: z.string().nullable(),
  disclaimer: z.literal('Application estimate, not an OpenAI invoice'),
}).strict();
export type AssistantModelReceipt = z.infer<typeof AssistantModelReceiptSchema>;
/** V10-03E — dictation: transcription only, never a tool or a stock write. */
export const TranscriptionModelSchema = z.enum(['gpt-transcribe', 'whisper-1']);
export type TranscriptionModel = z.infer<typeof TranscriptionModelSchema>;
export const AssistantTranscriptionSchema = z.object({
  transcription_id: z.string(),
  client_request_id: z.string().uuid(),
  text: z.string(),
  /** As reported by the provider; empty when it could not tell. */
  languages: z.array(z.string()),
  requested_model: TranscriptionModelSchema,
  /** The transcription API does not report the served model. */
  served_model: z.string().nullable(),
  duration_seconds: z.number().nonnegative().nullable(),
  duration_source: z.enum(['provider', 'client']).nullable(),
  cost: z.object({
    usd: z.number().nonnegative().nullable(),
    quality: z.enum(['known', 'estimated', 'unknown']),
    reason: z.string().nullable(),
    pricing_version: z.string(),
  }).strict(),
}).strict();
export type AssistantTranscription = z.infer<typeof AssistantTranscriptionSchema>;
export const AssistantModelCatalogSchema = z.object({
  configuration_version: z.string(),
  preset: z.enum(['baseline', 'luna', 'luna-sol']),
  roles: z.array(z.object({
    role: AssistantRoleSchema, model: z.string(),
    transport: z.enum(['chat_completions', 'responses']),
    effort: z.enum(['none', 'low']).nullable(),
    max_output_tokens: z.number(), timeout_ms: z.number(),
    last_served_model: z.string().nullable(), last_verified_at: z.string().nullable(),
    verification: z.enum(['not_observed', 'observed_in_process']),
  }).strict()),
  limits: z.object({ max_calls: z.number(), max_tools: z.number(), deadline_ms: z.number(), max_usd: z.number() }).strict(),
  pricing_version: z.string(),
  activation: z.enum(['baseline', 'benchmark_approved', 'owner_adopted']),
}).strict();
export type AssistantModelCatalog = z.infer<typeof AssistantModelCatalogSchema>;
