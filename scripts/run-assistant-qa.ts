/**
 * Assistant QA runner — PRP-239 V1.
 *
 * Sequentially fires every fixture prompt at the assistant API, runs
 * behavioral assertions on the response, and writes a Markdown + JSON
 * report under `output/assistant-qa/`. Exits with code 1 if any
 * assertion failed (so the script can be used as a manual CI signal).
 *
 * Usage:
 *
 *   set -a; source .env.local; set +a
 *   npm run assistant:qa
 *   # against a custom API base:
 *   QA_API_BASE_URL=https://api.example.com npm run assistant:qa
 *
 * Required env vars:
 *
 *   SUPABASE_URL                 (anon endpoint)
 *   SUPABASE_ANON_KEY            (or VITE_SUPABASE_ANON_KEY)
 *   E2E_TEST_USER_EMAIL          test user the QA suite signs in as
 *   E2E_TEST_USER_PASSWORD
 *
 * Optional:
 *   QA_API_BASE_URL              default http://localhost:4000
 *   QA_OUTPUT_DIR                default output/assistant-qa
 *   QA_FIXTURE_FILTER            regex to limit which fixtures run (id match)
 */
import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { runAssertions, type AssistantApiResponse } from './assistant-qa/assertions.js';
import { FIXTURES, type QAFixture } from './assistant-qa/fixtures.js';
import { writeReports, type RunResult } from './assistant-qa/report.js';

function envOrThrow(...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  process.stderr.write(`✖ Missing env var (tried: ${keys.join(', ')})\n`);
  process.exit(1);
}

async function signInTestUser(): Promise<{ accessToken: string; userId: string }> {
  const supabaseUrl = envOrThrow('SUPABASE_URL');
  const anonKey = envOrThrow('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');
  const email = envOrThrow('E2E_TEST_USER_EMAIL');
  const password = envOrThrow('E2E_TEST_USER_PASSWORD');

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    process.stderr.write(`✖ Sign-in failed: ${error.message}\n`);
    process.exit(1);
  }
  if (!data.session?.access_token) {
    process.stderr.write('✖ Sign-in returned no session\n');
    process.exit(1);
  }
  return {
    accessToken: data.session.access_token,
    userId: data.user?.id ?? 'unknown',
  };
}

async function callAssistant(
  baseUrl: string,
  accessToken: string,
  fixture: QAFixture,
): Promise<AssistantApiResponse> {
  const body = {
    text: fixture.prompt,
    client_request_id: randomUUID(),
    language: fixture.language ?? 'fr',
  };
  const res = await fetch(`${baseUrl}/api/assistant/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const payload = await res.json();
  // The route wraps with `ok()` → { status: 'success', code, data: <result> }.
  const result = (payload?.data ?? payload) as AssistantApiResponse;
  return result;
}

function progressLine(idx: number, total: number, fixture: QAFixture, pass: boolean, elapsed: number): string {
  const mark = pass ? '✅' : '❌';
  const id = fixture.id.padEnd(14);
  const cat = fixture.category.padEnd(13);
  return `[${String(idx).padStart(2)}/${total}] ${mark} ${id} ${cat} ${elapsed}ms`;
}

async function main(): Promise<void> {
  const baseUrl = process.env.QA_API_BASE_URL ?? 'http://localhost:4000';
  const outDir = process.env.QA_OUTPUT_DIR ?? 'output/assistant-qa';
  const filterRegex = process.env.QA_FIXTURE_FILTER
    ? new RegExp(process.env.QA_FIXTURE_FILTER)
    : null;

  process.stderr.write(`[assistant-qa] API base: ${baseUrl}\n`);
  process.stderr.write(`[assistant-qa] Output:   ${outDir}\n`);
  if (filterRegex) {
    process.stderr.write(`[assistant-qa] Filter:   ${filterRegex}\n`);
  }
  process.stderr.write('\n');

  const { accessToken, userId } = await signInTestUser();
  process.stderr.write(`[assistant-qa] Signed in as ${userId}\n\n`);

  const fixtures = filterRegex ? FIXTURES.filter((f) => filterRegex.test(f.id)) : FIXTURES;
  if (fixtures.length === 0) {
    process.stderr.write('No fixtures matched the filter. Exiting.\n');
    process.exit(1);
  }

  const results: RunResult[] = [];
  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];
    const start = Date.now();
    let response: AssistantApiResponse | null = null;
    let error: string | undefined;
    try {
      response = await callAssistant(baseUrl, accessToken, fixture);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    const elapsedMs = Date.now() - start;
    const checks = response
      ? runAssertions(fixture, response, elapsedMs)
      : [];
    const pass = !error && checks.every((c) => c.pass);
    results.push({ fixture, response, error, elapsedMs, checks });
    process.stderr.write(progressLine(i + 1, fixtures.length, fixture, pass, elapsedMs) + '\n');
  }

  process.stderr.write('\n');
  const { markdownPath, jsonPath, summary } = writeReports(results, outDir);
  process.stderr.write(`[assistant-qa] Wrote:\n`);
  process.stderr.write(`  ${markdownPath}\n`);
  process.stderr.write(`  ${jsonPath}\n`);
  process.stderr.write('\n');
  process.stderr.write(
    `[assistant-qa] Summary: ${summary.passed} passed, ${summary.failed} failed, ${summary.errored} errored — cost $${summary.totalCostUsd.toFixed(4)}\n`,
  );

  const everythingPassed = summary.failed === 0 && summary.errored === 0;
  process.exit(everythingPassed ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`✖ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
