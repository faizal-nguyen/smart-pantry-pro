/**
 * PRP-239 PR1b — apply the archived manifest to seed `.sql` files.
 *
 * Reads `supabase/seeds/manifests/2026-05-21-recipe-policy-v1.json` (or
 * the file passed via `--manifest`) and rewrites each affected
 * `INSERT INTO public.recipe_ingredients` tuple to swap the violating
 * `ingredient_name` or `ingredient_notes` for its policy substitute.
 *
 * Scope is intentionally narrow:
 *   - Touches ONLY the matching ingredient field. Other tokens in the
 *     tuple stay byte-identical (quantity, unit, is_essential, order,
 *     and the field we did not target).
 *   - Scoped per recipe block to avoid cross-recipe collisions (two
 *     recipes can both have a `mirin` ingredient — we only rewrite the
 *     one whose recipe_name matches the manifest entry).
 *
 * Determinism :
 *   - Reads files in the order the manifest lists them (already sorted
 *     deterministically by the scanner).
 *   - Two consecutive applies on a clean tree produce no diff.
 *
 * Usage :
 *   tsx scripts/apply-recipe-policy-manifest-to-seeds.ts \
 *     [--manifest supabase/seeds/manifests/2026-05-21-recipe-policy-v1.json] \
 *     [--seeds supabase/seeds] \
 *     [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildAccentTolerantRegex,
  normalizePolicyText,
} from '../apps/api/src/services/recipeQuality/normalizePolicyText.js';

interface ManifestChange {
  source_file: string;
  recipe_name: string;
  field: 'ingredient_name' | 'ingredient_notes';
  old_value: string;
  new_value: string;
  rule_id: string;
  quality_flag: string;
}

interface Manifest {
  version: number;
  generated_at: string;
  changes: ManifestChange[];
  violations_remaining: unknown[];
}

interface CliArgs {
  manifest: string;
  seeds: string;
  dryRun: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    manifest: 'supabase/seeds/manifests/2026-05-21-recipe-policy-v1.json',
    seeds: 'supabase/seeds',
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--manifest') args.manifest = argv[++i] ?? args.manifest;
    else if (a === '--seeds') args.seeds = argv[++i] ?? args.seeds;
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function quoteSqlString(value: string): string {
  return `'${sqlEscape(value)}'`;
}

const RECIPE_INSERT_RE =
  /INSERT INTO public\.recipes\s*\([^)]*\)\s*VALUES\s*\(([\s\S]*?)\)\s*RETURNING id INTO v_recipe_id\s*;/g;

/**
 * Locate the recipe block whose name matches `targetName`. Returns the
 * char range of that block AND the char range of the ingredient-insert
 * block that follows it (until the next recipe insert or end of file).
 */
function findRecipeBlock(
  text: string,
  targetName: string,
): { recipeEnd: number; ingredientStart: number; ingredientEnd: number } | null {
  RECIPE_INSERT_RE.lastIndex = 0;
  const recipeMatches: Array<{ end: number; values: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = RECIPE_INSERT_RE.exec(text)) !== null) {
    recipeMatches.push({ end: m.index + m[0].length, values: m[1] });
  }

  for (let i = 0; i < recipeMatches.length; i++) {
    const block = recipeMatches[i];
    const name = extractRecipeName(block.values);
    if (name !== targetName) continue;

    // Boundaries of the next ingredient INSERT.
    const after = text.slice(block.end);
    const ingInsertMatch = /INSERT INTO public\.recipe_ingredients\s*\([^)]*\)\s*VALUES\s*/m.exec(after);
    if (!ingInsertMatch) return null;
    const ingStart = block.end + ingInsertMatch.index + ingInsertMatch[0].length;

    // The ingredient insert ends at the first `;` not inside a string.
    const ingEnd = findStatementEnd(text, ingStart);
    if (ingEnd === -1) return null;
    return { recipeEnd: block.end, ingredientStart: ingStart, ingredientEnd: ingEnd };
  }
  return null;
}

/**
 * Find the first `;` after `start` that is not inside a single-quoted
 * SQL string. Required because tuple values can contain `;` (rare but
 * possible inside notes). Returns the index of `;` (inclusive) or -1.
 */
function findStatementEnd(text: string, start: number): number {
  let i = start;
  let inStr = false;
  while (i < text.length) {
    const ch = text[i];
    if (inStr) {
      if (ch === "'" && text[i + 1] === "'") {
        i += 2;
        continue;
      }
      if (ch === "'") {
        inStr = false;
        i++;
        continue;
      }
      i++;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      i++;
      continue;
    }
    if (ch === ';') return i;
    i++;
  }
  return -1;
}

/**
 * Recipe values block starts with `v_user_id, 'NAME', ...`. We pull the
 * first single-quoted string literal that follows the user_id slot.
 */
function extractRecipeName(valuesBody: string): string {
  // Skip leading whitespace + identifier + comma.
  const trimmed = valuesBody.trimStart();
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx === -1) return '';
  const afterUser = trimmed.slice(commaIdx + 1);
  const m = /^\s*'((?:[^']|'')*)'/.exec(afterUser);
  if (!m) return '';
  return m[1].replace(/''/g, "'");
}

// ---------------------------------------------------------------------------
// Tuple rewriting
// ---------------------------------------------------------------------------

interface TupleSpan {
  /** absolute char index of the `(` */
  open: number;
  /** absolute char index of the `)` */
  close: number;
  /** the bracketed body, sans parens */
  body: string;
}

/**
 * Enumerate top-level `(...)` tuples in the ingredient insert block.
 * Single-quoted strings (and their `''` escapes) are honored so a
 * closing paren inside a notes string doesn't terminate the tuple.
 */
function tuplesInBlock(text: string, start: number, end: number): TupleSpan[] {
  const out: TupleSpan[] = [];
  let i = start;
  while (i < end) {
    if (text[i] !== '(') {
      i++;
      continue;
    }
    let j = i + 1;
    let depth = 1;
    let inStr = false;
    while (j < end && depth > 0) {
      const ch = text[j];
      if (inStr) {
        if (ch === "'" && text[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (ch === "'") {
          inStr = false;
          j++;
          continue;
        }
        j++;
        continue;
      }
      if (ch === "'") {
        inStr = true;
        j++;
        continue;
      }
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
      j++;
    }
    if (depth !== 0) break;
    out.push({ open: i, close: j, body: text.slice(i + 1, j) });
    i = j + 1;
  }
  return out;
}

/**
 * Tokenize a tuple body into top-level fields, preserving leading
 * whitespace per token so we can rewrite one slot in place without
 * disturbing the others.
 *
 * Returns { tokens, separators } where tokens.length === separators.length+1
 * and `tokens[i] + (separators[i] ?? '')` reassembled gives the body.
 */
function tokenizeTupleBody(body: string): { tokens: string[]; separators: string[] } {
  const tokens: string[] = [];
  const separators: string[] = [];
  let i = 0;
  let buf = '';
  let depth = 0;

  while (i < body.length) {
    const ch = body[i];

    if (ch === "'") {
      let j = i + 1;
      buf += "'";
      while (j < body.length) {
        if (body[j] === "'" && body[j + 1] === "'") {
          buf += "''";
          j += 2;
          continue;
        }
        if (body[j] === "'") {
          buf += "'";
          j++;
          break;
        }
        buf += body[j];
        j++;
      }
      i = j;
      continue;
    }

    if (ch === '(' || ch === '[') {
      depth++;
      buf += ch;
      i++;
      continue;
    }
    if (ch === ')' || ch === ']') {
      depth--;
      buf += ch;
      i++;
      continue;
    }

    if (ch === ',' && depth === 0) {
      tokens.push(buf);
      separators.push(',');
      buf = '';
      i++;
      // Preserve whitespace after the comma in the separator.
      while (i < body.length && (body[i] === ' ' || body[i] === '\t')) {
        separators[separators.length - 1] += body[i];
        i++;
      }
      continue;
    }

    buf += ch;
    i++;
  }
  tokens.push(buf);
  return { tokens, separators };
}

function reassembleTupleBody(tokens: string[], separators: string[]): string {
  let s = '';
  for (let k = 0; k < tokens.length; k++) {
    s += tokens[k];
    if (k < separators.length) s += separators[k];
  }
  return s;
}

function unquote(token: string): string {
  const t = token.trim();
  if (t.startsWith("'") && t.endsWith("'")) {
    return t.slice(1, -1).replace(/''/g, "'");
  }
  return t;
}

/**
 * Rewrite a single ingredient field. The ingredient_ingredient_insert
 * tuple shape is `(v_recipe_id, name, qty, unit, is_essential, order, notes)`
 * → 7 tokens. Index 1 = name, index 6 = notes.
 *
 * Returns the modified file text, or `null` if the target tuple was
 * not found (caller logs a skip).
 */
function applyChange(
  text: string,
  change: ManifestChange,
): { text: string; applied: boolean } {
  const block = findRecipeBlock(text, change.recipe_name);
  if (!block) return { text, applied: false };

  const tuples = tuplesInBlock(text, block.ingredientStart, block.ingredientEnd);
  const targetIndex = change.field === 'ingredient_name' ? 1 : 6;

  // Manifest entries store the MATCHED SUBSTRING (e.g. `porc`), not the
  // whole field value (e.g. `pieds de porc`). Compile an accent-tolerant
  // regex on the old_value and do an in-place substitution within the
  // tuple's target field so `pieds de porc` → `pieds de boeuf`.
  const oldNormalized = normalizePolicyText(change.old_value);
  const oldTokenRgx = buildAccentTolerantRegex(oldNormalized);

  for (const tuple of tuples) {
    const parsed = tokenizeTupleBody(tuple.body);
    if (parsed.tokens.length < 7) continue;

    const currentValue = unquote(parsed.tokens[targetIndex]);
    if (currentValue === 'NULL') continue;

    if (!oldTokenRgx.test(currentValue)) continue;

    // Sub-string replacement preserving surrounding context within the
    // same field (boundaries captured by `(^|[^a-z0-9])X([^a-z0-9]|$)`).
    oldTokenRgx.lastIndex = 0;
    const substitutedValue = currentValue.replace(
      oldTokenRgx,
      (_full, p1: string, p2: string) => `${p1 ?? ''}${change.new_value}${p2 ?? ''}`,
    );
    if (substitutedValue === currentValue) continue;

    const leading = /^\s*/.exec(parsed.tokens[targetIndex])?.[0] ?? '';
    parsed.tokens[targetIndex] = `${leading}${quoteSqlString(substitutedValue)}`;
    const newBody = reassembleTupleBody(parsed.tokens, parsed.separators);
    const before = text.slice(0, tuple.open + 1);
    const after = text.slice(tuple.close);
    return { text: before + newBody + after, applied: true };
  }
  return { text, applied: false };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const manifestRaw = readFileSync(join(cwd, args.manifest), 'utf8');
  const manifest = JSON.parse(manifestRaw) as Manifest;

  // Group changes by source_file so we read each file once.
  const byFile = new Map<string, ManifestChange[]>();
  for (const c of manifest.changes) {
    const list = byFile.get(c.source_file) ?? [];
    list.push(c);
    byFile.set(c.source_file, list);
  }

  let totalApplied = 0;
  let totalSkipped = 0;
  const skipped: ManifestChange[] = [];

  // Sort files for deterministic processing.
  const files = [...byFile.keys()].sort();

  for (const file of files) {
    const fullPath = join(cwd, file);
    let text = readFileSync(fullPath, 'utf8');
    const changes = byFile.get(file) ?? [];

    let perFileApplied = 0;
    for (const change of changes) {
      const result = applyChange(text, change);
      if (result.applied) {
        text = result.text;
        perFileApplied++;
        totalApplied++;
      } else {
        skipped.push(change);
        totalSkipped++;
      }
    }

    if (!args.dryRun && perFileApplied > 0) {
      writeFileSync(fullPath, text, 'utf8');
    }
    process.stderr.write(`[apply] ${file}: ${perFileApplied}/${changes.length} applied\n`);
  }

  process.stderr.write(`\n[apply] Total applied: ${totalApplied}\n`);
  process.stderr.write(`[apply] Total skipped: ${totalSkipped}\n`);
  if (skipped.length > 0) {
    process.stderr.write('\nSkipped entries:\n');
    for (const s of skipped) {
      process.stderr.write(
        `  ${s.source_file} | ${s.recipe_name} | ${s.field} | ${s.old_value} → ${s.new_value}\n`,
      );
    }
  }
  if (args.dryRun) {
    process.stderr.write('\n[apply] DRY RUN — no files written.\n');
  }
}

main();
