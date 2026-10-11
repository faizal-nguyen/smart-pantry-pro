import { readFileSync } from 'node:fs';
import type { AssistantModelCatalog, AssistantRole } from '@smart/shared';

export interface RoleConfig {
  model: string; transport: 'chat_completions' | 'responses';
  effort?: 'none' | 'low'; maxOutputTokens: number; timeoutMs: number;
}
export interface AssistantModelConfig {
  version: string; preset: 'baseline' | 'luna' | 'luna-sol';
  roles: Record<AssistantRole, Readonly<RoleConfig>>;
  limits: { maxCalls: number; maxTools: number; deadlineMs: number; maxUsd: number };
  activation: 'baseline' | 'benchmark_approved';
}
export function benchmarkConfig(preset: AssistantModelConfig['preset']): AssistantModelConfig {
  const mini: RoleConfig = { model: 'gpt-4o-mini', transport: 'chat_completions', maxOutputTokens: 1500, timeoutMs: 20000 };
  const quality: RoleConfig = { ...mini, model: 'gpt-4o' };
  const luna: RoleConfig = { ...mini, model: 'gpt-6-luna', transport: 'responses', effort: 'none' };
  const sol: RoleConfig = { ...luna, model: 'gpt-6.1-sol', effort: 'low' };
  const current = preset === 'baseline' ? mini : luna;
  const config: AssistantModelConfig = {
    version: 'v10-03d-2026-10-11-r2:' + preset, preset,
    roles: { dialogue: { ...current }, culinary: { ...(preset === 'baseline' ? quality : preset === 'luna-sol' ? sol : luna) },
      summary: { ...current, maxOutputTokens: 320, timeoutMs: 5000 } },
    limits: { maxCalls: 4, maxTools: 6, deadlineMs: 45000, maxUsd: 0.15 }, activation: 'baseline',
  };
  return freezeConfig(config);
}
export function freezeConfig(config: AssistantModelConfig): AssistantModelConfig {
  for (const role of Object.values(config.roles)) {
    if (!['gpt-4o-mini','gpt-4o','gpt-6-luna','gpt-6.1-sol'].includes(role.model)) throw new Error('ASSISTANT_MODEL_UNSUPPORTED');
    if (role.model.startsWith('gpt-6') && (role.transport !== 'responses' || !role.effort)) throw new Error('ASSISTANT_MODEL_TRANSPORT_INCOMPATIBLE');
    if (role.model === 'gpt-6.1-sol' && role.effort !== 'low') throw new Error('ASSISTANT_MODEL_EFFORT_INCOMPATIBLE');
    if (role.model.startsWith('gpt-4o') && role.effort) throw new Error('ASSISTANT_MODEL_EFFORT_INCOMPATIBLE');
    if (!(Number.isInteger(role.maxOutputTokens) && role.maxOutputTokens > 0 && role.maxOutputTokens <= 2000 && Number.isInteger(role.timeoutMs) && role.timeoutMs > 0 && role.timeoutMs <= 30000)) throw new Error('ASSISTANT_MODEL_INVALID_LIMITS');
    Object.freeze(role);
  }
  const { maxCalls, maxTools, deadlineMs, maxUsd } = config.limits;
  if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 6 || maxTools !== 6 || !Number.isInteger(deadlineMs) || deadlineMs < 1000 || deadlineMs > 60000 || !(maxUsd > 0 && maxUsd <= 1)) throw new Error('ASSISTANT_MODEL_INVALID_LIMITS');
  Object.freeze(config.roles); Object.freeze(config.limits); return Object.freeze(config);
}
/** Candidate selection requires a reviewed live report; a fake/offline report cannot activate it. */
export function loadAssistantModelConfig(env: NodeJS.ProcessEnv = process.env): AssistantModelConfig {
  const preset = env.ASSISTANT_MODEL_PRESET ?? 'baseline';
  if (!['baseline','luna','luna-sol'].includes(preset)) throw new Error('ASSISTANT_MODEL_PRESET_INVALID');
  const config = benchmarkConfig(preset as AssistantModelConfig['preset']);
  if (preset === 'baseline') return config;
  try {
    const report = JSON.parse(readFileSync(env.ASSISTANT_MODEL_APPROVAL_FILE ?? '', 'utf8'));
    const decision = report.decisions?.[preset];
    const age = Date.now() - Date.parse(report.finished_at);
    if (report.mode !== 'live' || report.environment !== 'local-fictitious' || report.corpus_version !== 'v10-03d-40-v1' ||
      report.configuration_versions?.[preset] !== config.version || report.scenario_count !== 40 || report.critical_count !== 12 || report.is_fictitious !== true ||
      decision?.decision !== 'adopt' || decision.completed_trials !== 120 || decision.critical_failures !== 0 ||
      !Number.isFinite(decision.correct_rate) || decision.correct_rate < 0.95 || decision.correct_rate > 1 || decision.latency_pass !== true || decision.cost_pass !== true ||
      decision.human_review?.status !== 'approved' || !decision.human_review.reviewer ||
      report.observed_cost_complete !== true || report.stop_reason !== null ||
      Object.values(config.roles).some(role => report.availability?.[role.model]?.accessible !== true) ||
      report.criteria?.correct_rate !== 0.95 || report.criteria?.critical_failures !== 0 || report.criteria?.p95_ratio !== 1.15 || report.criteria?.cost_per_success_ratio !== 1 ||
      !Number.isFinite(age) || age < 0 || age > 30 * 86400000) throw new Error('unapproved');
    return freezeConfig({ ...config, roles: { ...config.roles }, limits: { ...config.limits }, activation: 'benchmark_approved' });
  } catch { throw new Error('ASSISTANT_MODEL_BENCHMARK_NOT_APPROVED'); }
}
const observations = new Map<string, { model: string; at: string }>();
export function observeModel(config: AssistantModelConfig, role: AssistantRole, model: string) {
  if (model) observations.set(config.version + ':' + role + ':' + config.roles[role].model, { model, at: new Date().toISOString() });
}
export function modelCatalog(config: AssistantModelConfig, pricingVersion: string): AssistantModelCatalog {
  return { configuration_version: config.version, preset: config.preset, activation: config.activation,
    pricing_version: pricingVersion,
    limits: { max_calls: config.limits.maxCalls, max_tools: config.limits.maxTools, deadline_ms: config.limits.deadlineMs, max_usd: config.limits.maxUsd },
    roles: (Object.keys(config.roles) as AssistantRole[]).map(role => {
      const observation = observations.get(config.version + ':' + role + ':' + config.roles[role].model);
      return { role, model: config.roles[role].model,
      transport: config.roles[role].transport, effort: config.roles[role].effort ?? null,
      max_output_tokens: config.roles[role].maxOutputTokens, timeout_ms: config.roles[role].timeoutMs,
      last_served_model: observation?.model ?? null, last_verified_at: observation?.at ?? null,
      verification: observation ? 'observed_in_process' : 'not_observed' };
    }),
  };
}
