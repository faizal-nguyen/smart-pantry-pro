import { classifyMemoryFact } from '@smart/shared';
import { MemoryExtractor } from '../MemoryExtractor.js';
import { USER } from '../__fixtures__/memory.js';
const extract = (text: string, source: 'text' | 'voice' = 'text') => new MemoryExtractor().extract({ userId: USER, text, source });
test('M02 remember + specific taste is exactly one structured explicit fact', () => {
  const result = extract('Souviens-toi que je préfère les plats épicés');
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ kind: 'memory', candidate: { status: 'active', source: 'user_explicit', fact: {
    destination: 'memory', payload: { type: 'taste', subject: 'spiciness', value: 'spicy' },
  } } });
});
test('M02 remember + allergy never produces an active ordinary preference', () => {
  const result = extract('Souviens-toi que je suis allergique aux cacahuètes');
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ candidate: { status: 'candidate', sensitivity: 'health_sensitive', fact: { destination: 'profile', payload: { field: 'allergies', value: ['cacahuètes'] } } } });
});
test('tonight preserves the full temporary wish and does not overwrite durable taste', () => {
  expect(extract('Ce soir, pas épicé')).toEqual([{ kind: 'session', candidate: { kind: 'session_context', key: 'meal_context', value: { text: 'Ce soir, pas épicé', pattern: 'temporary' }, ttlMs: 86400000 } }]);
});
test('explicit mild correction has the same subject as spicy preference', () => {
  const old = classifyMemoryFact('Souviens-toi que je préfère les plats épicés');
  const fresh = classifyMemoryFact('Finalement je préfère les plats doux');
  expect(fresh?.semanticSubject).toBe(old?.semanticSubject);
  expect(fresh).toMatchObject({ status: 'active', payload: { value: 'mild' } });
});
test.each([
  ['Je suis intolérant au lactose', 'excludedIngredients'], ['Je suis vegan', 'diets'],
  ["J’aime les tomates", 'likedIngredients'], ["Je n’aime pas la coriandre", 'avoidedIngredients'],
  ["J’aime la cuisine indienne", 'cuisines'], ["J’ai un air fryer", 'equipment'],
  ['Habituellement je cuisine en 20 minutes', 'usualTimeMinutes'], ['Habituellement nous sommes 4 personnes', 'usualServings'],
])('canonical destination: %s', (text, field) => {
  expect(classifyMemoryFact(text)).toMatchObject({ destination: 'profile', status: 'candidate', payload: { field } });
});
test('unmapped clinical goal stays a manual profile proposal', () => {
  expect(classifyMemoryFact('Je veux perdre du poids')).toMatchObject({ destination: 'profile', sensitivity: 'health_sensitive', status: 'candidate', payload: { field: null } });
});
test('compound medical statements require editing the profile instead of creating a composite ingredient', () => {
  expect(classifyMemoryFact('Souviens-toi que je suis allergique au lait et au soja')).toMatchObject({
    destination: 'profile', status: 'candidate', payload: { field: null, value: null },
  });
});
test('inferred taste remains candidate; feedback and vague talk create no preference', () => {
  expect(extract('Je préfère les plats épicés')[0]).toMatchObject({ candidate: { source: 'assistant_inferred', status: 'candidate' } });
  expect(extract('Cette recette est trop longue')).toHaveLength(0);
  expect(extract('Je suis fatigué')).toHaveLength(0);
});
test('voice uses the same classifier and retains only minimal provenance', () => {
  const result = extract('Souviens-toi que je préfère les plats épicés', 'voice');
  expect(result[0]).toMatchObject({ candidate: { evidence: { channel: 'voice', pattern: 'spiciness' } } });
  expect(JSON.stringify(result[0])).not.toContain('"quote"');
});
