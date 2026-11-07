import { z } from 'zod';
import { ImportedRecipeDraftSchema, type ImportedRecipeDraft } from '@smart/shared';

const optionalText = z.string().max(2000);
const ingredient = z.object({
  key: z.string(), name: z.string().max(200), quantity: z.string().max(40), unit: z.string().max(50),
  notes: z.string().max(500), isEssential: z.boolean(), rawText: z.string().max(500).optional(),
});
const instruction = z.object({
  key: z.string(), description: optionalText, durationSeconds: z.string().max(20), rawText: optionalText.optional(),
});
export const DiscoveryDraftFormSchema = z.object({
  title: z.string().max(300), description: z.string().max(3000),
  prepTimeMinutes: z.string().max(20), cookTimeMinutes: z.string().max(20), restTimeMinutes: z.string().max(20),
  servings: z.string().max(20), cuisineCategory: z.string().max(100), mealType: z.string().max(100),
  ingredients: z.array(ingredient).max(100), instructions: z.array(instruction).max(100),
});
export type DiscoveryDraftForm = z.infer<typeof DiscoveryDraftFormSchema>;
export const DiscoveryReviewSchema = z.object({
  owner: z.string(), itemId: z.string(), importId: z.string(), revision: z.number().int().positive(),
  original: ImportedRecipeDraftSchema, form: DiscoveryDraftFormSchema,
  acknowledgeUnknowns: z.boolean(), sourceReviewed: z.boolean(), acknowledgeAdaptations: z.boolean(),
  // Reviews kept on a device before this choice existed read as « no copy ».
  keepImageCopy: z.boolean().default(false),
  reviewedDraft: ImportedRecipeDraftSchema.nullable(),
  adaptations: z.array(z.object({ path: z.string(), from: z.string(), to: z.string() })),
  pendingSave: z.object({
    draft: ImportedRecipeDraftSchema, expected_revision: z.number().int().positive(),
    acknowledge_unknowns: z.boolean(), source_reviewed: z.boolean(), acknowledge_adaptations: z.boolean(),
    keep_image_copy: z.boolean().default(false),
  }).nullable(),
});
export type DiscoveryReview = z.infer<typeof DiscoveryReviewSchema>;

export function formFromDraft(draft: ImportedRecipeDraft): DiscoveryDraftForm {
  const value = (number: number | undefined) => number == null ? '' : String(number);
  return {
    title: draft.title, description: draft.description ?? '',
    prepTimeMinutes: value(draft.prepTimeMinutes), cookTimeMinutes: value(draft.cookTimeMinutes),
    restTimeMinutes: value(draft.restTimeMinutes), servings: value(draft.servings),
    cuisineCategory: draft.cuisineCategory ?? '', mealType: draft.mealType ?? '',
    ingredients: draft.ingredients.map((item, index) => ({
      key: `ingredient:${index}`, name: item.name, quantity: value(item.quantity), unit: item.unit ?? '',
      notes: item.notes ?? '', isEssential: item.isEssential !== false, rawText: item.rawText,
    })),
    instructions: draft.instructions.map((item, index) => ({
      key: `instruction:${index}`, description: item.description, durationSeconds: value(item.durationSeconds), rawText: item.rawText,
    })),
  };
}

function numberField(value: string, label: string, integer = false): number | undefined {
  if (!value.trim()) return undefined;
  const text = value.trim().replace(',', '.');
  const result = Number(text);
  if (!/^\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(result) || result < 0 || (integer && !Number.isInteger(result))) {
    throw new Error(`${label} : renseigne un nombre ${integer ? 'entier ' : ''}positif ou laisse le champ vide.`);
  }
  return result;
}

/** Keep absent facts absent; original source and its snapshot never come from editable fields. */
export function draftFromForm(form: DiscoveryDraftForm, original: ImportedRecipeDraft): ImportedRecipeDraft {
  const draft = {
    ...original, title: form.title.trim(), description: form.description.trim() || undefined,
    prepTimeMinutes: numberField(form.prepTimeMinutes, 'Préparation', true),
    cookTimeMinutes: numberField(form.cookTimeMinutes, 'Cuisson', true),
    restTimeMinutes: numberField(form.restTimeMinutes, 'Repos', true),
    servings: numberField(form.servings, 'Portions', true),
    cuisineCategory: form.cuisineCategory.trim() || undefined, mealType: form.mealType.trim() || undefined,
    ingredients: form.ingredients.map((item, index) => ({
      name: item.name.trim(), quantity: numberField(item.quantity, `Quantité de l’ingrédient ${index + 1}`),
      unit: item.unit.trim() || undefined, notes: item.notes.trim() || undefined,
      isEssential: item.isEssential, rawText: item.rawText,
    })),
    instructions: form.instructions.map((item, index) => ({
      step: index + 1, description: item.description.trim(),
      durationSeconds: numberField(item.durationSeconds, `Durée de l’étape ${index + 1}`, true), rawText: item.rawText,
    })),
  };
  const parsed = ImportedRecipeDraftSchema.safeParse(draft);
  if (!parsed.success) throw new Error(parsed.error.issues.map(issue => `${issue.path.join('.')} : ${issue.message}`).join(' · '));
  return parsed.data;
}
