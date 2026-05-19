/**
 * CategoryClassifier unit tests. Same canonical case list as the
 * frontend Inventory.tsx categorizer — keeps both sides in sync.
 */
import { classifyByName } from '../CategoryClassifier.js';

describe('classifyByName', () => {
  const cases: Array<[string, ReturnType<typeof classifyByName>]> = [
    // legumes (plurals, compounds)
    ['tomates cerises', 'legumes'],
    ['poivrons jaunes', 'legumes'],
    ['poivrons verts', 'legumes'],
    ['poivrons rouges', 'legumes'],
    ['échalotes', 'legumes'],
    ['oignons caramélisés', 'legumes'],
    ['cornichons', 'legumes'],
    ['pomme de terre', 'legumes'],
    ['pommes de terre', 'legumes'],
    ['concombre', 'legumes'],
    ['ail', 'legumes'],
    ['Tomates', 'legumes'],

    // compound hints win over shorter generic hints
    ['ail semoule', 'epices'],
    ['ail en poudre', 'epices'],
    ['Fleurs De Mais', 'feculents'],
    ['Fleurs de maïs', 'feculents'],
    ['mais', 'feculents'],

    // surgelés
    ['frites', 'surgeles'],

    // épicerie
    ['concentré de tomate', 'epicerie'],
    ['concentre de tomate', 'epicerie'],

    // épices
    ['curcuma', 'epices'],

    // viandes (compound poulet variants)
    ['aile de poulet', 'viandes'],
    ['cuisse de poulet', 'viandes'],
    ['escalope de poulet', 'viandes'],
    ['pilon de poulet', 'viandes'],

    // poissons
    ['maquereau', 'poissons'],

    // laitiers
    ['Œuf', 'laitiers'],

    // boulangerie
    ['Pain de mie grandes tranches Toastiligne complet', 'boulangerie'],
    ['Petits pains grillés au blé complet', 'boulangerie'],

    // boissons
    ['Boh Tea - Black, green and fruit', 'boissons'],
    ['Kashmiri Kahwa', 'boissons'],
    ['Detox brésilien', 'boissons'],

    // fruits
    ['Pomme', 'fruits'],
    ['Banane', 'fruits'],

    // no match
    ['Tofu fume', null],
    ['', null],
    ['   ', null],
  ];

  it.each(cases)('classifies "%s" → %s', (name, expected) => {
    expect(classifyByName(name)).toBe(expected);
  });

  it('returns null for null / undefined', () => {
    expect(classifyByName(null)).toBeNull();
    expect(classifyByName(undefined)).toBeNull();
  });
});
