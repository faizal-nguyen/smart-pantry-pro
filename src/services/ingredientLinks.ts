/**
 * V11-01 — « Je l'ai déjà »: an ingredient name linked to a product of the account's stock
 * (public.ingredient_product_links, 20261125090000). resolve_stock_recipe gives the product to
 * every ingredient of that name without one, so cooking and shopping both count it.
 */
import { normalizeIngredientName } from '@smart/shared';
import { supabase } from '@/integrations/supabase/client';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';

/** As the table's check: a normalized name of 1 to 120 characters. */
const KEY_MAX_LENGTH = 120;
const REFUSALS: Record<string, string> = {
  PGRST205: 'Cette action n’est pas encore disponible. Réessaie un peu plus tard.',
  '42P01': 'Cette action n’est pas encore disponible. Réessaie un peu plus tard.',
  '23503': 'Ce produit n’existe plus. Choisis-en un autre.',
  '23514': 'Ce nom d’ingrédient ne peut pas être relié.',
};
const FAILED = 'Le lien n’a pas pu être enregistré. Réessaie.';

async function requireOwner(owner: string): Promise<void> {
  if ((await supabase.auth.getSession()).data.session?.user.id !== owner) throw new Error('Reconnecte-toi au compte de ces courses.');
}

/**
 * The name as the recipe writes it, trimmed. The database normalizes it with the function
 * resolve_stock_recipe looks it up with (stock_normalize_name keeps a non-breaking space the app's
 * normalization turns into a space): the key is never computed here.
 */
function linkName(ingredientName: string): string {
  const name = ingredientName.trim();
  if (!name || normalizeIngredientName(name).length > KEY_MAX_LENGTH) throw new Error('Ce nom d’ingrédient ne peut pas être relié.');
  return name;
}

/** The database refusal as the user reads it, never the raw message. */
function refusal(error: { code?: string }): Error {
  return new Error(REFUSALS[error.code ?? ''] ?? FAILED);
}

/** Links the ingredient name to the product, replacing an earlier link of that name; returns the stored key. */
export async function linkIngredient(owner: string, ingredientName: string, productId: string): Promise<string> {
  const name = linkName(ingredientName);
  await requireOwner(owner);
  const { data, error } = await supabase.from('ingredient_product_links')
    .upsert({ user_id: owner, ingredient_key: name, product_id: productId }, { onConflict: 'user_id,ingredient_key' })
    .select('ingredient_key').single();
  if (error || !data) throw refusal(error ?? {});
  // Recipes now resolve the product: the week's shopping and the recipe checks are read again.
  dispatchAgentDbChanged(['recipe_ingredients']);
  return data.ingredient_key;
}

/** Removes the link stored under this key (as linkIngredient returned it), for this account only. */
export async function unlinkIngredient(owner: string, ingredientKey: string): Promise<void> {
  await requireOwner(owner);
  const { data, error } = await supabase.from('ingredient_product_links').delete()
    .eq('user_id', owner).eq('ingredient_key', ingredientKey).select('ingredient_key');
  if (error) throw refusal(error);
  if (!data?.length) throw new Error('Ce lien n’existe plus.');
  dispatchAgentDbChanged(['recipe_ingredients']);
}
