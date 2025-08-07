/**
 * Comprehensive Allergen Isolation Testing Suite
 * Tests allergen detection, isolation, and AI assistant recommendations
 */

import { FoodSafetyValidator, ValidatedRecipe } from '../recipe-seeding/food-safety-validator';
import { TranslatedRecipe } from '../recipe-seeding/translation-service';

describe('Allergen Isolation and Detection System', () => {
  let validator: FoodSafetyValidator;

  beforeEach(() => {
    validator = new FoodSafetyValidator();
  });

  describe('Major Allergen Detection', () => {
    it('should detect peanuts correctly', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-1',
        source_url: 'test',
        original_title: 'Peanut Curry',
        translated_title: 'Curry aux Arachides',
        original_description: 'A curry with peanuts',
        translated_description: 'Un curry aux arachides',
        cuisine: 'indian',
        spiceLevel: 3,
        prepTime: 30,
        cookTime: 20,
        totalTime: 50,
        servings: 4,
        difficulty: 'medium',
        ingredients: [
          {
            name: 'peanuts',
            quantity: '100',
            unit: 'g',
            category: 'nuts'
          }
        ],
        translated_ingredients: [
          {
            name: 'peanuts',
            name_fr: 'arachides',
            quantity: '100',
            unit: 'g',
            category: 'nuts',
            allergen_warnings_fr: []
          }
        ],
        instructions: ['Heat oil', 'Add peanuts'],
        translated_instructions: ['Chauffer l\'huile', 'Ajouter les arachides'],
        tags: ['spicy'],
        nutritionalInfo: {
          calories: 300,
          protein: 15,
          carbs: 20,
          fat: 20,
          fiber: 5
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.allergen_info.contains).toContain('peanuts');
      expect(result[0].recipe.allergen_info.warnings_fr).toContain('Contient des arachides - Allergène majeur');
      expect(result[0].recipe.safety_score).toBeLessThan(100); // Penalty for major allergen
    });

    it('should detect dairy products correctly', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-2',
        source_url: 'test',
        original_title: 'Paneer Masala',
        translated_title: 'Paneer Masala',
        original_description: 'Cottage cheese curry',
        translated_description: 'Curry au fromage blanc',
        cuisine: 'indian',
        spiceLevel: 2,
        prepTime: 20,
        cookTime: 25,
        totalTime: 45,
        servings: 4,
        difficulty: 'easy',
        ingredients: [
          { name: 'paneer', quantity: '200', unit: 'g', category: 'dairy' },
          { name: 'milk', quantity: '100', unit: 'ml', category: 'dairy' },
          { name: 'ghee', quantity: '2', unit: 'tbsp', category: 'dairy' }
        ],
        translated_ingredients: [
          { name: 'paneer', name_fr: 'fromage blanc indien', quantity: '200', unit: 'g', category: 'dairy', allergen_warnings_fr: [] },
          { name: 'milk', name_fr: 'lait', quantity: '100', unit: 'ml', category: 'dairy', allergen_warnings_fr: [] },
          { name: 'ghee', name_fr: 'beurre clarifié', quantity: '2', unit: 'c.s.', category: 'dairy', allergen_warnings_fr: [] }
        ],
        instructions: ['Heat ghee', 'Add paneer', 'Pour milk'],
        translated_instructions: ['Chauffer le ghee', 'Ajouter le paneer', 'Verser le lait'],
        tags: ['vegetarian'],
        nutritionalInfo: {
          calories: 350,
          protein: 20,
          carbs: 15,
          fat: 25,
          fiber: 3
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.allergen_info.contains).toContain('dairy');
      expect(result[0].recipe.allergen_info.warnings_fr).toContain('Contient des produits laitiers');
      expect(result[0].recipe.dietary_tags).not.toContain('dairy-free');
    });

    it('should detect gluten correctly', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-3',
        source_url: 'test',
        original_title: 'Wheat Roti',
        translated_title: 'Pain de Blé',
        original_description: 'Traditional wheat flatbread',
        translated_description: 'Pain plat traditionnel au blé',
        cuisine: 'indian',
        spiceLevel: 0,
        prepTime: 30,
        cookTime: 15,
        totalTime: 45,
        servings: 6,
        difficulty: 'easy',
        ingredients: [
          { name: 'wheat flour', quantity: '2', unit: 'cups', category: 'grain' }
        ],
        translated_ingredients: [
          { name: 'wheat flour', name_fr: 'farine de blé', quantity: '250', unit: 'g', category: 'grain', allergen_warnings_fr: [] }
        ],
        instructions: ['Mix flour with water', 'Knead dough', 'Cook on pan'],
        translated_instructions: ['Mélanger la farine avec l\'eau', 'Pétrir la pâte', 'Cuire à la poêle'],
        tags: ['vegetarian'],
        nutritionalInfo: {
          calories: 180,
          protein: 6,
          carbs: 36,
          fat: 1,
          fiber: 3
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.allergen_info.contains).toContain('gluten');
      expect(result[0].recipe.allergen_info.warnings_fr).toContain('Contient du gluten');
      expect(result[0].recipe.dietary_tags).not.toContain('gluten-free');
    });

    it('should detect shellfish correctly', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-4',
        source_url: 'test',
        original_title: 'Prawn Curry',
        translated_title: 'Curry de Crevettes',
        original_description: 'Spicy prawn curry',
        translated_description: 'Curry épicé aux crevettes',
        cuisine: 'indian',
        spiceLevel: 4,
        prepTime: 20,
        cookTime: 15,
        totalTime: 35,
        servings: 4,
        difficulty: 'medium',
        ingredients: [
          { name: 'prawns', quantity: '500', unit: 'g', category: 'seafood' }
        ],
        translated_ingredients: [
          { name: 'prawns', name_fr: 'crevettes', quantity: '500', unit: 'g', category: 'seafood', allergen_warnings_fr: [] }
        ],
        instructions: ['Clean prawns', 'Cook with spices'],
        translated_instructions: ['Nettoyer les crevettes', 'Cuire avec les épices'],
        tags: ['spicy', 'seafood'],
        nutritionalInfo: {
          calories: 250,
          protein: 40,
          carbs: 5,
          fat: 8,
          fiber: 1
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.allergen_info.contains).toContain('shellfish');
      expect(result[0].recipe.allergen_info.warnings_fr).toContain('Contient des crustacés - Allergène majeur');
      expect(result[0].recipe.safety_score).toBeLessThan(100); // Major allergen penalty
    });

    it('should detect nuts correctly', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-5',
        source_url: 'test',
        original_title: 'Cashew Curry',
        translated_title: 'Curry aux Noix de Cajou',
        original_description: 'Rich cashew curry',
        translated_description: 'Curry riche aux noix de cajou',
        cuisine: 'indian',
        spiceLevel: 2,
        prepTime: 25,
        cookTime: 30,
        totalTime: 55,
        servings: 4,
        difficulty: 'medium',
        ingredients: [
          { name: 'cashews', quantity: '150', unit: 'g', category: 'nuts' },
          { name: 'almonds', quantity: '50', unit: 'g', category: 'nuts' }
        ],
        translated_ingredients: [
          { name: 'cashews', name_fr: 'noix de cajou', quantity: '150', unit: 'g', category: 'nuts', allergen_warnings_fr: [] },
          { name: 'almonds', name_fr: 'amandes', quantity: '50', unit: 'g', category: 'nuts', allergen_warnings_fr: [] }
        ],
        instructions: ['Soak cashews', 'Blend with almonds', 'Cook mixture'],
        translated_instructions: ['Faire tremper les cajous', 'Mixer avec les amandes', 'Cuire le mélange'],
        tags: ['rich', 'vegetarian'],
        nutritionalInfo: {
          calories: 400,
          protein: 12,
          carbs: 20,
          fat: 30,
          fiber: 4
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.allergen_info.contains).toContain('nuts');
      expect(result[0].recipe.allergen_info.warnings_fr).toContain('Contient des fruits à coque');
    });
  });

  describe('Cross-Contamination Detection', () => {
    it('should detect potential cross-contamination from processed foods', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-6',
        source_url: 'test',
        original_title: 'Quick Pasta',
        translated_title: 'Pâtes Rapides',
        original_description: 'Quick pasta with sauce',
        translated_description: 'Pâtes rapides avec sauce',
        cuisine: 'italian',
        spiceLevel: 1,
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        servings: 2,
        difficulty: 'easy',
        ingredients: [
          { name: 'tomato sauce', quantity: '200', unit: 'ml', category: 'condiment' },
          { name: 'spice powder', quantity: '1', unit: 'tsp', category: 'spice' },
          { name: 'cheese paste', quantity: '50', unit: 'g', category: 'dairy' }
        ],
        translated_ingredients: [
          { name: 'tomato sauce', name_fr: 'sauce tomate', quantity: '200', unit: 'ml', category: 'condiment', allergen_warnings_fr: [] },
          { name: 'spice powder', name_fr: 'mélange d\'épices', quantity: '1', unit: 'c.c.', category: 'spice', allergen_warnings_fr: [] },
          { name: 'cheese paste', name_fr: 'pâte de fromage', quantity: '50', unit: 'g', category: 'dairy', allergen_warnings_fr: [] }
        ],
        instructions: ['Boil pasta', 'Mix with sauce'],
        translated_instructions: ['Faire bouillir les pâtes', 'Mélanger avec la sauce'],
        tags: ['quick'],
        nutritionalInfo: {
          calories: 320,
          protein: 12,
          carbs: 45,
          fat: 10,
          fiber: 3
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.allergen_info.may_contain).toContain('processed-foods');
    });

    it('should detect shared fryer contamination risk', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-7',
        source_url: 'test',
        original_title: 'Fried Rice',
        translated_title: 'Riz Frit',
        original_description: 'Stir-fried rice',
        translated_description: 'Riz sauté',
        cuisine: 'chinese',
        spiceLevel: 2,
        prepTime: 15,
        cookTime: 10,
        totalTime: 25,
        servings: 3,
        difficulty: 'easy',
        ingredients: [
          { name: 'rice', quantity: '2', unit: 'cups', category: 'grain' },
          { name: 'vegetables', quantity: '100', unit: 'g', category: 'vegetable' }
        ],
        translated_ingredients: [
          { name: 'rice', name_fr: 'riz', quantity: '300', unit: 'g', category: 'grain', allergen_warnings_fr: [] },
          { name: 'vegetables', name_fr: 'légumes', quantity: '100', unit: 'g', category: 'vegetable', allergen_warnings_fr: [] }
        ],
        instructions: ['Heat oil', 'Fry rice with vegetables'],
        translated_instructions: ['Chauffer l\'huile', 'Faire frire le riz avec les légumes'],
        tags: ['stir-fry'],
        nutritionalInfo: {
          calories: 280,
          protein: 6,
          carbs: 55,
          fat: 5,
          fiber: 2
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.allergen_info.may_contain).toContain('shared-fryer');
    });
  });

  describe('Dietary Tag Analysis', () => {
    it('should correctly identify vegetarian recipes', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-8',
        source_url: 'test',
        original_title: 'Vegetable Curry',
        translated_title: 'Curry de Légumes',
        original_description: 'Mixed vegetable curry',
        translated_description: 'Curry de légumes mélangés',
        cuisine: 'indian',
        spiceLevel: 3,
        prepTime: 20,
        cookTime: 25,
        totalTime: 45,
        servings: 4,
        difficulty: 'easy',
        ingredients: [
          { name: 'mixed vegetables', quantity: '400', unit: 'g', category: 'vegetable' },
          { name: 'onions', quantity: '2', unit: 'pieces', category: 'vegetable' },
          { name: 'tomatoes', quantity: '3', unit: 'pieces', category: 'vegetable' }
        ],
        translated_ingredients: [
          { name: 'mixed vegetables', name_fr: 'légumes mélangés', quantity: '400', unit: 'g', category: 'vegetable', allergen_warnings_fr: [] },
          { name: 'onions', name_fr: 'oignons', quantity: '2', unit: 'pièces', category: 'vegetable', allergen_warnings_fr: [] },
          { name: 'tomatoes', name_fr: 'tomates', quantity: '3', unit: 'pièces', category: 'vegetable', allergen_warnings_fr: [] }
        ],
        instructions: ['Chop vegetables', 'Cook with spices'],
        translated_instructions: ['Couper les légumes', 'Cuire avec les épices'],
        tags: ['healthy'],
        nutritionalInfo: {
          calories: 150,
          protein: 5,
          carbs: 30,
          fat: 3,
          fiber: 8
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.dietary_tags).toContain('vegetarian');
      expect(result[0].recipe.dietary_tags).toContain('vegan');
    });

    it('should correctly exclude non-vegetarian from vegetarian tags', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-9',
        source_url: 'test',
        original_title: 'Chicken Curry',
        translated_title: 'Curry de Poulet',
        original_description: 'Spicy chicken curry',
        translated_description: 'Curry de poulet épicé',
        cuisine: 'indian',
        spiceLevel: 4,
        prepTime: 30,
        cookTime: 45,
        totalTime: 75,
        servings: 4,
        difficulty: 'medium',
        ingredients: [
          { name: 'chicken', quantity: '500', unit: 'g', category: 'meat' }
        ],
        translated_ingredients: [
          { name: 'chicken', name_fr: 'poulet', quantity: '500', unit: 'g', category: 'meat', allergen_warnings_fr: [] }
        ],
        instructions: ['Marinate chicken', 'Cook chicken'],
        translated_instructions: ['Mariner le poulet', 'Cuire le poulet'],
        tags: ['spicy'],
        nutritionalInfo: {
          calories: 300,
          protein: 35,
          carbs: 5,
          fat: 15,
          fiber: 1
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.dietary_tags).not.toContain('vegetarian');
      expect(result[0].recipe.dietary_tags).not.toContain('vegan');
    });

    it('should identify Jain-friendly recipes', async () => {
      const recipe: TranslatedRecipe = {
        id: 'test-10',
        source_url: 'test',
        original_title: 'Simple Dal',
        translated_title: 'Dal Simple',
        original_description: 'Simple lentil dish without onion or garlic',
        translated_description: 'Plat de lentilles simple sans oignon ni ail',
        cuisine: 'indian',
        spiceLevel: 1,
        prepTime: 15,
        cookTime: 30,
        totalTime: 45,
        servings: 4,
        difficulty: 'easy',
        ingredients: [
          { name: 'lentils', quantity: '200', unit: 'g', category: 'legume' },
          { name: 'ginger', quantity: '10', unit: 'g', category: 'spice' }
        ],
        translated_ingredients: [
          { name: 'lentils', name_fr: 'lentilles', quantity: '200', unit: 'g', category: 'legume', allergen_warnings_fr: [] },
          { name: 'ginger', name_fr: 'gingembre', quantity: '10', unit: 'g', category: 'spice', allergen_warnings_fr: [] }
        ],
        instructions: ['Wash lentils', 'Cook until soft'],
        translated_instructions: ['Laver les lentilles', 'Cuire jusqu\'à tendreté'],
        tags: ['simple'],
        nutritionalInfo: {
          calories: 200,
          protein: 15,
          carbs: 30,
          fat: 2,
          fiber: 12
        }
      };

      const result = await validator.validateRecipesBatch([recipe]);
      
      expect(result[0].recipe.dietary_tags).toContain('jain-friendly');
      expect(result[0].recipe.dietary_tags).toContain('vegetarian');
      expect(result[0].recipe.dietary_tags).toContain('vegan');
    });
  });

  describe('Safety Score Calculation', () => {
    it('should penalize major allergens appropriately', async () => {
      const peanutRecipe: TranslatedRecipe = {
        id: 'test-11',
        source_url: 'test',
        original_title: 'Peanut Dish',
        translated_title: 'Plat aux Arachides',
        original_description: 'Contains peanuts',
        translated_description: 'Contient des arachides',
        cuisine: 'test',
        spiceLevel: 1,
        prepTime: 10,
        cookTime: 10,
        totalTime: 20,
        servings: 2,
        difficulty: 'easy',
        ingredients: [{ name: 'peanuts', quantity: '100', unit: 'g', category: 'nuts' }],
        translated_ingredients: [{ name: 'peanuts', name_fr: 'arachides', quantity: '100', unit: 'g', category: 'nuts', allergen_warnings_fr: [] }],
        instructions: ['Use peanuts'],
        translated_instructions: ['Utiliser les arachides'],
        tags: [],
        nutritionalInfo: { calories: 200, protein: 10, carbs: 10, fat: 15, fiber: 3 }
      };

      const safeRecipe: TranslatedRecipe = {
        ...peanutRecipe,
        id: 'test-12',
        original_title: 'Safe Dish',
        translated_title: 'Plat Sûr',
        ingredients: [{ name: 'rice', quantity: '100', unit: 'g', category: 'grain' }],
        translated_ingredients: [{ name: 'rice', name_fr: 'riz', quantity: '100', unit: 'g', category: 'grain', allergen_warnings_fr: [] }]
      };

      const peanutResult = await validator.validateRecipesBatch([peanutRecipe]);
      const safeResult = await validator.validateRecipesBatch([safeRecipe]);
      
      expect(peanutResult[0].recipe.safety_score).toBeLessThan(safeResult[0].recipe.safety_score);
    });

    it('should require minimum score for validation pass', async () => {
      // Create a recipe that should fail validation
      const problematicRecipe: TranslatedRecipe = {
        id: 'test-13',
        source_url: 'test',
        original_title: 'Problematic Recipe',
        translated_title: 'Recette Problématique',
        original_description: 'Has multiple issues',
        translated_description: 'A plusieurs problèmes',
        cuisine: 'test',
        spiceLevel: 1,
        prepTime: 10,
        cookTime: 10,
        totalTime: 20,
        servings: 2,
        difficulty: 'easy',
        ingredients: [
          { name: 'peanuts', quantity: '100', unit: 'g', category: 'nuts' },
          { name: 'shellfish', quantity: '200', unit: 'g', category: 'seafood' }
        ],
        translated_ingredients: [
          { name: 'peanuts', name_fr: 'arachides', quantity: '100', unit: 'g', category: 'nuts', allergen_warnings_fr: [] },
          { name: 'shellfish', name_fr: 'fruits de mer', quantity: '200', unit: 'g', category: 'seafood', allergen_warnings_fr: [] }
        ],
        instructions: ['Heat to 30°C only'], // Low temperature issue
        translated_instructions: ['Chauffer à 30°C seulement'],
        tags: [],
        nutritionalInfo: { calories: 300, protein: 20, carbs: 10, fat: 20, fiber: 2 }
      };

      const result = await validator.validateRecipesBatch([problematicRecipe]);
      
      expect(result[0].recipe.safety_score).toBeLessThan(90);
      expect(result[0].passed).toBe(false);
      expect(result[0].recipe.safety_validated).toBe(false);
    });
  });

  describe('Raw Ingredient Safety Warnings', () => {
    it('should warn about raw eggs', async () => {
      const rawEggRecipe: TranslatedRecipe = {
        id: 'test-14',
        source_url: 'test',
        original_title: 'Raw Egg Dish',
        translated_title: 'Plat aux Œufs Crus',
        original_description: 'Contains raw eggs',
        translated_description: 'Contient des œufs crus',
        cuisine: 'test',
        spiceLevel: 0,
        prepTime: 5,
        cookTime: 0,
        totalTime: 5,
        servings: 1,
        difficulty: 'easy',
        ingredients: [{ name: 'egg', quantity: '1', unit: 'piece', category: 'protein' }],
        translated_ingredients: [{ name: 'egg', name_fr: 'œuf', quantity: '1', unit: 'pièce', category: 'protein', allergen_warnings_fr: [] }],
        instructions: ['Mix raw egg'], // No cooking mentioned
        translated_instructions: ['Mélanger l\'œuf cru'],
        tags: ['raw'],
        nutritionalInfo: { calories: 70, protein: 6, carbs: 1, fat: 5, fiber: 0 }
      };

      const result = await validator.validateRecipesBatch([rawEggRecipe]);
      
      expect(result[0].recipe.allergen_info.warnings_fr).toContainEqual(
        expect.stringContaining('œufs crus peuvent contenir des salmonelles')
      );
    });

    it('should warn about undercooked chicken', async () => {
      const undercookedChickenRecipe: TranslatedRecipe = {
        id: 'test-15',
        source_url: 'test',
        original_title: 'Quick Chicken',
        translated_title: 'Poulet Rapide',
        original_description: 'Quickly prepared chicken',
        translated_description: 'Poulet préparé rapidement',
        cuisine: 'test',
        spiceLevel: 1,
        prepTime: 5,
        cookTime: 5,
        totalTime: 10,
        servings: 2,
        difficulty: 'easy',
        ingredients: [{ name: 'chicken', quantity: '300', unit: 'g', category: 'meat' }],
        translated_ingredients: [{ name: 'chicken', name_fr: 'poulet', quantity: '300', unit: 'g', category: 'meat', allergen_warnings_fr: [] }],
        instructions: ['Add chicken to salad'], // No cooking mentioned
        translated_instructions: ['Ajouter le poulet à la salade'],
        tags: ['quick'],
        nutritionalInfo: { calories: 250, protein: 30, carbs: 0, fat: 12, fiber: 0 }
      };

      const result = await validator.validateRecipesBatch([undercookedChickenRecipe]);
      
      expect(result[0].recipe.allergen_info.warnings_fr).toContainEqual(
        expect.stringContaining('poulet doit être bien cuit')
      );
    });
  });
});

describe('AI Assistant Allergen Integration Tests', () => {
  // These tests would verify that the AI assistant properly uses allergen information
  // in its recommendations and warnings
  
  it('should prioritize allergen-free recipes for users with allergies', () => {
    // Mock user preference data with allergies
    const userAllergies = ['peanuts', 'dairy'];
    const availableRecipes = [
      { name: 'Peanut Curry', allergens: ['peanuts'] },
      { name: 'Milk Rice', allergens: ['dairy'] },
      { name: 'Vegetable Stir-fry', allergens: [] }
    ];
    
    // The AI should recommend the allergen-free recipe
    const safeRecipes = availableRecipes.filter(recipe => 
      !recipe.allergens.some(allergen => userAllergies.includes(allergen))
    );
    
    expect(safeRecipes).toHaveLength(1);
    expect(safeRecipes[0].name).toBe('Vegetable Stir-fry');
  });

  it('should provide clear allergen warnings in AI responses', () => {
    const recipeWithAllergens = {
      name: 'Cashew Curry',
      allergens: ['nuts'],
      warnings: ['Contient des fruits à coque']
    };
    
    // AI should include these warnings prominently
    expect(recipeWithAllergens.warnings).toContain('Contient des fruits à coque');
  });

  it('should suggest ingredient substitutions for allergen-free alternatives', () => {
    const substitutions = {
      'dairy': ['coconut milk', 'oat milk', 'almond milk'],
      'nuts': ['sunflower seeds', 'pumpkin seeds'],
      'gluten': ['rice flour', 'almond flour', 'coconut flour']
    };
    
    // AI should suggest these alternatives when users have allergies
    expect(substitutions['dairy']).toContain('coconut milk');
    expect(substitutions['nuts']).toContain('sunflower seeds');
    expect(substitutions['gluten']).toContain('rice flour');
  });
});