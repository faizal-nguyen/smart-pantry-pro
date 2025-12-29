import type { z } from 'zod';

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'generic';

export interface IngredientOut {
  name: string;
  quantity: number;
  unit?: string;
}

export interface InstructionOut {
  step: number;
  instruction: string;
  description?: string;
}

export interface FormattedRecipe {
  title: string;
  description?: string;
  cookingTime: number;
  prepTime: number;
  servings: number;
  difficulty: string;
  category: string;
  ingredients: IngredientOut[];
  instructions: InstructionOut[];
  tags: string[];
  nutritionalInfo?: { calories: number; protein: number; carbs: number; fat: number };
  metadata?: Record<string, unknown>;
}

async function importLegacyParserModule() {
  // Try multiple relative paths to support different execution contexts
  // Primary (from src/services/* → project-root/api/*)
  const candidates = [
    '../../../../api/videoParserService.js',
    '../../../api/videoParserService.js',
  ];
  let lastErr: any;
  for (const path of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = await import(path as string);
      return mod as any;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  throw lastErr;
}

export async function parseVideoRecipe(
  videoUrl: string,
  platform?: Platform
): Promise<FormattedRecipe> {
  try {
    const mod = await importLegacyParserModule();
    const VideoParserService = (mod as any).default || (mod as any).VideoParserService || mod;
    const parser = new (VideoParserService as any)();

    // For now, we only rely on the Instagram reel path for parity with legacy usage
    const recipe = await parser.parseInstagramReel(videoUrl);

    const formatted: FormattedRecipe = {
      title: recipe.title,
      description: recipe.description,
      cookingTime: parseInt(recipe.metadata?.duration) || 30,
      prepTime: 15,
      servings: recipe.metadata?.servings || 4,
      difficulty: 'Moyen',
      category: 'Plat principal',
      ingredients: (recipe.ingredients || []).map((ing: any) => ({
        name: ing.name,
        quantity: parseFloat(ing.amount) || 1,
        unit: ing.unit,
      })),
      instructions: (recipe.instructions || []).map((inst: any) => ({
        step: inst.step,
        instruction: inst.description,
        description: inst.description,
      })),
      tags: ['instagram', 'vidéo', 'extrait', platform || 'auto'],
      nutritionalInfo: recipe.nutritionalInfo || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      metadata: { ...recipe.metadata, route: 'apps/api' },
    };

    return formatted;
  } catch (error: any) {
    // Fallback demo to maintain non-breaking behavior during consolidation
    return {
      title: 'Demo Recipe from Video',
      description: 'Fallback demo response (service unavailable).',
      cookingTime: 30,
      prepTime: 10,
      servings: 4,
      difficulty: 'Moyen',
      category: 'Plat principal',
      ingredients: [
        { name: 'Poulet', quantity: 500, unit: 'g' },
        { name: 'Sauce soja', quantity: 50, unit: 'ml' },
        { name: 'Miel', quantity: 20, unit: 'g' },
      ],
      instructions: [
        { step: 1, instruction: 'Préparer les ingrédients' },
        { step: 2, instruction: 'Saisir le poulet' },
        { step: 3, instruction: 'Ajouter la sauce et mijoter' },
      ],
      tags: ['demo', 'video', platform || 'auto'],
      metadata: { extractionMethod: 'apps/api-fallback', error: error?.message },
    };
  }
}

