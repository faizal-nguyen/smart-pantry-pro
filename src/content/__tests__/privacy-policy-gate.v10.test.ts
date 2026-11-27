import privacyPolicy from '@/content/privacyPolicy';

/**
 * V11-06 E7: the policy is published only once every fact the repository cannot establish has been
 * given by the operator. This test stays red while a « [à compléter : …] » mark remains.
 */
test('the published policy has no fact left to complete', () => {
  // Accents and case removed first: « [À compléter », « [a completer » and « TODO » are caught too.
  const plain = privacyPolicy.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  expect(plain.match(/\[\s*a\s+completer[^\]]*\]|\bTODO\b/gi) ?? []).toEqual([]);
});
