/**
 * prom-client metrics registry (PRP-220.15).
 *
 * Counters / histograms exposed on `GET /api/metrics`. Kept narrow on
 * purpose: every metric labels by a low-cardinality dimension only
 * (platform, model, endpoint, tier, outcome) so the cost of the
 * Prometheus scrape stays bounded.
 *
 * Code that records metrics goes through this module — never imports
 * `prom-client` directly — so a future swap (OpenTelemetry, Datadog)
 * touches one file.
 */
import client from 'prom-client';

const registry = new client.Registry();

// Default Node process metrics (heap, GC, event-loop lag).
client.collectDefaultMetrics({ register: registry });

const extractionTotal = new client.Counter({
  name: 'import_extraction_total',
  help: 'Total recipe extractions started, labeled by platform and outcome.',
  labelNames: ['platform', 'outcome'] as const,
  registers: [registry],
});

const extractionLatency = new client.Histogram({
  name: 'import_extraction_duration_ms',
  help: 'End-to-end recipe extraction latency in milliseconds.',
  labelNames: ['platform'] as const,
  buckets: [100, 500, 1_000, 2_000, 5_000, 10_000, 30_000],
  registers: [registry],
});

const extractionCost = new client.Counter({
  name: 'import_extraction_cost_usd',
  help: 'Cumulative AI cost (USD) per model.',
  labelNames: ['model'] as const,
  registers: [registry],
});

const extractionTokens = new client.Counter({
  name: 'import_extraction_tokens_total',
  help: 'Cumulative tokens consumed, labeled by model and direction.',
  labelNames: ['model', 'direction'] as const, // direction: input|output
  registers: [registry],
});

const rateLimited = new client.Counter({
  name: 'rate_limited_total',
  help: 'Requests rejected by the per-user rate limiter.',
  labelNames: ['endpoint', 'tier'] as const,
  registers: [registry],
});

const captureTotal = new client.Counter({
  name: 'import_capture_total',
  help: 'Total recipe import captures, labeled by platform and outcome.',
  labelNames: ['platform', 'outcome'] as const, // outcome: ok|duplicate|failed
  registers: [registry],
});

export const metrics = {
  registry,
  extractionTotal,
  extractionLatency,
  extractionCost,
  extractionTokens,
  rateLimited,
  captureTotal,
} as const;

export type MetricsRegistry = typeof metrics;
