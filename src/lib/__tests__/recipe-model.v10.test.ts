import { mapLibraryRecipe, normalizeRecipeInstructions, recipeDurationMinutes, resolveRecipeImageUrl } from '@smart/shared';

test('the mapper preserves the personal identity, photo and effective adaptation without fabricated metadata', () => {
  const row = { id: 'personal', user_id: 'owner', is_from_catalog: true, created_at: '', updated_at: '', custom_photo_url: ' /personal.jpg ',
    catalog_recipe: { id: 'catalog', title: 'Riz', photo_url: '/catalog.jpg', servings: 2, prep_time: 5, cook_time: 15, rest_time: 10,
      instructions: '["Cuire.","Servir."]', ingredients_json: [{ name: 'Lait', quantity: 50, unit: 'g' }], created_at: '', updated_at: '' },
    custom_modifications: { title: 'Mon riz', ingredients_override: [{ name: 'Riz', quantity: 100, unit: 'g' }], servings_multiplier: 2, instructions_append: '3. Goûter.' } };
  const recipe = mapLibraryRecipe(row);
  expect(recipe).toMatchObject({ id: 'personal', canonicalId: 'catalog', source: 'user_recipes', image_url: '/personal.jpg', servings: 4 });
  expect(recipe.inlineIngredients).toEqual([expect.objectContaining({ ingredient_name: 'Riz', quantity: 200 })]);
  expect(normalizeRecipeInstructions(recipe.instructions)).toEqual(['Cuire.', 'Servir.', 'Goûter.']);
  expect(recipeDurationMinutes(recipe)).toBe(30);
  expect(mapLibraryRecipe({ ...row,custom_photo_url:' ' })).toMatchObject({ image_url:'/catalog.jpg',image_origin:'catalog' });
  expect(mapLibraryRecipe({ ...row, is_from_catalog: false })).toMatchObject({ servings: null, prep_time: null, cook_time: null });
});
test('empty photo and missing time remain distinct from a fallback URL and recorded zero minutes', () => {
  expect(resolveRecipeImageUrl(' ', '/catalog.jpg')).toBe('/catalog.jpg');
  expect(resolveRecipeImageUrl(null, '')).toBeNull();
  expect(recipeDurationMinutes({ prep_time: null, cook_time: 0 })).toBeNull();
  expect(recipeDurationMinutes({ prep_time: 0, cook_time: 0 })).toBe(0);
});
