#!/usr/bin/env node
/**
 * App type check against a baseline (audit 2026-11-07, PR 7).
 *
 * `tsc -p tsconfig.app.json` still reports about 220 old errors, so a plain run cannot gate
 * a pull request. This counts errors per file and code, and fails only when a file gains
 * an error code it did not have, or more of it. Fixing errors never fails: `--update`
 * lowers the baseline (scripts/tsc-baseline.json) once they are gone.
 *
 *   node scripts/tsc-baseline.mjs           check (CI)
 *   node scripts/tsc-baseline.mjs --update  rewrite the baseline
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const BASELINE = 'scripts/tsc-baseline.json';
const ERROR = /^(.+?)\(\d+,\d+\): error (TS\d+):/;

let output = '';
let failed = false;
try {
  output = execFileSync('node_modules/.bin/tsc', ['-p', 'tsconfig.app.json', '--noEmit', '--pretty', 'false'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (error) {
  failed = true;
  output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
}

const lines = output.split('\n');
const counts = {};
for (const line of lines) {
  const match = line.match(ERROR);
  if (match) counts[`${match[1]} ${match[2]}`] = (counts[`${match[1]} ${match[2]}`] ?? 0) + 1;
}
const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

// tsc failing without a single file error is a configuration problem, never a pass.
if (failed && total === 0) {
  console.error(output.trim() || 'tsc failed without output.');
  process.exit(1);
}

if (process.argv.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Baseline written: ${total} errors in ${new Set(Object.keys(counts).map(key => key.split(' ')[0])).size} files.`);
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const worse = Object.entries(counts).filter(([key, n]) => n > (baseline[key] ?? 0));
const better = Object.entries(baseline).filter(([key, n]) => (counts[key] ?? 0) < n);

if (worse.length) {
  console.error('New app type errors (file and code: now / baseline):');
  for (const [key, n] of worse) console.error(`  ${key}: ${n} / ${baseline[key] ?? 0}`);
  const files = new Set(worse.map(([key]) => key.split(' ')[0]));
  console.error('\nDetails:');
  for (const line of lines) {
    const match = line.match(ERROR);
    if (match && files.has(match[1])) console.error(`  ${line}`);
  }
  process.exit(1);
}

console.log(`App types: ${total} errors, none new.${better.length
  ? ` ${better.length} file/code pair(s) improved: run \`npm run typecheck:app:update\` to lower the baseline.` : ''}`);
