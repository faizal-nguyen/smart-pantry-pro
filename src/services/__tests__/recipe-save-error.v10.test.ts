import { z } from 'zod';

import { describeSaveError } from '../recipePersistence';

jest.mock('../stockCommands', () => ({}));
jest.mock('@/lib/recipeSource', () => ({}));
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

test('names the refused field of an invalid recipe', () => {
  const invalid = z.object({ ingredients: z.array(z.object({ quantity: z.number().positive() })) })
    .safeParse({ ingredients: [{ quantity: 0 }] });
  expect(invalid.success).toBe(false);
  expect(describeSaveError(!invalid.success && invalid.error)).toBe('Champ refusé : ingredients.1.quantity.');
});

test('keeps the French reason of a save left to check, and falls back otherwise', () => {
  expect(describeSaveError(new Error('Une action précédente reste à vérifier.'))).toBe('Une action précédente reste à vérifier.');
  expect(describeSaveError('boom')).toBe('Impossible de sauvegarder la recette.');
});
