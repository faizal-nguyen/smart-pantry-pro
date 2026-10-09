import { recommendationModelContext } from '../RecommendationModelContext.js';

const recipe = {
  id: 'recipe', name: 'Riz', reference: { id: 'recipe', source: 'recipes' }, profile_version: 2,
  servings: 2, duration_minutes: 15,
  availability: { status: 'available', missing: [], uncertainties: [] },
  constraints: { status: 'compatible', findings: [{ code: 'DECLARED_ALLERGY', ingredient: 'Beurre', message: 'Allergie privée au lait.' }], limitations: [] },
  nutrition: { status: 'known', coverage: 1, per_serving: { proteinG: 8 }, limitations: [] },
  reason_codes: [{ code: 'STOCK_AVAILABLE', text: 'Stock renseigné.' }, { code: 'DECLARED_TASTE', text: 'Préférence privée pour le riz.' }],
};
const result = () => ({ pipeline_version: 3, profile_version: 2, cookable_now: [recipe], almost_cookable: [], verify_suggestions: [], excluded_suggestions: [recipe] });

test('sharing disabled removes inferred profile details from model transport while preserving full UI evidence', () => {
  const original = result();
  const serialised = JSON.stringify(recommendationModelContext(original));
  expect(serialised).toContain('Stock renseigné');
  for (const privateText of ['Allergie privée', 'Beurre', 'Préférence privée', 'servings']) expect(serialised).not.toContain(privateText);
  expect(original.excluded_suggestions[0].constraints.findings[0].message).toBe('Allergie privée au lait.');
});
test('explicit sharing sends computed reasons for the exact confirmed profile version', () => {
  const serialised = JSON.stringify(recommendationModelContext(result(), 2));
  expect(serialised).toContain('Allergie privée');
  expect(serialised).toContain('Préférence privée');
});
test('a changed profile and legacy cookability tool results cannot inherit old consent', () => {
  expect(JSON.stringify(recommendationModelContext(result(), 1))).not.toContain('Allergie privée');
  expect(JSON.stringify(recommendationModelContext({ recipes: [recipe] }))).not.toContain('Préférence privée');
});
test('bounded recipe context remains complete JSON instead of cutting an evidence payload mid-object', () => {
  const long = { ...recipe, reason_codes: [{ code: 'TIME_FITS', text: 'x'.repeat(5000) }] };
  const transport = recommendationModelContext({ ...result(), cookable_now: Array(8).fill(long) }, 2);
  const parsed = JSON.parse(JSON.stringify(transport));
  expect(parsed.cookable_now).toHaveLength(3);
  expect(parsed.cookable_now[0].reason_codes[0].text).toHaveLength(160);
  expect(recommendationModelContext({ products: [] })).toBeNull();
});
