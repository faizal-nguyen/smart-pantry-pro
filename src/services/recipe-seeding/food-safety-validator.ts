// Service de validation sécurité alimentaire obligatoire
// 100% des recettes doivent être validées avant import

import { supabase } from '@/integrations/supabase/client';
import { TranslatedRecipe } from './translation-service';

export interface ValidatedRecipe extends TranslatedRecipe {
  allergen_info: {
    contains: string[];
    may_contain: string[];
    warnings_fr: string[];
  };
  dietary_tags: string[];
  safety_validated: boolean;
  safety_score: number;
  safety_validator_notes: string;
}

export interface ValidationResult {
  recipe: ValidatedRecipe;
  passed: boolean;
  issues: string[];
}

export class FoodSafetyValidator {
  // Allergènes majeurs à vérifier obligatoirement
  private readonly MAJOR_ALLERGENS = {
    'peanuts': {
      keywords: ['peanut', 'groundnut', 'arachide'],
      severity: 5,
      warningFr: 'Contient des arachides - Allergène majeur'
    },
    'dairy': {
      keywords: ['milk', 'dairy', 'ghee', 'paneer', 'yogurt', 'curd', 'butter', 'cream'],
      severity: 4,
      warningFr: 'Contient des produits laitiers'
    },
    'gluten': {
      keywords: ['wheat', 'flour', 'atta', 'maida', 'chapati', 'naan', 'roti'],
      severity: 4,
      warningFr: 'Contient du gluten'
    },
    'eggs': {
      keywords: ['egg', 'eggs'],
      severity: 3,
      warningFr: 'Contient des œufs'
    },
    'nuts': {
      keywords: ['cashew', 'almond', 'pistachio', 'walnut', 'kaju', 'badam'],
      severity: 4,
      warningFr: 'Contient des fruits à coque'
    },
    'sesame': {
      keywords: ['sesame', 'til', 'gingelly'],
      severity: 3,
      warningFr: 'Contient du sésame'
    },
    'shellfish': {
      keywords: ['shrimp', 'prawn', 'crab', 'lobster'],
      severity: 5,
      warningFr: 'Contient des crustacés - Allergène majeur'
    },
    'soy': {
      keywords: ['soy', 'soya', 'tofu'],
      severity: 3,
      warningFr: 'Contient du soja'
    }
  };

  // Tags diététiques à identifier
  private readonly DIETARY_PATTERNS = {
    'vegetarian': {
      exclude: ['meat', 'chicken', 'fish', 'mutton', 'lamb', 'beef', 'pork'],
      include: []
    },
    'vegan': {
      exclude: ['meat', 'chicken', 'fish', 'egg', 'dairy', 'milk', 'ghee', 'paneer', 'honey'],
      include: []
    },
    'gluten-free': {
      exclude: ['wheat', 'flour', 'atta', 'maida'],
      include: []
    },
    'dairy-free': {
      exclude: ['milk', 'dairy', 'ghee', 'paneer', 'yogurt', 'curd', 'butter', 'cream'],
      include: []
    },
    'nut-free': {
      exclude: ['cashew', 'almond', 'pistachio', 'walnut', 'nut'],
      include: []
    }
  };

  // Valider un batch de recettes
  async validateRecipesBatch(recipes: TranslatedRecipe[]): Promise<ValidationResult[]> {
    console.log(`🔒 Validating food safety for ${recipes.length} recipes...`);
    
    const validationResults: ValidationResult[] = [];
    
    for (const recipe of recipes) {
      const result = await this.validateSingleRecipe(recipe);
      validationResults.push(result);
      
      // Log les problèmes critiques
      if (!result.passed) {
        console.warn(`⚠️ Recipe "${recipe.translated_title}" failed validation:`, result.issues);
      }
    }
    
    // Statistiques de validation
    const passedCount = validationResults.filter(r => r.passed).length;
    const passRate = (passedCount / recipes.length) * 100;
    
    console.log(`✅ Validation complete: ${passedCount}/${recipes.length} passed (${passRate.toFixed(1)}%)`);
    
    return validationResults;
  }

  // Valider une recette individuelle
  private async validateSingleRecipe(recipe: TranslatedRecipe): Promise<ValidationResult> {
    const issues: string[] = [];
    
    // 1. Détection des allergènes
    const allergenInfo = this.detectAllergens(recipe);
    
    // 2. Analyse des tags diététiques
    const dietaryTags = this.analyzeDietaryTags(recipe);
    
    // 3. Validation des températures de cuisson
    const tempIssues = this.validateCookingTemperatures(recipe);
    issues.push(...tempIssues);
    
    // 4. Vérification des ingrédients crus
    const rawIngredientWarnings = this.checkRawIngredients(recipe);
    
    // 5. Calcul du score de sécurité
    const safetyScore = this.calculateSafetyScore(allergenInfo, issues);
    
    // 6. Génération des notes de validation
    const validatorNotes = this.generateValidatorNotes({
      allergenInfo,
      dietaryTags,
      issues,
      rawIngredientWarnings
    });
    
    // Construire la recette validée
    const validatedRecipe: ValidatedRecipe = {
      ...recipe,
      allergen_info: {
        contains: allergenInfo.detected,
        may_contain: allergenInfo.crossContamination,
        warnings_fr: [...allergenInfo.warnings, ...rawIngredientWarnings]
      },
      dietary_tags: dietaryTags,
      safety_validated: safetyScore >= 90,
      safety_score: safetyScore,
      safety_validator_notes: validatorNotes
    };
    
    return {
      recipe: validatedRecipe,
      passed: safetyScore >= 90,
      issues
    };
  }

  // Détecter tous les allergènes présents
  private detectAllergens(recipe: TranslatedRecipe): {
    detected: string[];
    crossContamination: string[];
    warnings: string[];
  } {
    const detected = new Set<string>();
    const warnings = new Set<string>();
    
    // Analyser tous les ingrédients
    const allIngredientText = recipe.ingredients
      .map(ing => `${ing.name} ${ing.name_fr}`.toLowerCase())
      .join(' ');
    
    // Détecter les allergènes directs
    Object.entries(this.MAJOR_ALLERGENS).forEach(([allergen, config]) => {
      const hasAllergen = config.keywords.some(keyword => 
        allIngredientText.includes(keyword.toLowerCase())
      );
      
      if (hasAllergen) {
        detected.add(allergen);
        warnings.add(config.warningFr);
      }
    });
    
    // Détecter les contaminations croisées possibles
    const crossContamination = this.detectCrossContamination(recipe);
    
    return {
      detected: Array.from(detected),
      crossContamination,
      warnings: Array.from(warnings)
    };
  }

  // Analyser les tags diététiques
  private analyzeDietaryTags(recipe: TranslatedRecipe): string[] {
    const tags: string[] = [];
    const ingredientText = recipe.ingredients
      .map(ing => ing.name.toLowerCase())
      .join(' ');
    
    Object.entries(this.DIETARY_PATTERNS).forEach(([tag, pattern]) => {
      const hasExcluded = pattern.exclude.some(item => 
        ingredientText.includes(item)
      );
      
      if (!hasExcluded) {
        tags.push(tag);
      }
    });
    
    // Tags spécifiques indiens
    if (recipe.spiceLevel <= 1) tags.push('mild');
    if (recipe.spiceLevel >= 4) tags.push('very-spicy');
    
    // Jain (pas d'oignon, ail, racines)
    const isJain = !ingredientText.includes('onion') && 
                   !ingredientText.includes('garlic') &&
                   !ingredientText.includes('potato');
    if (isJain) tags.push('jain-friendly');
    
    return tags;
  }

  // Valider les températures de cuisson
  private validateCookingTemperatures(recipe: TranslatedRecipe): string[] {
    const issues: string[] = [];
    const instructions = recipe.translated_instructions.join(' ').toLowerCase();
    
    // Patterns de température à risque
    const tempPatterns = [
      {
        pattern: /chauffer à (\d+)°?c/gi,
        validator: (temp: number) => {
          if (temp < 60) return 'Température trop basse pour éliminer les bactéries';
          if (temp > 250) return 'Température excessive pouvant créer des composés nocifs';
          return null;
        }
      },
      {
        pattern: /cuire pendant (\d+) secondes?/gi,
        validator: (seconds: number) => {
          if (seconds < 30) return 'Temps de cuisson insuffisant';
          return null;
        }
      }
    ];
    
    tempPatterns.forEach(({ pattern, validator }) => {
      let match;
      while ((match = pattern.exec(instructions)) !== null) {
        const value = parseInt(match[1]);
        const issue = validator(value);
        if (issue) issues.push(issue);
      }
    });
    
    return issues;
  }

  // Vérifier les ingrédients crus
  private checkRawIngredients(recipe: TranslatedRecipe): string[] {
    const warnings: string[] = [];
    
    recipe.translated_ingredients.forEach(ing => {
      const name = ing.name_fr.toLowerCase();
      
      // Ingrédients à risque s'ils sont crus
      const rawRisks = {
        'œuf': 'Les œufs crus peuvent contenir des salmonelles',
        'poulet': 'Le poulet doit être bien cuit (74°C minimum)',
        'poisson': 'Le poisson cru nécessite une qualité sashimi',
        'lait': 'Utiliser du lait pasteurisé uniquement'
      };
      
      Object.entries(rawRisks).forEach(([ingredient, warning]) => {
        if (name.includes(ingredient) && !this.isCooked(recipe, ing.name)) {
          warnings.push(`⚠️ ${warning}`);
        }
      });
    });
    
    return warnings;
  }

  // Vérifier si un ingrédient est cuit
  private isCooked(recipe: TranslatedRecipe, ingredientName: string): boolean {
    const instructions = recipe.translated_instructions.join(' ').toLowerCase();
    const cookingVerbs = ['cuire', 'faire revenir', 'griller', 'bouillir', 'frire', 'rôtir'];
    
    return cookingVerbs.some(verb => 
      instructions.includes(verb) && instructions.includes(ingredientName.toLowerCase())
    );
  }

  // Détecter les contaminations croisées possibles
  private detectCrossContamination(recipe: TranslatedRecipe): string[] {
    const crossContamination: string[] = [];
    
    // Si la recette contient des produits transformés
    const processedIngredients = recipe.ingredients.filter(ing => 
      ing.name.includes('sauce') || 
      ing.name.includes('paste') ||
      ing.name.includes('powder')
    );
    
    if (processedIngredients.length > 0) {
      crossContamination.push('processed-foods');
    }
    
    // Équipements partagés (friture)
    if (recipe.instructions.some(inst => inst.toLowerCase().includes('fry'))) {
      crossContamination.push('shared-fryer');
    }
    
    return crossContamination;
  }

  // Calculer le score de sécurité (0-100)
  private calculateSafetyScore(allergenInfo: any, issues: string[]): number {
    let score = 100;
    
    // Déductions pour allergènes non identifiés
    if (allergenInfo.detected.length === 0 && allergenInfo.warnings.length === 0) {
      score -= 10; // Suspicion si aucun allergène détecté
    }
    
    // Déductions pour problèmes
    score -= issues.length * 5;
    
    // Déductions pour allergènes majeurs sans avertissement clair
    const majorAllergens = ['peanuts', 'shellfish'];
    majorAllergens.forEach(allergen => {
      if (allergenInfo.detected.includes(allergen)) {
        score -= 5; // Pénalité supplémentaire pour allergènes graves
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  // Générer les notes de validation
  private generateValidatorNotes(data: any): string {
    const notes: string[] = [];
    
    // Résumé allergènes
    if (data.allergenInfo.detected.length > 0) {
      notes.push(`Allergènes détectés: ${data.allergenInfo.detected.join(', ')}`);
    }
    
    // Tags diététiques
    if (data.dietaryTags.length > 0) {
      notes.push(`Tags: ${data.dietaryTags.join(', ')}`);
    }
    
    // Problèmes identifiés
    if (data.issues.length > 0) {
      notes.push(`Issues: ${data.issues.join('; ')}`);
    }
    
    // Validation timestamp
    notes.push(`Validé le ${new Date().toLocaleDateString('fr-FR')}`);
    
    return notes.join(' | ');
  }
}