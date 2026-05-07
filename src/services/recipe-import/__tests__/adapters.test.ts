import { ImportedRecipeDraftSchema, ImportedRecipeValidationError } from '@smart/shared';

import { socialImportToDraft } from '../adapters/socialImportAdapter';
import { instagramToDraft } from '../adapters/instagramAdapter';
import { manualToDraft } from '../adapters/manualRecipeAdapter';
import { ocrToDraft } from '../adapters/ocrRecipeAdapter';
import { voiceToDraft } from '../adapters/voiceRecipeAdapter';

describe('socialImportAdapter', () => {
  it('converts a typical SocialImportCard payload', () => {
    const draft = socialImportToDraft({
      title: 'Pates carbonara',
      description: 'Reel délicieux',
      ingredients: ['200 g pâtes', '2 œufs', '50 g pancetta', 'sel'],
      instructions: ['Faire bouillir l\'eau', 'Cuire les pâtes', 'Mélanger'],
      imageUrl: 'https://cdn.example.com/img.jpg',
      sourceUrl: 'https://www.instagram.com/reel/abc/',
      authorName: 'Chef',
      prepTime: '10 min',
      cookTime: '15 min',
      servings: 2,
    });

    expect(ImportedRecipeDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.title).toBe('Pates carbonara');
    expect(draft.ingredients).toHaveLength(4);
    expect(draft.ingredients[0]).toMatchObject({ name: 'pâtes', quantity: 200, unit: 'g' });
    expect(draft.instructions).toHaveLength(3);
    expect(draft.source.platform).toBe('instagram');
    expect(draft.source.canonicalUrl).toBe('https://instagram.com/reel/abc');
    expect(draft.prepTimeMinutes).toBe(10);
    expect(draft.cookTimeMinutes).toBe(15);
    expect(draft.servings).toBe(2);
    expect(draft.confidence).toBeGreaterThan(0.5);
  });

  it('falls back to placeholder title when missing', () => {
    const draft = socialImportToDraft({
      ingredients: ['1 banane'],
      instructions: ['Manger'],
      sourceUrl: 'https://example.com/recipe',
    });
    expect(draft.title).toBe('Recette importée');
    expect(draft.extractionWarnings).toContain('Titre manquant');
  });

  it('skips empty ingredient/instruction lines', () => {
    const draft = socialImportToDraft({
      title: 't',
      ingredients: ['', '  ', 'sel'],
      instructions: ['', 'Mélanger', '   '],
      sourceUrl: 'https://example.com',
    });
    expect(draft.ingredients).toHaveLength(1);
    expect(draft.instructions).toHaveLength(1);
  });
});

describe('instagramAdapter', () => {
  it('always tags the draft with `instagram`', () => {
    const draft = instagramToDraft({
      url: 'https://www.instagram.com/p/abc/',
      metadata: { title: 'Reel', authorName: 'Chef', thumbnailUrl: 'https://cdn/img.jpg' },
      extractedRecipe: {
        title: 'Cookies',
        ingredients: ['200 g farine'],
        instructions: ['Mélanger'],
      },
    });
    expect(draft.source.platform).toBe('instagram');
    expect(draft.tags).toContain('instagram');
  });

  it('uses metadata title when extractedRecipe lacks one', () => {
    const draft = instagramToDraft({
      url: 'https://www.instagram.com/p/abc/',
      metadata: { title: 'From metadata', thumbnailUrl: 'https://cdn/img.jpg' },
      extractedRecipe: { ingredients: ['1 oeuf'], instructions: ['Casser'] },
    });
    expect(draft.title).toBe('From metadata');
  });

  it('produces a parseable draft even with empty payload', () => {
    const draft = instagramToDraft({ url: 'https://www.instagram.com/p/x/' });
    expect(ImportedRecipeDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.title).toBe('Reel Instagram');
    expect(draft.extractionWarnings.length).toBeGreaterThan(0);
  });
});

describe('manualRecipeAdapter', () => {
  it('translates snake_case fields and "1.\\n" instructions', () => {
    const draft = manualToDraft({
      name: 'Tarte aux pommes',
      description: 'maison',
      prep_time: 30,
      cook_time: 45,
      servings: 6,
      difficulty: 3,
      cuisine_category: 'française',
      meal_type: 'dessert',
      image_url: 'https://cdn/tarte.jpg',
      ingredients: [
        { name: 'pommes', amount: '4', unit: 'pcs' },
        { name: 'farine', amount: '250', unit: 'g' },
        { name: 'beurre', amount: '125', unit: 'g', notes: 'froid', is_essential: true },
      ],
      instructions: '1. Eplucher les pommes\n2. Préparer la pâte\n3. Cuire 45 min',
      tags: ['classique'],
    });

    expect(draft.title).toBe('Tarte aux pommes');
    expect(draft.prepTimeMinutes).toBe(30);
    expect(draft.cookTimeMinutes).toBe(45);
    expect(draft.servings).toBe(6);
    expect(draft.difficulty).toBe(3);
    expect(draft.ingredients).toHaveLength(3);
    expect(draft.ingredients[2]).toMatchObject({ name: 'beurre', quantity: 125, unit: 'g', isEssential: true });
    expect(draft.instructions.map((i) => i.description)).toEqual([
      'Eplucher les pommes',
      'Préparer la pâte',
      'Cuire 45 min',
    ]);
    expect(draft.confidence).toBe(1);
    expect(draft.source.platform).toBe('manual');
    expect(draft.source.extractionMethod).toBe('manual_text');
  });

  it('handles fractional amounts', () => {
    const draft = manualToDraft({
      name: 't',
      ingredients: [{ name: 'sucre', amount: '1/2', unit: 'tasse' }],
      instructions: 'Mélanger',
    });
    expect(draft.ingredients[0].quantity).toBe(0.5);
  });

  it('throws on empty title', () => {
    expect(() =>
      manualToDraft({ name: '', ingredients: [{ name: 'x' }], instructions: 'a' })
    ).toThrow(ImportedRecipeValidationError);
  });

  it('splits blank-line-separated instructions when no numbering', () => {
    const draft = manualToDraft({
      name: 't',
      ingredients: [{ name: 'x' }],
      instructions: 'Step one\n\nStep two\n\nStep three',
    });
    expect(draft.instructions).toHaveLength(3);
  });
});

describe('ocrRecipeAdapter', () => {
  it('produces a draft with screenshot_ocr extractionMethod', () => {
    const draft = ocrToDraft({
      rawText: 'Bla bla recipe text',
      parsedTitle: 'Cookies',
      parsedIngredients: ['200 g farine', '100 g sucre'],
      parsedInstructions: ['Mélanger', 'Cuire'],
      imageUrl: 'https://cdn/screenshot.jpg',
    });
    expect(draft.source.extractionMethod).toBe('screenshot_ocr');
    expect(draft.tags).toContain('ocr');
    expect(draft.imageUrl).toBe('https://cdn/screenshot.jpg');
    expect(draft.confidence).toBeLessThanOrEqual(0.85);
  });

  it('caps confidence and emits warnings on poor parse', () => {
    const draft = ocrToDraft({
      rawText: 'not really a recipe',
      parsedIngredients: [],
      parsedInstructions: [],
    });
    expect(draft.extractionWarnings.length).toBeGreaterThan(0);
    expect(draft.confidence).toBeLessThan(0.5);
  });
});

describe('voiceRecipeAdapter', () => {
  it('produces a draft with voice_dictation extractionMethod', () => {
    const draft = voiceToDraft({
      transcript: 'pour faire des pancakes...',
      parsedTitle: 'Pancakes',
      parsedIngredients: ['200 g farine', '2 oeufs'],
      parsedInstructions: ['Mélanger', 'Cuire'],
    });
    expect(draft.source.extractionMethod).toBe('voice_dictation');
    expect(draft.tags).toContain('voice');
    expect(draft.confidence).toBeLessThanOrEqual(0.85);
  });

  it('still produces a parseable draft on empty parse', () => {
    const draft = voiceToDraft({ transcript: '' });
    expect(ImportedRecipeDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.title).toBe('Recette vocale');
  });
});
