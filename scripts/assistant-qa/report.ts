/**
 * Assistant QA — report writer.
 *
 * Produces a Markdown summary (human-readable) and a JSON dump (machine-
 * consumable for trend analysis / nightly diffing). Both land under
 * `output/assistant-qa/`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { AssistantApiResponse } from './assertions.js';
import type { AssertionResult, QAFixture } from './fixtures.js';

export interface RunResult {
  fixture: QAFixture;
  response: AssistantApiResponse | null;
  error?: string;
  elapsedMs: number;
  checks: AssertionResult[];
}

export interface ReportSummary {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  byCategory: Record<string, { passed: number; failed: number }>;
}

export function buildSummary(results: readonly RunResult[]): ReportSummary {
  const total = results.length;
  let passed = 0;
  let failed = 0;
  let errored = 0;
  let totalCostUsd = 0;
  const latencies: number[] = [];
  const byCategory: ReportSummary['byCategory'] = {};

  for (const r of results) {
    const cat = r.fixture.category;
    byCategory[cat] = byCategory[cat] ?? { passed: 0, failed: 0 };
    if (r.error) {
      errored += 1;
      byCategory[cat].failed += 1;
      continue;
    }
    const allPassed = r.checks.every((c) => c.pass);
    if (allPassed) {
      passed += 1;
      byCategory[cat].passed += 1;
    } else {
      failed += 1;
      byCategory[cat].failed += 1;
    }
    totalCostUsd += r.response?.cost?.total_usd ?? 0;
    latencies.push(r.elapsedMs);
  }

  latencies.sort((a, b) => a - b);
  const avgLatencyMs =
    latencies.length === 0 ? 0 : Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const p95LatencyMs =
    latencies.length === 0 ? 0 : latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))];

  return { total, passed, failed, errored, totalCostUsd, avgLatencyMs, p95LatencyMs, byCategory };
}

export function writeReports(
  results: readonly RunResult[],
  outDir: string,
): { markdownPath: string; jsonPath: string; summary: ReportSummary } {
  mkdirSync(outDir, { recursive: true });
  const markdownPath = `${outDir}/report.md`;
  const jsonPath = `${outDir}/report.json`;
  const summary = buildSummary(results);

  const ts = new Date().toISOString();
  const md = renderMarkdown(results, summary, ts);
  writeFileSync(markdownPath, md, 'utf8');

  const json = {
    generated_at: ts,
    summary,
    results: results.map((r) => ({
      id: r.fixture.id,
      category: r.fixture.category,
      purpose: r.fixture.purpose,
      prompt: r.fixture.prompt,
      elapsed_ms: r.elapsedMs,
      error: r.error,
      pass: !r.error && r.checks.every((c) => c.pass),
      checks: r.checks,
      response: r.response
        ? {
            message: r.response.message,
            actions_executed: r.response.actions_executed,
            actions_pending: r.response.actions_pending,
            cost: r.response.cost,
            model_used: r.response.model_used,
          }
        : null,
    })),
  };
  writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf8');

  // Ensure parent dir exists for any nested target.
  mkdirSync(dirname(markdownPath), { recursive: true });

  return { markdownPath, jsonPath, summary };
}

function renderMarkdown(
  results: readonly RunResult[],
  summary: ReportSummary,
  generatedAt: string,
): string {
  const lines: string[] = [];
  lines.push(`# Assistant QA Report`);
  lines.push('');
  lines.push(`Generated at: ${generatedAt}`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`- **Total**: ${summary.total}`);
  lines.push(`- **Passed**: ${summary.passed}`);
  lines.push(`- **Failed**: ${summary.failed}`);
  lines.push(`- **Errored**: ${summary.errored}`);
  lines.push(`- **Cost**: $${summary.totalCostUsd.toFixed(4)} total`);
  lines.push(`- **Latency**: avg ${summary.avgLatencyMs}ms, p95 ${summary.p95LatencyMs}ms`);
  lines.push('');
  lines.push(`### By category`);
  lines.push('');
  lines.push('| Category | Pass | Fail |');
  lines.push('|----------|------|------|');
  for (const [cat, c] of Object.entries(summary.byCategory).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| ${cat} | ${c.passed} | ${c.failed} |`);
  }
  lines.push('');

  // ---- Failed tests block (most actionable, surface first) -----------
  const failures = results.filter((r) => r.error || r.checks.some((c) => !c.pass));
  if (failures.length > 0) {
    lines.push(`## Failures (${failures.length})`);
    lines.push('');
    for (const r of failures) {
      lines.push(`### \`${r.fixture.id}\` — ${r.fixture.category}`);
      lines.push('');
      lines.push(`**Prompt**: ${r.fixture.prompt}`);
      lines.push('');
      lines.push(`**Purpose**: ${r.fixture.purpose}`);
      lines.push('');
      if (r.error) {
        lines.push(`**Error**: \`${r.error}\``);
      } else {
        const tools = (r.response?.actions_executed ?? []).map((x) => x.tool);
        lines.push(`**Tools called**: [${tools.join(', ') || '(none)'}]`);
        lines.push('');
        lines.push(`**Latency**: ${r.elapsedMs}ms · **Cost**: $${(r.response?.cost?.total_usd ?? 0).toFixed(4)}`);
        lines.push('');
        lines.push(`**Response excerpt**:`);
        lines.push('');
        lines.push('```');
        lines.push((r.response?.message ?? '').slice(0, 500));
        lines.push('```');
        lines.push('');
        lines.push(`**Failed checks**:`);
        for (const c of r.checks.filter((x) => !x.pass)) {
          lines.push(`- ❌ ${c.description}${c.detail ? ` — ${c.detail}` : ''}`);
        }
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  // ---- All tests at-a-glance ------------------------------------------
  lines.push(`## All Tests`);
  lines.push('');
  lines.push('| ID | Category | Pass | Tools | Latency | Cost |');
  lines.push('|----|----------|------|-------|---------|------|');
  for (const r of results) {
    const pass = !r.error && r.checks.every((c) => c.pass);
    const tools = (r.response?.actions_executed ?? []).map((x) => x.tool);
    const toolsCell = tools.length === 0 ? '—' : tools.join(', ');
    const cost = `$${(r.response?.cost?.total_usd ?? 0).toFixed(4)}`;
    lines.push(
      `| ${r.fixture.id} | ${r.fixture.category} | ${pass ? '✅' : '❌'} | ${toolsCell} | ${r.elapsedMs}ms | ${cost} |`,
    );
  }
  lines.push('');

  return lines.join('\n');
}
