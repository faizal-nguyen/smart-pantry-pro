import { normalizeIngredientName } from '@smart/shared';
import { requestConstraints, resolveExclusions } from '../RequestConstraints.js';

// Food names the engine would recognise (registry aliases or the user's recipe ingredients).
const FOODS = ['crème', 'crème fraîche', 'beurre', 'champignons', 'oignons', 'poulet', 'sel', 'huile d’olive', 'ingrédient'];
const known = (term: string) => FOODS.some(food => normalizeIngredientName(food) === normalizeIngredientName(term));
const excluded = (text: string) => resolveExclusions(requestConstraints(text).phrases, known);

describe('constraints of the current request (« sans crème »)', () => {
  it.each([
    ['Et sans crème ?', ['crème']],
    ['Un dîner avec du poulet sans crème ce soir', ['crème']],
    ['sans crème ni beurre', ['crème', 'beurre']],
    ['sans la crème, sans les champignons', ['crème', 'champignons']],
    ['Pas de crème stp', ['crème']],
    ['je ne veux pas de crème fraîche', ['crème fraîche']],
    ['et pas d’oignons', ['oignons']],
    ['évite les champignons', ['champignons']],
    ['Sans crème et avec du riz', ['crème']],
    ['sans crème ça serait mieux', ['crème']],
    ['sans crème dans le poulet', ['crème']],
    ['Un plat sans un peu de crème', ['crème']],
    ['sans crème, rapide', ['crème']],
    ['Je ne mange plus de crème', ['crème']],
    ['J’ai faim, pas de crème', ['crème']],
  ])('%s → %j', (text, ingredients) => {
    expect(excluded(text)).toEqual(ingredients);
  });

  it.each([
    'je n’ai pas de crème',
    'Je n’ai malheureusement pas de crème',
    'je ne trouve pas de crème',
    'il n’y a plus de crème',
    'je veux plus de crème',
    'une recette sans four',
    'sans trop de sel',
    'sans attendre',
    'Poulet sans os',
    'Je ne sais pas décider, un plat avec du poulet',
    'sans sel',
    'sans huile d’olive',
    'Propose-moi un dîner avec du poulet',
  ])('%s excludes no ingredient', text => {
    expect(excluded(text)).toEqual([]);
  });

  it('reads diets said for this meal only', () => {
    expect(requestConstraints('Un plat sans gluten ce soir').diets).toEqual(['gluten_free']);
    expect(requestConstraints('un plat végétarien').diets).toEqual(['vegetarian']);
    expect(requestConstraints('Et en vegan ?').diets).toEqual(['vegan']);
    expect(excluded('sans lactose ni crème')).toEqual(['crème']);
    expect(requestConstraints('sans lactose ni crème').diets).toEqual(['lactose_free']);
    expect(excluded('sans gluten')).toEqual([]);
  });

  it.each([
    'Je ne suis pas végétarien',
    'un dîner pas végétarien',
    'Mon fils est végétarien, mais moi je veux du poulet',
    'quelque chose sans viande',
  ])('%s sets no diet', text => {
    expect(requestConstraints(text).diets).toEqual([]);
    expect(excluded(text)).toEqual([]);
  });

  it('bounds what it keeps', () => {
    const many = Array.from({ length: 15 }, () => 'sans ingrédient').join(', ');
    expect(excluded(many)).toEqual(['ingrédient']);
    expect(resolveExclusions(Array.from({ length: 15 }, (_, i) => 'x' + i), () => true)).toHaveLength(10);
    expect(requestConstraints('sans ' + 'a'.repeat(90)).phrases).toEqual([]);
  });
});
