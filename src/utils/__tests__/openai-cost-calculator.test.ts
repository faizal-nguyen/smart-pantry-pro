/**
 * OpenAI API Cost Analysis and Calculation Tests
 * Validates cost estimates and token usage optimization
 */

// OpenAI Pricing (as of 2024)
const OPENAI_PRICING = {
  'gpt-4': {
    input: 0.03 / 1000,    // $0.03 per 1K input tokens
    output: 0.06 / 1000    // $0.06 per 1K output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.0015 / 1000,  // $0.0015 per 1K input tokens
    output: 0.002 / 1000   // $0.002 per 1K output tokens
  }
};

// USD to EUR conversion (approximate)
const USD_TO_EUR = 0.85;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface CostAnalysis {
  model: string;
  tokenUsage: TokenUsage;
  costUSD: number;
  costEUR: number;
  isWithinBudget: boolean;
  budgetLimitEUR: number;
}

class OpenAICostCalculator {
  private budgetLimitEUR = 0.05; // 5 cents per request

  calculateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English/French
    return Math.ceil(text.length / 4);
  }

  estimateContextTokens(context: any): number {
    const contextString = JSON.stringify(context);
    return this.calculateTokens(contextString);
  }

  calculateCost(model: string, inputTokens: number, outputTokens: number): CostAnalysis {
    const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING];
    if (!pricing) {
      throw new Error(`Unknown model: ${model}`);
    }

    const inputCostUSD = inputTokens * pricing.input;
    const outputCostUSD = outputTokens * pricing.output;
    const totalCostUSD = inputCostUSD + outputCostUSD;
    const totalCostEUR = totalCostUSD * USD_TO_EUR;

    return {
      model,
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens
      },
      costUSD: totalCostUSD,
      costEUR: totalCostEUR,
      isWithinBudget: totalCostEUR <= this.budgetLimitEUR,
      budgetLimitEUR: this.budgetLimitEUR
    };
  }

  optimizeModelSelection(inputTokens: number, expectedOutputTokens: number): {
    recommendedModel: string;
    savings: number;
    reasoning: string;
  } {
    const gpt4Cost = this.calculateCost('gpt-4', inputTokens, expectedOutputTokens);
    const gpt35Cost = this.calculateCost('gpt-3.5-turbo', inputTokens, expectedOutputTokens);

    const savings = gpt4Cost.costEUR - gpt35Cost.costEUR;
    const savingsPercentage = (savings / gpt4Cost.costEUR) * 100;

    if (inputTokens < 2000 && expectedOutputTokens < 500) {
      return {
        recommendedModel: 'gpt-3.5-turbo',
        savings: savings,
        reasoning: `Simple query with low token count. GPT-3.5-turbo saves ${savingsPercentage.toFixed(1)}% (${savings.toFixed(4)}€)`
      };
    } else {
      return {
        recommendedModel: 'gpt-4',
        savings: 0,
        reasoning: 'Complex query requires GPT-4 for better accuracy despite higher cost'
      };
    }
  }
}

describe('OpenAI Cost Analysis', () => {
  let calculator: OpenAICostCalculator;

  beforeEach(() => {
    calculator = new OpenAICostCalculator();
  });

  describe('Token Calculation', () => {
    it('should estimate tokens correctly for typical French text', () => {
      const frenchText = 'Bonjour, pouvez-vous me suggérer une recette avec des tomates et du fromage?';
      const tokens = calculator.calculateTokens(frenchText);
      
      expect(tokens).toBeGreaterThan(15);
      expect(tokens).toBeLessThan(25);
    });

    it('should estimate context tokens for inventory data', () => {
      const context = {
        inventory: [
          { product: { name: 'Tomates' }, quantity: 3, unit: 'pièces', expiry_date: '2024-12-10' },
          { product: { name: 'Fromage' }, quantity: 200, unit: 'g', expiry_date: '2024-12-08' }
        ],
        recipes: [
          { name: 'Salade de tomates', cuisine: 'Française', ingredients: ['tomates', 'huile'] }
        ],
        expiryAlerts: [
          { product: 'Fromage', daysUntil: 2, type: 'warning' }
        ]
      };

      const tokens = calculator.estimateContextTokens(context);
      
      expect(tokens).toBeGreaterThan(50);
      expect(tokens).toBeLessThan(200);
    });
  });

  describe('Cost Calculations', () => {
    it('should calculate GPT-4 costs correctly', () => {
      const analysis = calculator.calculateCost('gpt-4', 1000, 500);
      
      expect(analysis.model).toBe('gpt-4');
      expect(analysis.tokenUsage.inputTokens).toBe(1000);
      expect(analysis.tokenUsage.outputTokens).toBe(500);
      expect(analysis.tokenUsage.totalTokens).toBe(1500);
      
      // 1000 * 0.03/1000 + 500 * 0.06/1000 = 0.03 + 0.03 = 0.06 USD
      expect(analysis.costUSD).toBeCloseTo(0.06, 4);
      expect(analysis.costEUR).toBeCloseTo(0.06 * USD_TO_EUR, 4);
    });

    it('should calculate GPT-3.5-turbo costs correctly', () => {
      const analysis = calculator.calculateCost('gpt-3.5-turbo', 1000, 500);
      
      expect(analysis.model).toBe('gpt-3.5-turbo');
      
      // 1000 * 0.0015/1000 + 500 * 0.002/1000 = 0.0015 + 0.001 = 0.0025 USD
      expect(analysis.costUSD).toBeCloseTo(0.0025, 4);
      expect(analysis.costEUR).toBeCloseTo(0.0025 * USD_TO_EUR, 4);
    });

    it('should identify costs within budget', () => {
      // Small request that should be within 0.05€ budget
      const analysis = calculator.calculateCost('gpt-3.5-turbo', 500, 200);
      
      expect(analysis.isWithinBudget).toBe(true);
      expect(analysis.budgetLimitEUR).toBe(0.05);
    });

    it('should identify costs exceeding budget', () => {
      // Large request that exceeds 0.05€ budget
      const analysis = calculator.calculateCost('gpt-4', 5000, 2000);
      
      expect(analysis.isWithinBudget).toBe(false);
      expect(analysis.costEUR).toBeGreaterThan(0.05);
    });
  });

  describe('Model Selection Optimization', () => {
    it('should recommend GPT-3.5-turbo for simple queries', () => {
      const recommendation = calculator.optimizeModelSelection(800, 300);
      
      expect(recommendation.recommendedModel).toBe('gpt-3.5-turbo');
      expect(recommendation.savings).toBeGreaterThan(0);
      expect(recommendation.reasoning).toContain('Simple query');
    });

    it('should recommend GPT-4 for complex queries', () => {
      const recommendation = calculator.optimizeModelSelection(3000, 800);
      
      expect(recommendation.recommendedModel).toBe('gpt-4');
      expect(recommendation.savings).toBe(0);
      expect(recommendation.reasoning).toContain('Complex query');
    });

    it('should calculate accurate savings for model switching', () => {
      const gpt4Cost = calculator.calculateCost('gpt-4', 1000, 400);
      const gpt35Cost = calculator.calculateCost('gpt-3.5-turbo', 1000, 400);
      
      const recommendation = calculator.optimizeModelSelection(1000, 400);
      
      expect(recommendation.savings).toBeCloseTo(
        gpt4Cost.costEUR - gpt35Cost.costEUR, 
        4
      );
    });
  });

  describe('Real-World Scenarios', () => {
    it('should analyze typical inventory query cost', () => {
      const systemPrompt = `Tu es un assistant culinaire expert français avec accès à l'inventaire et aux recettes de l'utilisateur.

**Inventaire actuel:**
• 3 pièces de Tomates (expire dans 2 jours)
• 200 g de Fromage (expire dans 1 jour)
• 1 L de Lait (expire dans 3 jours)

**Recettes disponibles:**
- Salade de tomates (Française, 15 min): tomates, huile olive, basilic
- Quiche au fromage (Française, 45 min): fromage, œufs, lait, pâte

**Saison actuelle:** Automne

**Règles importantes:**
1. TOUJOURS prioriser les produits qui expirent bientôt
2. Proposer des recettes réalisables avec l'inventaire actuel`;

      const userMessage = 'Que puis-je cuisiner avec mes ingrédients qui expirent bientôt?';
      
      const systemTokens = calculator.calculateTokens(systemPrompt);
      const userTokens = calculator.calculateTokens(userMessage);
      const expectedOutputTokens = 300; // Typical AI response length
      
      const totalInputTokens = systemTokens + userTokens;
      
      const gpt35Analysis = calculator.calculateCost('gpt-3.5-turbo', totalInputTokens, expectedOutputTokens);
      const gpt4Analysis = calculator.calculateCost('gpt-4', totalInputTokens, expectedOutputTokens);
      
      expect(gpt35Analysis.isWithinBudget).toBe(true);
      expect(gpt4Analysis.costEUR).toBeGreaterThan(gpt35Analysis.costEUR);
      
      // Verify both are reasonable costs
      expect(gpt35Analysis.costEUR).toBeLessThan(0.01); // Less than 1 cent
      expect(gpt4Analysis.costEUR).toBeLessThan(0.05); // Within 5 cent budget
    });

    it('should analyze cost for large inventory scenario', () => {
      // Large inventory with 30 items and 20 recipes
      const largeContext = {
        inventory: Array.from({ length: 30 }, (_, i) => ({
          product: { name: `Product ${i}` },
          quantity: i + 1,
          unit: 'piece',
          expiry_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString()
        })),
        recipes: Array.from({ length: 20 }, (_, i) => ({
          name: `Recipe ${i}`,
          cuisine: 'Française',
          ingredients: [`ingredient-${i}-1`, `ingredient-${i}-2`, `ingredient-${i}-3`]
        })),
        expiryAlerts: Array.from({ length: 5 }, (_, i) => ({
          product: `Expiring Product ${i}`,
          daysUntil: i + 1,
          type: i === 0 ? 'critical' : 'warning'
        }))
      };

      const contextTokens = calculator.estimateContextTokens(largeContext);
      const userMessageTokens = calculator.calculateTokens(
        'Peux-tu analyser mon inventaire complet et me suggérer plusieurs recettes en priorisant les ingrédients qui expirent bientôt?'
      );
      const expectedOutputTokens = 800; // Longer response for complex analysis

      const totalInputTokens = contextTokens + userMessageTokens;

      const gpt4Analysis = calculator.calculateCost('gpt-4', totalInputTokens, expectedOutputTokens);
      
      // Large queries might exceed budget but should be reasonable
      expect(gpt4Analysis.costEUR).toBeLessThan(0.15); // Within reasonable limit
      
      if (!gpt4Analysis.isWithinBudget) {
        // Should consider GPT-3.5-turbo for cost optimization
        const gpt35Analysis = calculator.calculateCost('gpt-3.5-turbo', totalInputTokens, expectedOutputTokens);
        expect(gpt35Analysis.costEUR).toBeLessThan(gpt4Analysis.costEUR);
      }
    });
  });

  describe('Monthly Cost Projections', () => {
    it('should project monthly costs for typical usage', () => {
      // Assume average user makes 10 queries per day
      const dailyQueries = 10;
      const monthlyQueries = dailyQueries * 30;
      
      // Average query characteristics
      const avgInputTokens = 800;  // Context + user message
      const avgOutputTokens = 300; // AI response
      
      const costPerQueryGPT35 = calculator.calculateCost('gpt-3.5-turbo', avgInputTokens, avgOutputTokens).costEUR;
      const costPerQueryGPT4 = calculator.calculateCost('gpt-4', avgInputTokens, avgOutputTokens).costEUR;
      
      const monthlyCostGPT35 = costPerQueryGPT35 * monthlyQueries;
      const monthlyCostGPT4 = costPerQueryGPT4 * monthlyQueries;
      
      expect(monthlyCostGPT35).toBeLessThan(5.0); // Less than 5€ per month
      expect(monthlyCostGPT4).toBeLessThan(15.0); // Less than 15€ per month
      
      // Log for analysis
      console.log(`Monthly cost projections for ${monthlyQueries} queries:`);
      console.log(`GPT-3.5-turbo: ${monthlyCostGPT35.toFixed(2)}€`);
      console.log(`GPT-4: ${monthlyCostGPT4.toFixed(2)}€`);
      console.log(`Savings with GPT-3.5-turbo: ${(monthlyCostGPT4 - monthlyCostGPT35).toFixed(2)}€`);
    });

    it('should identify high-usage scenarios requiring cost optimization', () => {
      // Heavy user scenario: 50 queries per day
      const heavyUsageQueries = 50 * 30; // 1500 monthly queries
      const avgTokensPerQuery = 1200;
      
      const monthlyCost = calculator.calculateCost('gpt-4', avgTokensPerQuery, 400).costEUR * heavyUsageQueries;
      
      if (monthlyCost > 20) { // If monthly cost exceeds 20€
        // Recommend hybrid approach or usage limits
        const hybridCost = (
          calculator.calculateCost('gpt-3.5-turbo', avgTokensPerQuery, 400).costEUR * (heavyUsageQueries * 0.8) +
          calculator.calculateCost('gpt-4', avgTokensPerQuery, 400).costEUR * (heavyUsageQueries * 0.2)
        );
        
        expect(hybridCost).toBeLessThan(monthlyCost);
      }
    });
  });

  describe('Cost Alert Thresholds', () => {
    it('should detect when requests approach budget limits', () => {
      const expensiveQueryTokens = 4000; // Large context
      const analysis = calculator.calculateCost('gpt-4', expensiveQueryTokens, 1000);
      
      if (analysis.costEUR > analysis.budgetLimitEUR * 0.8) { // 80% of budget
        // Should trigger cost warning
        expect(analysis.costEUR).toBeGreaterThan(0.04); // 80% of 0.05€
      }
    });

    it('should recommend context optimization for expensive requests', () => {
      const veryLargeContext = Array(100).fill(null).map((_, i) => ({
        product: { name: `Very Long Product Name With Extensive Details ${i}` },
        description: 'This is a very long description that takes up many tokens and increases API costs significantly',
        quantity: i,
        unit: 'pieces'
      }));

      const contextTokens = calculator.estimateContextTokens({ inventory: veryLargeContext });
      const analysis = calculator.calculateCost('gpt-4', contextTokens, 500);
      
      if (!analysis.isWithinBudget) {
        // Should recommend context reduction
        const optimizedContext = veryLargeContext.slice(0, 30); // Reduce to 30 items
        const optimizedTokens = calculator.estimateContextTokens({ inventory: optimizedContext });
        const optimizedAnalysis = calculator.calculateCost('gpt-4', optimizedTokens, 500);
        
        expect(optimizedAnalysis.costEUR).toBeLessThan(analysis.costEUR);
        expect(optimizedAnalysis.isWithinBudget).toBe(true);
      }
    });
  });
});

export { OpenAICostCalculator, OPENAI_PRICING, USD_TO_EUR };