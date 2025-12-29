import { seasonalityEngine } from '../SeasonalityEngine';
import { SeasonalContext } from '../types';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: new Error('Mock error')
        }))
      }))
    }))
  }
}));

describe('SeasonalityEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache
    (seasonalityEngine as any).recipesCache.clear();
  });

  describe('getSeasonalContext', () => {
    it('should return complete seasonal context for current month', async () => {
      const testDate = new Date('2024-07-15'); // July - Summer
      const result = await seasonalityEngine.getSeasonalContext(testDate, 4);

      expect(result).toBeDefined();
      expect(result.currentSeason).toBe('summer');
      expect(result.month).toBe(7);
      expect(result.inSeasonProducts).toBeDefined();
      expect(result.inSeasonProducts.length).toBeGreaterThan(0);
    });

    it('should identify in-season products correctly', async () => {
      const julyDate = new Date('2024-07-15');
      const result = await seasonalityEngine.getSeasonalContext(julyDate);

      // Tomates et courgettes sont en saison en juillet
      const tomato = result.inSeasonProducts.find(p => p.id === 'tomato');
      const zucchini = result.inSeasonProducts.find(p => p.id === 'zucchini');

      expect(tomato).toBeDefined();
      expect(zucchini).toBeDefined();
      expect(tomato?.score).toBeGreaterThan(80);
    });

    it('should identify products ending soon', async () => {
      const augustDate = new Date('2024-08-31'); // Fin août
      const result = await seasonalityEngine.getSeasonalContext(augustDate);

      expect(result.endingProducts).toBeDefined();
      // Les produits d'été devraient être en fin de saison
      const endingSummer = result.endingProducts.filter(p => 
        ['tomato', 'zucchini', 'peach'].includes(p.id)
      );
      expect(endingSummer.length).toBeGreaterThan(0);
    });

    it('should identify upcoming products', async () => {
      const augustDate = new Date('2024-08-31');
      const result = await seasonalityEngine.getSeasonalContext(augustDate);

      expect(result.upcomingProducts).toBeDefined();
      // Les pommes arrivent en septembre
      const upcomingApple = result.upcomingProducts.find(p => p.id === 'apple');
      expect(upcomingApple).toBeDefined();
    });

    it('should generate appropriate seasonal recommendations', async () => {
      const summerDate = new Date('2024-07-15');
      const result = await seasonalityEngine.getSeasonalContext(summerDate, 4);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);

      const spotlightRec = result.recommendations.find(r => 
        r.type === 'ingredient_spotlight'
      );
      expect(spotlightRec).toBeDefined();
    });
  });

  describe('Season detection', () => {
    it('should correctly identify seasons', async () => {
      const testCases = [
        { month: 3, expected: 'spring' },
        { month: 4, expected: 'spring' },
        { month: 5, expected: 'spring' },
        { month: 6, expected: 'summer' },
        { month: 7, expected: 'summer' },
        { month: 8, expected: 'summer' },
        { month: 9, expected: 'autumn' },
        { month: 10, expected: 'autumn' },
        { month: 11, expected: 'autumn' },
        { month: 12, expected: 'winter' },
        { month: 1, expected: 'winter' },
        { month: 2, expected: 'winter' }
      ];

      for (const { month, expected } of testCases) {
        const date = new Date(2024, month - 1, 15);
        const result = await seasonalityEngine.getSeasonalContext(date);
        expect(result.currentSeason).toBe(expected);
      }
    });
  });

  describe('Seasonal scoring', () => {
    it('should calculate high scores for peak season products', async () => {
      const julyDate = new Date('2024-07-15');
      const result = await seasonalityEngine.getSeasonalContext(julyDate);

      const tomato = result.inSeasonProducts.find(p => p.id === 'tomato');
      expect(tomato?.score).toBeGreaterThanOrEqual(90);
    });

    it('should give bonus points for local products', async () => {
      const date = new Date('2024-07-15');
      const result = await seasonalityEngine.getSeasonalContext(date);

      const localProducts = result.inSeasonProducts.filter(p => p.origin === 'local');
      const importedProducts = result.inSeasonProducts.filter(p => p.origin === 'imported');

      if (localProducts.length > 0 && importedProducts.length > 0) {
        const avgLocalScore = localProducts.reduce((sum, p) => sum + (p.score || 0), 0) / localProducts.length;
        const avgImportedScore = importedProducts.reduce((sum, p) => sum + (p.score || 0), 0) / importedProducts.length;
        
        expect(avgLocalScore).toBeGreaterThan(avgImportedScore);
      }
    });
  });

  describe('Utility methods', () => {
    it('should correctly check if ingredient is in season', () => {
      const isInSeason = seasonalityEngine.isInSeason('tomate', 7); // July
      expect(isInSeason).toBe(true);

      const notInSeason = seasonalityEngine.isInSeason('tomate', 1); // January
      expect(notInSeason).toBe(false);
    });

    it('should return best months for an ingredient', () => {
      const tomatoBestMonths = seasonalityEngine.getBestMonthsFor('tomate');
      expect(tomatoBestMonths).toEqual([6, 7, 8, 9]);

      const appleBestMonths = seasonalityEngine.getBestMonthsFor('pomme');
      expect(appleBestMonths).toEqual([9, 10, 11]);
    });

    it('should handle unknown ingredients gracefully', () => {
      const unknownInSeason = seasonalityEngine.isInSeason('ingredient_inexistant');
      expect(unknownInSeason).toBe(false);

      const unknownBestMonths = seasonalityEngine.getBestMonthsFor('ingredient_inexistant');
      expect(unknownBestMonths).toEqual([]);
    });
  });

  describe('Recipe recommendations', () => {
    it('should suggest seasonal themes based on season', async () => {
      const winterDate = new Date('2024-01-15');
      const winterContext = await seasonalityEngine.getSeasonalContext(winterDate);

      const themeRec = winterContext.recommendations.find(r => 
        r.type === 'seasonal_theme'
      );
      expect(themeRec).toBeDefined();
      expect(themeRec?.title).toContain('hivernal');
      expect(themeRec?.recipes).toContain('Pot-au-feu');
    });

    it('should recommend batch cooking for large families', async () => {
      const date = new Date('2024-07-15');
      const largeFamily = 5;
      const result = await seasonalityEngine.getSeasonalContext(date, largeFamily);

      const batchRec = result.recommendations.find(r => 
        r.title.includes('Batch cooking')
      );
      expect(batchRec).toBeDefined();
    });
  });
});