import { normalizeMemoryText } from '@smart/shared';
import type { RecipeWithIngredients } from './types.js';
export function scoreMemoryTaste(recipe: RecipeWithIngredients, preference: 'spicy' | 'mild' | null, temporary = false) {
  if (!preference) return { score: 0, available: false, reason: null };
  const tags = (recipe.tags ?? []).map(normalizeMemoryText);
  const spicyTag = tags.some(t => /^(epice|epicee|piquant|piquante|spicy)$/.test(t));
  const mildTag = tags.some(t => /^(doux|douce|non epice|non epicee|mild)$/.test(t));
  const spicyIngredient = (recipe.recipe_ingredients ?? []).some(i => {
    const n = normalizeMemoryText(i.ingredient_name ?? '');
    return /\b(piment|chili|harissa|cayenne|gochujang|jalapeno)\b/.test(n) && !/\bpiment doux\b/.test(n);
  });
  const documented = spicyTag || spicyIngredient ? 'spicy' : mildTag ? 'mild' : null;
  if (!documented) return { score: 0, available: false, reason: null };
  const matches = preference === documented;
  return { score: matches ? 0.45 : -0.45, available: true,
    reason: matches ? 'Correspond à votre ' + (temporary ? 'envie pour ce repas' : 'goût confirmé') + ' : plats ' + (preference === 'spicy' ? 'épicés' : 'doux') + '.'
      : 'Caractère ' + (documented === 'spicy' ? 'épicé' : 'doux') + ' renseigné, moins proche de votre ' + (temporary ? 'envie pour ce repas.' : 'goût confirmé.') };
}
