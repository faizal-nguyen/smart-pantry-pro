import { EnhancedVoiceService } from '../enhancedVoiceService';

describe('EnhancedVoiceService', () => {
  let service: EnhancedVoiceService;

  beforeEach(() => {
    service = new EnhancedVoiceService();
  });

  describe('parseVoiceInput', () => {
    it('should parse quantity with unit correctly', () => {
      const testCases = [
        {
          input: "ajoute 2 kg de tomates",
          expected: {
            quantity: 2,
            unit: 'kg',
            product: 'tomates',
            action: 'add',
            confidence: 0.9
          }
        },
        {
          input: "j'ai 500 grammes de farine",
          expected: {
            quantity: 500,
            unit: 'g',
            product: 'farine',
            action: 'add',
            confidence: 0.9
          }
        },
        {
          input: "met 1,5 litre de lait",
          expected: {
            quantity: 1.5,
            unit: 'L',
            product: 'lait',
            action: 'add',
            confidence: 0.9
          }
        },
        {
          input: "ajoute 3 boîtes de conserve",
          expected: {
            quantity: 3,
            unit: 'boîte(s)',
            product: 'conserve',
            action: 'add',
            confidence: 0.9
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.parseVoiceInput(input);
        expect(result).toEqual(expected);
      });
    });

    it('should parse simple quantity correctly', () => {
      const testCases = [
        {
          input: "ajoute 5 pommes",
          expected: {
            quantity: 5,
            unit: 'unité(s)',
            product: 'pommes',
            action: 'add',
            confidence: 0.8
          }
        },
        {
          input: "j'ai 2 baguettes",
          expected: {
            quantity: 2,
            unit: 'unité(s)',
            product: 'baguettes',
            action: 'add',
            confidence: 0.8
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.parseVoiceInput(input);
        expect(result).toEqual(expected);
      });
    });

    it('should parse product only correctly', () => {
      const testCases = [
        {
          input: "ajoute du pain",
          expected: {
            quantity: 1,
            unit: 'unité(s)',
            product: 'pain',
            action: 'add',
            confidence: 0.7
          }
        },
        {
          input: "met des oeufs",
          expected: {
            quantity: 1,
            unit: 'unité(s)',
            product: 'oeufs',
            action: 'add',
            confidence: 0.7
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.parseVoiceInput(input);
        expect(result).toEqual(expected);
      });
    });

    it('should parse remove actions correctly', () => {
      const testCases = [
        {
          input: "enlève le lait",
          expected: {
            product: 'le lait',
            action: 'remove',
            confidence: 0.8
          }
        },
        {
          input: "supprime les tomates",
          expected: {
            product: 'les tomates',
            action: 'remove',
            confidence: 0.8
          }
        },
        {
          input: "fini le pain",
          expected: {
            product: 'le pain',
            action: 'remove',
            confidence: 0.8
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.parseVoiceInput(input);
        expect(result).toEqual(expected);
      });
    });

    it('should parse search actions correctly', () => {
      const testCases = [
        {
          input: "recette avec poulet",
          expected: {
            product: 'poulet',
            action: 'search',
            confidence: 0.8
          }
        },
        {
          input: "que puis-je faire avec des pâtes",
          expected: {
            product: 'faire avec des pâtes',
            action: 'search',
            confidence: 0.8
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.parseVoiceInput(input);
        expect(result).toEqual(expected);
      });
    });

    it('should handle edge cases gracefully', () => {
      const testCases = [
        {
          input: "bonjour",
          expected: {
            product: 'bonjour',
            action: 'add',
            confidence: 0.3
          }
        },
        {
          input: "",
          expected: {
            product: '',
            action: 'add',
            confidence: 0.3
          }
        },
        {
          input: "123",
          expected: {
            product: '123',
            action: 'add',
            confidence: 0.3
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.parseVoiceInput(input);
        expect(result).toEqual(expected);
      });
    });

    it('should handle French number formats', () => {
      const testCases = [
        {
          input: "ajoute 2,5 kg de pommes de terre",
          expected: {
            quantity: 2.5,
            unit: 'kg',
            product: 'pommes de terre',
            action: 'add',
            confidence: 0.9
          }
        },
        {
          input: "j'ai 0,750 litre d'huile",
          expected: {
            quantity: 0.75,
            unit: 'L',
            product: "huile",
            action: 'add',
            confidence: 0.9
          }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.parseVoiceInput(input);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('unitMapping', () => {
    it('should normalize units correctly', () => {
      const service = new EnhancedVoiceService();
      const input = "ajoute 2 kilos de pommes";
      const result = service.parseVoiceInput(input);
      
      expect(result.unit).toBe('kg');
    });

    it('should handle plural forms', () => {
      const pluralTests = [
        { input: "ajoute 2 grammes de sel", expectedUnit: 'g' },
        { input: "ajoute 3 litres d'eau", expectedUnit: 'L' },
        { input: "ajoute 5 boîtes de tomates", expectedUnit: 'boîte(s)' }
      ];

      pluralTests.forEach(({ input, expectedUnit }) => {
        const result = service.parseVoiceInput(input);
        expect(result.unit).toBe(expectedUnit);
      });
    });
  });
});