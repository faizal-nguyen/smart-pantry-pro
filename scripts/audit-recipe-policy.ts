/**
 * PRP-239 PR1a — Recipe Policy Audit CLI.
 *
 * Parses Supabase recipe seed files, runs every recipe through
 * `RecipeQualityScanner`, and emits a deterministic JSON manifest that
 * PR1b will consume to apply seed edits + a DB migration.
 *
 * Usage :
 *
 *   tsx scripts/audit-recipe-policy.ts \
 *     --seeds supabase/seeds \
 *     --out output/recipe-policy-manifest-v1.json
 *
 *   # Guardrail mode — fails the process with exit 1 if any change or
 *   # non-whitelist violation is detected. Used by CI before PR1b.
 *   tsx scripts/audit-recipe-policy.ts \
 *     --seeds supabase/seeds \
 *     --check
 *
 * The parser is intentionally hand-rolled regex (not a full SQL parser):
 * the seed format is locally controlled (one repository convention) and
 * a parser would be massive overkill. The regex anchor on `RETURNING id
 * INTO v_recipe_id;` is what we rely on as the per-recipe block
 * delimiter.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, basename, relative } from 'node:path';

import { RecipeQualityScanner } from '../apps/api/src/services/recipeQuality/RecipeQualityScanner.js';
import type {
  RecipePolicyInput,
  RecipePolicyInputIngredient,
  ScannableRecipe,
} from '../apps/api/src/services/recipeQuality/policyTypes.js';

interface CliArgs {
  seeds: string;
  out?: string;
  check: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { seeds: 'supabase/seeds', check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seeds') args.seeds = argv[++i] ?? args.seeds;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--check') args.check = true;
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  process.stdout.write(
    [
      'audit-recipe-policy — PRP-239 PR1a',
      '',
      'Usage:',
      '  tsx scripts/audit-recipe-policy.ts [--seeds <dir>] [--out <file>] [--check]',
      '',
      'Options:',
      '  --seeds <dir>  Seed directory to scan (default: supabase/seeds)',
      '  --out <file>   Write the JSON manifest to this path',
      '  --check        Exit 1 if any change or violation is detected',
      '',
    ].join('\n'),
  );
}

// ---------------------------------------------------------------------------
// Seed parsing
// ---------------------------------------------------------------------------

const RECIPE_INSERT_RE =
  /INSERT INTO public\.recipes\s*\([^)]*\)\s*VALUES\s*\(([\s\S]*?)\)\s*RETURNING id INTO v_recipe_id\s*;/g;

const INGREDIENT_INSERT_RE =
  /INSERT INTO public\.recipe_ingredients\s*\([^)]*\)\s*VALUES\s*([\s\S]*?);/g;

/**
 * Parse a single SQL seed file. Returns one `ScannableRecipe` per
 * `INSERT INTO public.recipes (...) RETURNING id INTO v_recipe_id`
 * block, paired with the ingredients found in the next
 * `INSERT INTO public.recipe_ingredients` block.
 */
function parseSeedFile(filePath: string, repoRoot: string): ScannableRecipe[] {
  const relPath = relative(repoRoot, filePath);
  const text = readFileSync(filePath, 'utf8');
  const recipes: ScannableRecipe[] = [];

  // Pull all recipe inserts in order.
  const recipeBlocks: Array<{ start: number; end: number; valuesBody: string }> = [];
  let m: RegExpExecArray | null;
  RECIPE_INSERT_RE.lastIndex = 0;
  while ((m = RECIPE_INSERT_RE.exec(text)) !== null) {
    recipeBlocks.push({ start: m.index, end: m.index + m[0].length, valuesBody: m[1] });
  }

  // Pull all ingredient inserts in order.
  const ingredientBlocks: Array<{ start: number; valuesBody: string }> = [];
  INGREDIENT_INSERT_RE.lastIndex = 0;
  while ((m = INGREDIENT_INSERT_RE.exec(text)) !== null) {
    ingredientBlocks.push({ start: m.index, valuesBody: m[1] });
  }

  for (let i = 0; i < recipeBlocks.length; i++) {
    const block = recipeBlocks[i];
    const parsed = parseRecipeValues(block.valuesBody);
    if (!parsed) continue;

    // Find the ingredient block that starts after this recipe block but
    // before the next recipe block.
    const nextStart = i + 1 < recipeBlocks.length ? recipeBlocks[i + 1].start : Number.POSITIVE_INFINITY;
    const ingBlock = ingredientBlocks.find((b) => b.start > block.end && b.start < nextStart);
    const ingredients: RecipePolicyInputIngredient[] = ingBlock
      ? parseIngredientRows(ingBlock.valuesBody)
      : [];

    recipes.push({
      sourceFile: relPath,
      recipe: {
        ...parsed,
        ingredients,
      },
    });
  }

  return recipes;
}

interface ParsedRecipeHead {
  name: string;
  description: string | null;
  instructions: string[];
}

function parseRecipeValues(body: string): ParsedRecipeHead | null {
  // The seeds use the convention :
  //   v_user_id, 'NAME', 'DESC', $instr$JSON$instr$, ...
  // We skip the leading `v_user_id,`, then pull two SQL string literals
  // and the dollar-quoted instructions block.
  const tokens = tokenizeValuesTuple(body);
  if (tokens.length < 4) return null;

  // tokens[0] = first column value (user_id placeholder). We expect a
  // bare identifier-looking thing (`v_user_id`); skip it without
  // checking strictly to keep the parser tolerant.
  const name = unquoteSqlString(tokens[1]);
  const description = tokens[2] === 'NULL' ? null : unquoteSqlString(tokens[2]);
  const instructionsRaw = tokens[3];
  const instructions = parseInstructionsBlock(instructionsRaw);

  return { name, description, instructions };
}

/**
 * Split a VALUES tuple body into top-level tokens, respecting :
 *   - single-quoted SQL strings with `''` escape
 *   - dollar-quoted blocks `$instr$...$instr$`
 *   - parenthesised sub-expressions (e.g. ARRAY[...] of items)
 *   - bracketed array literals `ARRAY[...]`
 *
 * Returns the raw token strings (still quoted / wrapped).
 */
function tokenizeValuesTuple(body: string): string[] {
  const out: string[] = [];
  let i = 0;
  let buf = '';
  let depth = 0;

  const flush = () => {
    const t = buf.trim();
    if (t.length > 0) out.push(t);
    buf = '';
  };

  while (i < body.length) {
    const ch = body[i];

    // Dollar-quoted block — find the closing tag.
    if (ch === '$') {
      const tagMatch = /^\$([a-zA-Z_]*)\$/.exec(body.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const end = body.indexOf(tag, i + tag.length);
        if (end === -1) {
          // Malformed; treat as char and move on.
          buf += ch;
          i++;
          continue;
        }
        buf += body.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }

    // Single-quoted string with `''` escape.
    if (ch === "'") {
      let j = i + 1;
      let stringContent = "'";
      while (j < body.length) {
        if (body[j] === "'" && body[j + 1] === "'") {
          stringContent += "''";
          j += 2;
          continue;
        }
        if (body[j] === "'") {
          stringContent += "'";
          j++;
          break;
        }
        stringContent += body[j];
        j++;
      }
      buf += stringContent;
      i = j;
      continue;
    }

    // Track nesting for parentheses + brackets.
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

    // Top-level comma = token separator.
    if (ch === ',' && depth === 0) {
      flush();
      i++;
      continue;
    }

    buf += ch;
    i++;
  }
  flush();
  return out;
}

function unquoteSqlString(token: string): string {
  const t = token.trim();
  if (t.startsWith("'") && t.endsWith("'")) {
    return t.slice(1, -1).replace(/''/g, "'");
  }
  // Fallback: return as-is (caller should know).
  return t;
}

function parseInstructionsBlock(raw: string): string[] {
  // Format: $instr$[ "step", "step", ... ]$instr$
  const match = /^\$([a-zA-Z_]*)\$([\s\S]*)\$\1\$$/.exec(raw.trim());
  if (!match) return [];
  const inner = match[2].trim();
  try {
    const parsed = JSON.parse(inner) as unknown;
    if (Array.isArray(parsed)) return parsed.map((s) => String(s));
    return [];
  } catch {
    return [];
  }
}

function parseIngredientRows(valuesBody: string): RecipePolicyInputIngredient[] {
  // valuesBody = `(v_recipe_id, 'name', 1, 'unit', true, 1, 'notes'), (..)...`
  const rows: RecipePolicyInputIngredient[] = [];
  let i = 0;
  while (i < valuesBody.length) {
    const open = valuesBody.indexOf('(', i);
    if (open === -1) break;
    // Find matching close, respecting strings.
    let depth = 0;
    let j = open;
    let inStr = false;
    while (j < valuesBody.length) {
      const ch = valuesBody[j];
      if (inStr) {
        if (ch === "'" && valuesBody[j + 1] === "'") {
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
    if (j >= valuesBody.length) break;
    const tupleBody = valuesBody.slice(open + 1, j);
    const tokens = tokenizeValuesTuple(tupleBody);
    // (recipe_id, name, quantity, unit, is_essential, order_index, notes)
    if (tokens.length >= 7) {
      const name = unquoteSqlString(tokens[1]);
      const quantity = Number.parseFloat(tokens[2]);
      const unit = unquoteSqlString(tokens[3]);
      const notes = tokens[6] === 'NULL' ? null : unquoteSqlString(tokens[6]);
      rows.push({
        name,
        quantity: Number.isFinite(quantity) ? quantity : null,
        unit,
        notes,
      });
    }
    i = j + 1;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function listSqlSeeds(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch (err) {
    throw new Error(`Cannot read seeds directory '${dir}': ${(err as Error).message}`);
  }
  return entries
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(dir, f));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();

  const seedFiles = listSqlSeeds(args.seeds);
  if (seedFiles.length === 0) {
    process.stderr.write(`[audit-recipe-policy] No .sql files found in ${args.seeds}\n`);
    process.exit(args.check ? 0 : 0);
  }

  const allRecipes: ScannableRecipe[] = [];
  for (const f of seedFiles) {
    try {
      const parsed = parseSeedFile(f, repoRoot);
      allRecipes.push(...parsed);
    } catch (err) {
      process.stderr.write(`[audit-recipe-policy] Failed to parse ${basename(f)}: ${(err as Error).message}\n`);
    }
  }

  const scanner = new RecipeQualityScanner();
  const manifest = scanner.scan(allRecipes);
  const serialized = RecipeQualityScanner.serialize(manifest);

  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, serialized, 'utf8');
    process.stdout.write(`[audit-recipe-policy] Wrote manifest → ${args.out}\n`);
  } else if (!args.check) {
    process.stdout.write(serialized);
  }

  const summary = [
    `[audit-recipe-policy] Seeds scanned: ${seedFiles.length}`,
    `[audit-recipe-policy] Recipes parsed: ${allRecipes.length}`,
    `[audit-recipe-policy] Changes proposed: ${manifest.changes.length}`,
    `[audit-recipe-policy] Violations remaining (descr/instr): ${manifest.violations_remaining.length}`,
    '',
  ].join('\n');
  process.stderr.write(summary);

  if (args.check) {
    const offending = manifest.changes.length + manifest.violations_remaining.length;
    if (offending > 0) {
      process.stderr.write(
        `[audit-recipe-policy] FAIL — ${offending} policy issue(s) detected. Run without --check to emit the manifest.\n`,
      );
      process.exit(1);
    }
    process.stderr.write('[audit-recipe-policy] OK — no policy issues.\n');
    process.exit(0);
  }
}

main();
