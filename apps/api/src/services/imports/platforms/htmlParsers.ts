/**
 * HTML parsers shared across platform adapters (PRP-220.14):
 *   - Open Graph + Twitter card metadata (title / description / image / author)
 *   - JSON-LD `Recipe` (schema.org) extraction
 *
 * Uses cheerio (already a project dependency). Both helpers return
 * undefined / empty objects on parse failure rather than throwing.
 */
import * as cheerio from 'cheerio';

export interface OpenGraphMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  authorName?: string;
  siteName?: string;
}

const META_FALLBACKS: Array<[(string | RegExp), keyof OpenGraphMetadata]> = [
  ['og:title', 'title'],
  ['twitter:title', 'title'],
  ['og:description', 'description'],
  ['twitter:description', 'description'],
  ['description', 'description'],
  ['og:image', 'imageUrl'],
  ['twitter:image', 'imageUrl'],
  ['og:image:secure_url', 'imageUrl'],
  ['og:site_name', 'siteName'],
  ['author', 'authorName'],
  ['article:author', 'authorName'],
];

export function parseOpenGraph(html: string): OpenGraphMetadata {
  const out: OpenGraphMetadata = {};
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return out;
  }

  $('meta').each((_, el) => {
    const name = ($(el).attr('property') ?? $(el).attr('name') ?? '').toLowerCase();
    const content = $(el).attr('content');
    if (!content) return;
    for (const [match, key] of META_FALLBACKS) {
      const matched = typeof match === 'string' ? name === match : match.test(name);
      if (matched && !out[key]) {
        out[key] = content.trim();
      }
    }
  });

  // <title> as last-resort, only when meta tags didn't surface a title.
  if (!out.title) {
    const titleTag = $('title').first().text().trim();
    if (titleTag) out.title = titleTag;
  }

  return out;
}

// ---- JSON-LD recipe -------------------------------------------------

export interface JsonLdRecipe {
  name?: string;
  description?: string;
  author?: string;
  imageUrl?: string;
  ingredients: string[];
  /** Each instruction is the raw string ; ordering preserved. */
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string | number;
  cuisine?: string;
  category?: string;
  /** Concatenated text representation, useful for the AI prompt. */
  rawText: string;
}

/**
 * Look for a `<script type="application/ld+json">` block whose `@type`
 * is `Recipe` (or contains `Recipe` in an array). Returns the first
 * match. Returns null when nothing matches.
 */
export function parseJsonLdRecipe(html: string): JsonLdRecipe | null {
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return null;
  }
  const blocks = $('script[type="application/ld+json"]').toArray();
  for (const el of blocks) {
    const text = $(el).text();
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      const recipe = pickRecipe(parsed);
      if (recipe) return shapeRecipe(recipe);
    } catch {
      // Some sites stuff multiple JSON objects in a single tag, separated
      // by a comma — try a leniant split before giving up.
      try {
        const parsed = JSON.parse(`[${text.replace(/}\s*{/g, '},{')}]`);
        const recipe = pickRecipe(parsed);
        if (recipe) return shapeRecipe(recipe);
      } catch {
        continue;
      }
    }
  }
  return null;
}

function pickRecipe(node: any): any | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = pickRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object') return null;

  const t = node['@type'];
  if (typeof t === 'string' && t.toLowerCase() === 'recipe') return node;
  if (Array.isArray(t) && t.some((x) => typeof x === 'string' && x.toLowerCase() === 'recipe')) {
    return node;
  }

  // Some sites wrap the recipe inside @graph: [{...}].
  if (Array.isArray(node['@graph'])) {
    return pickRecipe(node['@graph']);
  }
  return null;
}

function shapeRecipe(r: any): JsonLdRecipe {
  const ingredients = arrayOf(r.recipeIngredient).map(stringOf).filter(Boolean) as string[];
  const instructions = parseInstructions(r.recipeInstructions);

  const out: JsonLdRecipe = {
    name: stringOf(r.name)?.slice(0, 500),
    description: stringOf(r.description)?.slice(0, 5000),
    author: stringOf(r.author?.name ?? r.author),
    imageUrl: stringOf(arrayOf(r.image)[0]),
    ingredients,
    instructions,
    prepTime: stringOf(r.prepTime),
    cookTime: stringOf(r.cookTime),
    totalTime: stringOf(r.totalTime),
    servings:
      typeof r.recipeYield === 'number'
        ? r.recipeYield
        : stringOf(r.recipeYield) ?? stringOf(r.yield),
    cuisine: stringOf(r.recipeCuisine),
    category: stringOf(r.recipeCategory),
    rawText: '',
  };

  out.rawText = [
    out.name && `Title: ${out.name}`,
    out.description && `Description: ${out.description}`,
    out.servings != null && `Servings: ${out.servings}`,
    out.totalTime && `Total time: ${out.totalTime}`,
    out.prepTime && `Prep time: ${out.prepTime}`,
    out.cookTime && `Cook time: ${out.cookTime}`,
    ingredients.length > 0 && `Ingredients:\n${ingredients.join('\n')}`,
    instructions.length > 0 && `Instructions:\n${instructions.join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return out;
}

function arrayOf(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function stringOf(value: any): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    if (typeof value.url === 'string') return value.url.trim() || undefined;
    if (typeof value.name === 'string') return value.name.trim() || undefined;
    if (typeof value['@id'] === 'string') return value['@id'].trim() || undefined;
  }
  return undefined;
}

function parseInstructions(value: any): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((step: any) => {
      if (typeof step === 'string') return step.trim();
      if (step && typeof step === 'object') {
        // HowToStep / HowToSection may nest itemListElement
        if (Array.isArray(step.itemListElement)) {
          return step.itemListElement
            .map((s: any) => stringOf(s?.text ?? s?.name ?? s) ?? '')
            .filter(Boolean)
            .join(' ');
        }
        return stringOf(step.text ?? step.name);
      }
      return undefined;
    })
    .filter((s): s is string => Boolean(s));
}
