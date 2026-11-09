import { shortenList } from '../shortenList';

// iPhone 2026-11-09: a cook to confirm listed 22 missing ingredients in one line.
test('a long list keeps its first names and counts the others', () => {
  expect(shortenList('Pas dans ton stock, rien à retirer : huile neutre, graines de carvi, macis, cannelle, cardamome noire.'))
    .toBe('Pas dans ton stock, rien à retirer : huile neutre, graines de carvi, macis et 2 autres.');
});
test('a short list, one more name, or a sentence without a list stay as they are', () => {
  expect(shortenList('Je retire de ton stock : oignon 2 unités, Riz 1,5 kg.')).toBeNull();
  expect(shortenList('Hors stock : sel, poivre, huile, ail.')).toBeNull();
  expect(shortenList('Cette action modifie ton stock : vérifie-la avant de confirmer.')).toBeNull();
  expect(shortenList('Rien à retirer de ton stock.')).toBeNull();
});
