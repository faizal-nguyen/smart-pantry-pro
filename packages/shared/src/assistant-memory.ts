import { z } from 'zod';

export const MemoryKindSchema = z.enum(['response_style', 'preference', 'negative_preference',
  'cooking_style', 'constraint', 'diet_goal', 'recipe_feedback', 'shopping_pattern', 'habit']);
export const MemoryDestinationSchema = z.enum(['memory', 'profile', 'feedback', 'session']);
export type MemoryDestination = z.infer<typeof MemoryDestinationSchema>;
export const MemoryPolicySchema = z.object({
  userId: z.string().uuid(), revision: z.number().int().nonnegative(),
  memoryEnabled: z.boolean(), saveHistory: z.boolean(), shareProfile: z.boolean(),
  profileVersion: z.number().int().nonnegative(),
}).strict();
export type MemoryPolicy = z.infer<typeof MemoryPolicySchema>;
export const MemoryProfileFieldSchema = z.enum(['allergies', 'excludedIngredients', 'diets', 'goals', 'likedIngredients',
  'avoidedIngredients', 'cuisines', 'equipment', 'usualTimeMinutes', 'usualServings']);

export const MemoryFactPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('taste'), subject: z.literal('spiciness'), value: z.enum(['spicy', 'mild']) }).strict(),
  z.object({
    type: z.literal('profile'),
    field: MemoryProfileFieldSchema.nullable(),
    operation: z.enum(['add', 'set']).nullable(),
    value: z.union([z.array(z.string().min(1).max(80)).max(30), z.number().int().min(1).max(600)]).nullable(),
    subject: z.string().max(200),
  }).strict(),
  z.object({ type: z.literal('note'), subject: z.string().max(200), value: z.string().max(2000) }).strict(),
]);
export type MemoryFactPayload = z.infer<typeof MemoryFactPayloadSchema>;
export interface ClassifiedMemoryFact {
  destination: MemoryDestination;
  kind: z.infer<typeof MemoryKindSchema>;
  content: string;
  payload: MemoryFactPayload;
  semanticSubject: string;
  sensitivity: 'normal' | 'personal' | 'health_sensitive';
  status: 'active' | 'candidate';
  source: 'user_explicit' | 'assistant_inferred';
  pattern: string;
}
export function normalizeMemoryText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[’']/g, ' ').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function isSensitiveMemoryText(value: string): boolean {
  return /\b(allerg\w*|intoleran\w*|diabet\w*|maladie|medicament\w*|traitement|enceinte|grossesse|diagnostic|asthme|hypertension|sante|poids)\b|sans (gluten|lactose)/.test(normalizeMemoryText(value));
}
const profileFact = (content: string, field: z.infer<typeof MemoryProfileFieldSchema> | null,
  value: string[] | number | null, operation: 'add' | 'set' | null,
  source: ClassifiedMemoryFact['source'], sensitive = false): ClassifiedMemoryFact => {
  if (Array.isArray(value) && value.some(v => !v || v.length > 80 ||
    (sensitive && /\b(et|ou)\b|,/.test(normalizeMemoryText(v))))) { field = null; value = null; operation = null; }
  return {
  destination: 'profile', kind: sensitive ? 'constraint' : field === 'goals' ? 'diet_goal' : 'preference',
  content, payload: { type: 'profile', field, operation, value, subject: field ?? 'health' },
  semanticSubject: (field ?? 'health') + ':' + (operation === 'set' ? 'usual' : normalizeMemoryText(JSON.stringify(value ?? content))),
  sensitivity: sensitive ? 'health_sensitive' : 'normal', status: 'candidate', source, pattern: field ?? 'health',
  };
};

/** A destination is chosen before the generic "remember" rule. No provider call. */
export function classifyMemoryFact(text: string, options: { explicit?: boolean; kind?: z.infer<typeof MemoryKindSchema> } = {}): ClassifiedMemoryFact | null {
  const content = text.trim().slice(0, 2000);
  if (!content) return null;
  const n = normalizeMemoryText(content);
  const explicit = options.explicit === true || /\b(souviens toi|rappelle toi|retiens|memorise|finalement|corrige)\b/.test(n);
  const source = explicit ? 'user_explicit' : 'assistant_inferred';
  const clean = content.replace(/^(?:souviens[-\s]?toi|rappelle[-\s]?toi|retiens|mémorise)\s*(?:que|de)?\s*/iu, '');
  const tail = (value: string) => value.replace(/[.!?;].*$/s, '').trim();
  const allergy = clean.match(/(?:allergique|allergie)\s+(?:à la|à l[’']|aux?|au|à|de|d[’'])\s*(.+)/iu);
  if (allergy && !/\b(pas allergique|ne suis pas)\b/.test(n))
    return tail(allergy[1]!).length <= 80 && !/\bet (?:je|j |aussi)\b/.test(normalizeMemoryText(allergy[1]!))
      ? profileFact(content, 'allergies', [tail(allergy[1]!)], 'add', source, true)
      : profileFact(content, null, null, null, source, true);
  const intolerance = clean.match(/intoléran(?:t|te|ce)\s+(?:à la|à l[’']|aux?|au|à)\s*(.+)/iu);
  if (intolerance) return tail(intolerance[1]!).length <= 80 ? profileFact(content, 'excludedIngredients', [tail(intolerance[1]!)], 'add', source, true) : profileFact(content, null, null, null, source, true);
  const diets: Array<[RegExp, string]> = [
    [/\bvegan\b/, 'vegan'], [/\bvegetari\w*\b/, 'vegetarian'], [/sans gluten/, 'gluten_free'],
    [/sans lactose/, 'lactose_free'], [/\bhalal\b/, 'halal'], [/\bcasher\b|\bkosher\b/, 'kosher'],
    [/sans porc/, 'no_pork'], [/sans alcool/, 'no_alcohol'],
  ];
  const diet = diets.find(([pattern]) => pattern.test(n));
  const temporary = /\b(ce soir|aujourd hui|maintenant|pour ce repas|ce midi|demain)\b/.test(n);
  if (diet && !temporary) return profileFact(content, 'diets', [diet[1]], 'add', source, /sans (gluten|lactose)/.test(n));
  if (isSensitiveMemoryText(content)) return profileFact(content, null, null, null, source, true);
  if (temporary) return {
    destination: 'session', kind: 'habit', content,
    payload: { type: 'note', subject: 'meal_context', value: content }, semanticSubject: 'meal_context',
    sensitivity: 'normal', status: 'active', source, pattern: 'temporary',
  };
  if (/\b(a refaire|trop long|cette recette|ce plat)\b/.test(n) && /\b(a refaire|trop long|aime|adore|aime pas)\b/.test(n))
    return { destination: 'feedback', kind: 'recipe_feedback', content,
      payload: { type: 'note', subject: 'recipe_feedback', value: content }, semanticSubject: 'recipe_feedback',
      sensitivity: 'normal', status: 'candidate', source, pattern: 'feedback' };
  if (/\b(epice\w*|doux|douce|piquant\w*)\b/.test(n) && /\b(prefere|aime|plats|cuisine)\b/.test(n)) {
    const value = /\b(doux|douce|pas epice|peu epice|pas piquant)\b/.test(n) ? 'mild' : 'spicy';
    return { destination: 'memory', kind: 'preference',
      content: value === 'spicy' ? 'Je préfère les plats épicés.' : 'Je préfère les plats doux.',
      payload: { type: 'taste', subject: 'spiciness', value }, semanticSubject: 'taste:spiciness',
      sensitivity: 'normal', status: explicit ? 'active' : 'candidate', source, pattern: 'spiciness' };
  }
  const minutes = n.match(/(?:habituellement|en general|d habitude|souvent).*?(\d{1,3})\s*(?:minutes|min)\b/);
  if (minutes && +minutes[1]! > 0 && +minutes[1]! <= 600)
    return profileFact(content, 'usualTimeMinutes', +minutes[1]!, 'set', source);
  const servings = n.match(/(?:habituellement|en general|d habitude|souvent).*?(\d{1,2})\s*(?:personnes|portions)\b/);
  if (servings && +servings[1]! > 0 && +servings[1]! <= 20)
    return profileFact(content, 'usualServings', +servings[1]!, 'set', source);
  const disliked = clean.match(/(?:je n[’']aime pas|je ne veux pas|ne me repropose pas|je veux éviter)\s+(.+)/iu);
  if (disliked) return profileFact(content, 'avoidedIngredients', [tail(disliked[1]!)], 'add', source);
  const cuisine = clean.match(/(?:j[’']aime|je préfère|j[’']adore)\s+(?:la|les)?\s*cuisine(?:s)?\s+(.+)/iu);
  if (cuisine) return profileFact(content, 'cuisines', [tail(cuisine[1]!)], 'add', source);
  const liked = clean.match(/(?:j[’']aime|j[’']adore)\s+(.+)/iu);
  if (liked) return profileFact(content, 'likedIngredients', [tail(liked[1]!)], 'add', source);
  const equipment = n.match(/(?:j ai|je possede|je dispose).*?\b(four|robot|air fryer|airfryer|micro ondes|mixeur|blender)\b/);
  if (equipment) return profileFact(content, 'equipment', [equipment[1]!], 'add', source);
  const goal = /\bproteine/.test(n) ? 'protein' : /\bfibre/.test(n) ? 'more_fiber'
    : /plus de legumes/.test(n) ? 'vegetables' : /anti gaspi|moins gaspiller/.test(n) ? 'anti_waste' : null;
  if (goal) return profileFact(content, 'goals', [goal], 'add', source);
  if (options.kind === 'constraint' || options.kind === 'diet_goal')
    return profileFact(content, null, null, null, source, true);
  if (!explicit && !options.kind && !/\b(prefere|habitude)\b/.test(n)) return null;
  const kind = options.kind ?? 'preference';
  return { destination: 'memory', kind, content: clean,
    payload: { type: 'note', subject: kind === 'response_style' ? 'response_style' : normalizeMemoryText(clean).slice(0, 200), value: clean },
    semanticSubject: kind === 'response_style' ? 'response_style' : normalizeMemoryText(clean),
    sensitivity: 'normal', status: explicit ? 'active' : 'candidate', source, pattern: 'note' };
}

export const MemoryOperationSchema = z.enum(['save', 'correct', 'confirm', 'forget', 'reject']);
export const MemoryCommandSchema = z.object({
  command_id: z.string().uuid(), expected_version: z.number().int().nonnegative(),
  expected_revision: z.number().int().nonnegative(),
  operation: MemoryOperationSchema, memory_id: z.string().uuid().optional(),
  expected_profile_version: z.number().int().nonnegative().optional(),
  payload: z.object({
    content: z.string().trim().min(1).max(2000), kind: MemoryKindSchema.optional(),
    source: z.enum(['user_explicit', 'assistant_inferred']).default('user_explicit'),
    evidence: z.object({
      message_id: z.string().uuid().nullable().optional(),
      channel: z.enum(['text', 'voice', 'manual', 'tool']).optional(), pattern: z.string().max(80).optional(),
    }).strict().optional(),
  }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  if (['save', 'correct'].includes(value.operation) && !value.payload)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['payload'], message: 'Le contenu est nécessaire.' });
  if (value.operation !== 'save' && !value.memory_id)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memory_id'], message: 'Le souvenir est nécessaire.' });
  if (value.operation === 'save' && value.memory_id)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memory_id'], message: 'Une création utilise son sujet.' });
});
export type MemoryCommand = z.infer<typeof MemoryCommandSchema>;
export const MemoryWriteResultSchema = z.object({
  command_id: z.string().uuid(),
  status: z.enum(['saved', 'awaiting_confirmation', 'disabled', 'not_saved', 'verification_required']),
  operation: MemoryOperationSchema, memory_id: z.string().uuid().nullable(), version: z.number().int().nullable(),
  destination: MemoryDestinationSchema.nullable(), policy_revision: z.number().int().nonnegative(),
  profile_version: z.number().int().nullable(), reason: z.string().max(80).nullable(), replayed: z.boolean().optional(),
}).strict();
export type MemoryWriteResult = z.infer<typeof MemoryWriteResultSchema>;
export interface ReliableMemoryMetadata {
  version: number; destination: MemoryDestination | null; payload: MemoryFactPayload | Record<string, never> | null;
  semantic_key: string | null; policy_revision: number | null; profile_version: number | null;
}
export const AssistantSessionMessagesSchema = z.array(z.object({
  role: z.enum(['user', 'assistant']), content: z.string().min(1).max(500),
}).strict()).max(8);
export type AssistantSessionMessage = z.infer<typeof AssistantSessionMessagesSchema>[number];
