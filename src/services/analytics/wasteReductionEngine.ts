/**
 * Waste Reduction Analytics Engine - Evolution V2
 * AI-powered analytics for food waste reduction and sustainability insights
 */

export interface WastePrediction {
  productId: string;
  productName: string;
  currentQuantity: number;
  unit: string;
  daysUntilExpiry: number;
  wasteRisk: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  predictedWasteAmount: number;
  estimatedValue: number;
  recommendations: WastePreventionRecommendation[];
  historicalWasteRate: number; // % of this product type historically wasted
  lastUpdated: Date;
}

export interface WastePreventionRecommendation {
  type: 'recipe' | 'preservation' | 'donation' | 'freezing' | 'sharing';
  action: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedSavings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeRequired: number; // minutes
  ingredients?: string[]; // For recipe recommendations
  instructions?: string[];
}

export interface BuyingBehavior {
  userId: string;
  productCategories: CategoryBehavior[];
  seasonalPatterns: SeasonalPattern[];
  wastePatterns: WastePattern[];
  budgetEfficiency: BudgetEfficiency;
  sustainabilityScore: SustainabilityScore;
  insights: BehaviorInsight[];
  lastAnalyzed: Date;
}

export interface CategoryBehavior {
  category: string;
  averageQuantity: number;
  buyingFrequency: number; // times per month
  wasteRate: number; // percentage wasted
  preferredBrands: string[];
  priceRange: { min: number; max: number; average: number };
  seasonalVariation: number; // 0-1, how much buying varies by season
  substituteFlexibility: number; // 0-1, willingness to try alternatives
}

export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  spendingIncrease: number; // percentage change from baseline
  topCategories: string[];
  wasteRateChange: number; // percentage change in waste
  newProductTries: number; // count of new products tried
  budgetAdherence: number; // 0-1, how well budget was followed
}

export interface WastePattern {
  category: string;
  averageWastePercentage: number;
  commonReasons: WasteReason[];
  costImpact: number; // monthly cost of waste in this category
  improvementPotential: number; // 0-1, how much can be improved
  specificItems: WasteItem[];
}

export interface WasteReason {
  reason: 'expired' | 'spoiled' | 'over_purchased' | 'forgot' | 'disliked' | 'changed_plans';
  frequency: number; // percentage of waste due to this reason
  averageCost: number;
  preventionStrategies: string[];
}

export interface WasteItem {
  productName: string;
  wasteFrequency: number; // times wasted per month
  averageWasteAmount: number;
  averageCost: number;
  lastWasteDate: Date;
  wasteReasons: string[];
}

export interface BudgetEfficiency {
  monthlySpending: number;
  budgetAdherence: number; // 0-1
  priceOptimization: number; // 0-1, how well prices are optimized
  bulkBuyingEfficiency: number; // 0-1
  seasonalOptimization: number; // 0-1
  wasteImpact: number; // percentage of budget lost to waste
  improvementOpportunities: BudgetImprovement[];
}

export interface BudgetImprovement {
  area: string;
  currentCost: number;
  potentialSavings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  actions: string[];
}

export interface SustainabilityScore {
  overallScore: number; // 0-100
  categories: {
    wasteReduction: number;
    localSourcing: number;
    seasonalEating: number;
    packagingMinimization: number;
    carbonFootprint: number;
  };
  monthlyImprovement: number;
  achievements: SustainabilityAchievement[];
  recommendations: SustainabilityRecommendation[];
}

export interface SustainabilityAchievement {
  title: string;
  description: string;
  earnedDate: Date;
  impact: string;
  category: string;
}

export interface SustainabilityRecommendation {
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  potentialScoreIncrease: number;
  actions: string[];
}

export interface BehaviorInsight {
  type: 'trend' | 'anomaly' | 'opportunity' | 'warning' | 'achievement';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1
  actionable: boolean;
  suggestedActions: string[];
  dataPoints: InsightDataPoint[];
}

export interface InsightDataPoint {
  date: Date;
  value: number;
  label: string;
  context?: string;
}

export interface SeasonalAnalytics {
  season: string;
  year: number;
  spending: SeasonalSpending;
  waste: SeasonalWaste;
  nutrition: SeasonalNutrition;
  sustainability: SeasonalSustainability;
  comparisons: SeasonalComparison[];
}

export interface SeasonalSpending {
  totalAmount: number;
  averagePerWeek: number;
  topCategories: { category: string; amount: number }[];
  budgetVariance: number;
  priceOptimization: number;
}

export interface SeasonalWaste {
  totalWasteValue: number;
  wastePercentage: number;
  topWastedItems: { item: string; amount: number; value: number }[];
  improvementFromLastYear: number;
  preventedWasteValue: number;
}

export interface SeasonalNutrition {
  varietyScore: number;
  seasonalScore: number; // how well aligned with seasonal produce
  nutritionalBalance: number;
  newFoodsIntroduced: number;
}

export interface SeasonalSustainability {
  carbonFootprint: number;
  localSourcingPercentage: number;
  packageWasteReduction: number;
  sustainabilityScore: number;
}

export interface SeasonalComparison {
  metric: string;
  currentValue: number;
  previousYearValue: number;
  change: number;
  changePercentage: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface PurchaseOptimization {
  userId: string;
  weeklyRecommendations: WeeklyOptimization;
  monthlyRecommendations: MonthlyOptimization;
  seasonalRecommendations: OptimizationRecommendation[];
  budgetOptimization: BudgetOptimizationSuggestion[];
  wasteReductionOpportunities: WasteReductionOpportunity[];
  lastOptimized: Date;
}

export interface WeeklyOptimization {
  recommendedBudget: number;
  priorityCategories: string[];
  avoidCategories: string[];
  bulkBuyOpportunities: BulkBuyOpportunity[];
  priceAlerts: PriceAlert[];
  expiryUsageReminders: ExpiryReminder[];
}

export interface MonthlyOptimization {
  spendingCeiling: number;
  categoryLimits: Record<string, number>;
  seasonalAdjustments: SeasonalAdjustment[];
  wastePrevention: WastePreventionPlan;
  sustainabilityGoals: SustainabilityGoal[];
}

export interface OptimizationRecommendation {
  category: string;
  recommendation: string;
  reasoning: string;
  potentialSavings: number;
  difficulty: string;
  timeline: string;
}

export interface BudgetOptimizationSuggestion {
  area: string;
  currentSpending: number;
  optimizedSpending: number;
  savingsAmount: number;
  savingsPercentage: number;
  actions: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface WasteReductionOpportunity {
  productCategory: string;
  currentWasteRate: number;
  targetWasteRate: number;
  potentialSavings: number;
  strategies: WasteReductionStrategy[];
  timeline: string;
  successMetrics: string[];
}

export interface WasteReductionStrategy {
  strategy: string;
  description: string;
  implementation: string;
  expectedImpact: number;
  cost: number;
  difficulty: string;
}

export interface BulkBuyOpportunity {
  product: string;
  currentPrice: number;
  bulkPrice: number;
  minQuantity: number;
  savings: number;
  storageRequirements: string;
  expiryConsiderations: string;
}

export interface PriceAlert {
  product: string;
  currentPrice: number;
  historicalAverage: number;
  recommendation: 'buy_now' | 'wait' | 'consider_alternative';
  reasoning: string;
  alertUntil: Date;
}

export interface ExpiryReminder {
  productName: string;
  expiryDate: Date;
  daysRemaining: number;
  suggestedUsage: string[];
  recipeRecommendations: string[];
}

export interface SeasonalAdjustment {
  category: string;
  adjustment: number;
  reasoning: string;
  duration: string;
}

export interface WastePreventionPlan {
  targetWasteReduction: number;
  focusCategories: string[];
  strategies: WasteReductionStrategy[];
  monthlyMilestones: WasteMilestone[];
}

export interface WasteMilestone {
  week: number;
  target: number;
  metric: string;
  actions: string[];
}

export interface SustainabilityGoal {
  goal: string;
  currentValue: number;
  targetValue: number;
  timeline: string;
  actions: string[];
  measurementMethod: string;
}

export class WasteReductionEngine {
  private apiUrl: string;
  private authToken?: string;
  private mlModels: Map<string, any> = new Map();

  constructor(apiUrl: string, authToken?: string) {
    this.apiUrl = apiUrl;
    this.authToken = authToken;
  }

  /**
   * Waste Prediction and Analysis
   */
  async predictWaste(userId: string, inventoryItems: any[]): Promise<WastePrediction[]> {
    const predictions: WastePrediction[] = [];

    for (const item of inventoryItems) {
      try {
        const prediction = await this.predictItemWaste(userId, item);
        predictions.push(prediction);
      } catch (error) {
        console.warn(`Failed to predict waste for item ${item.id}:`, error);
      }
    }

    // Sort by waste risk and days until expiry
    return predictions.sort((a, b) => {
      const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const riskDiff = riskOrder[b.wasteRisk] - riskOrder[a.wasteRisk];
      
      if (riskDiff !== 0) return riskDiff;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
  }

  async predictItemWaste(userId: string, item: any): Promise<WastePrediction> {
    // Calculate days until expiry
    const daysUntilExpiry = item.expiry_date
      ? Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 365; // Default to 1 year for non-perishables

    // Get historical waste data for this product type
    const historicalWasteRate = await this.getHistoricalWasteRate(userId, item.product?.name);
    
    // Calculate waste risk based on multiple factors
    const wasteRisk = this.calculateWasteRisk(daysUntilExpiry, item.quantity, historicalWasteRate);
    
    // Calculate predicted waste amount
    const predictedWasteAmount = this.calculatePredictedWaste(
      item.quantity, 
      daysUntilExpiry, 
      historicalWasteRate
    );
    
    // Estimate value of waste
    const estimatedValue = predictedWasteAmount * (item.price_per_unit || 2.5);
    
    // Generate recommendations
    const recommendations = await this.generateWastePreventionRecommendations(
      item, 
      daysUntilExpiry, 
      wasteRisk
    );

    return {
      productId: item.id,
      productName: item.product?.name || item.name,
      currentQuantity: item.quantity,
      unit: item.unit || 'unité',
      daysUntilExpiry,
      wasteRisk,
      confidence: this.calculatePredictionConfidence(item, historicalWasteRate),
      predictedWasteAmount,
      estimatedValue,
      recommendations,
      historicalWasteRate,
      lastUpdated: new Date()
    };
  }

  /**
   * Buying Behavior Analysis
   */
  async analyzeBuyingBehavior(userId: string, timeRange: { start: Date; end: Date }): Promise<BuyingBehavior> {
    try {
      const response = await this.request('POST', '/analytics/buying-behavior', {
        userId,
        startDate: timeRange.start.toISOString(),
        endDate: timeRange.end.toISOString()
      });

      return response.analysis;
    } catch (error) {
      console.error('Buying behavior analysis failed:', error);
      throw error;
    }
  }

  /**
   * Seasonal Analytics
   */
  async getSeasonalAnalytics(userId: string, season: string, year: number): Promise<SeasonalAnalytics> {
    try {
      const response = await this.request('GET', `/analytics/seasonal/${userId}?season=${season}&year=${year}`);
      return response.analytics;
    } catch (error) {
      console.error('Seasonal analytics failed:', error);
      throw error;
    }
  }

  /**
   * Purchase Optimization
   */
  async optimizePurchases(userId: string, currentInventory: any[], upcomingMeals: any[]): Promise<PurchaseOptimization> {
    try {
      const response = await this.request('POST', '/analytics/optimize-purchases', {
        userId,
        inventory: currentInventory,
        plannedMeals: upcomingMeals,
        optimizationDate: new Date().toISOString()
      });

      return response.optimization;
    } catch (error) {
      console.error('Purchase optimization failed:', error);
      throw error;
    }
  }

  /**
   * Waste Tracking and Recording
   */
  async recordWaste(userId: string, wasteEntry: {
    productName: string;
    quantity: number;
    unit: string;
    reason: string;
    estimatedValue: number;
    category: string;
    date: Date;
  }): Promise<void> {
    try {
      await this.request('POST', '/analytics/waste-entries', {
        userId,
        ...wasteEntry,
        date: wasteEntry.date.toISOString()
      });
    } catch (error) {
      console.error('Failed to record waste:', error);
      throw error;
    }
  }

  async getWasteReport(userId: string, period: 'week' | 'month' | 'quarter' | 'year'): Promise<{
    totalWaste: number;
    totalValue: number;
    wasteByCategory: Record<string, number>;
    wasteByReason: Record<string, number>;
    trend: 'improving' | 'worsening' | 'stable';
    comparison: { period: string; change: number };
    topWastedItems: Array<{ name: string; quantity: number; value: number }>;
  }> {
    try {
      const response = await this.request('GET', `/analytics/waste-report/${userId}?period=${period}`);
      return response.report;
    } catch (error) {
      console.error('Failed to get waste report:', error);
      throw error;
    }
  }

  /**
   * Sustainability Scoring
   */
  async calculateSustainabilityScore(userId: string): Promise<SustainabilityScore> {
    try {
      const response = await this.request('GET', `/analytics/sustainability-score/${userId}`);
      return response.score;
    } catch (error) {
      console.error('Failed to calculate sustainability score:', error);
      throw error;
    }
  }

  async updateSustainabilityAction(userId: string, action: {
    type: string;
    description: string;
    impact: number;
    date: Date;
  }): Promise<void> {
    try {
      await this.request('POST', '/analytics/sustainability-actions', {
        userId,
        ...action,
        date: action.date.toISOString()
      });
    } catch (error) {
      console.error('Failed to update sustainability action:', error);
      throw error;
    }
  }

  /**
   * Insights and Recommendations Engine
   */
  async generateBehaviorInsights(userId: string): Promise<BehaviorInsight[]> {
    try {
      const response = await this.request('GET', `/analytics/insights/${userId}`);
      return response.insights;
    } catch (error) {
      console.error('Failed to generate behavior insights:', error);
      return [];
    }
  }

  async getPersonalizedRecommendations(userId: string, category?: string): Promise<{
    waste: WastePreventionRecommendation[];
    budget: BudgetOptimizationSuggestion[];
    sustainability: SustainabilityRecommendation[];
    purchasing: OptimizationRecommendation[];
  }> {
    try {
      const params = category ? `?category=${category}` : '';
      const response = await this.request('GET', `/analytics/recommendations/${userId}${params}`);
      return response.recommendations;
    } catch (error) {
      console.error('Failed to get personalized recommendations:', error);
      return { waste: [], budget: [], sustainability: [], purchasing: [] };
    }
  }

  /**
   * Private Helper Methods
   */
  private async getHistoricalWasteRate(userId: string, productName: string): Promise<number> {
    try {
      const response = await this.request('GET', 
        `/analytics/waste-rate/${userId}?product=${encodeURIComponent(productName)}`
      );
      return response.wasteRate || 0.15; // Default 15% waste rate
    } catch (error) {
      return 0.15; // Fallback to average waste rate
    }
  }

  private calculateWasteRisk(daysUntilExpiry: number, quantity: number, historicalWasteRate: number): WastePrediction['wasteRisk'] {
    // Risk factors
    const expiryRisk = daysUntilExpiry <= 2 ? 1.0 : daysUntilExpiry <= 5 ? 0.7 : daysUntilExpiry <= 10 ? 0.4 : 0.1;
    const quantityRisk = quantity > 5 ? 0.8 : quantity > 2 ? 0.5 : 0.2;
    const historicalRisk = historicalWasteRate;
    
    // Combined risk score (0-1)
    const riskScore = (expiryRisk * 0.4) + (quantityRisk * 0.3) + (historicalRisk * 0.3);
    
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.3) return 'medium';
    return 'low';
  }

  private calculatePredictedWaste(quantity: number, daysUntilExpiry: number, historicalWasteRate: number): number {
    // Base prediction on historical waste rate
    let wasteAmount = quantity * historicalWasteRate;
    
    // Adjust based on expiry urgency
    if (daysUntilExpiry <= 2) {
      wasteAmount *= 1.8; // Much higher chance of waste
    } else if (daysUntilExpiry <= 5) {
      wasteAmount *= 1.3;
    } else if (daysUntilExpiry > 30) {
      wasteAmount *= 0.5; // Lower immediate risk
    }
    
    return Math.min(wasteAmount, quantity); // Can't waste more than available
  }

  private calculatePredictionConfidence(item: any, historicalWasteRate: number): number {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence with historical data
    if (historicalWasteRate > 0) confidence += 0.2;
    
    // Increase confidence with expiry date
    if (item.expiry_date) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private async generateWastePreventionRecommendations(
    item: any, 
    daysUntilExpiry: number, 
    wasteRisk: string
  ): Promise<WastePreventionRecommendation[]> {
    const recommendations: WastePreventionRecommendation[] = [];
    const productName = item.product?.name || item.name;
    
    // Recipe recommendations for urgent items
    if (daysUntilExpiry <= 5) {
      recommendations.push({
        type: 'recipe',
        action: `Utiliser ${productName} dans une recette aujourd'hui`,
        urgency: daysUntilExpiry <= 2 ? 'high' : 'medium',
        estimatedSavings: item.price_per_unit * item.quantity * 0.8,
        difficulty: 'easy',
        timeRequired: 30,
        ingredients: [productName],
        instructions: [`Rechercher des recettes utilisant ${productName}`, 'Préparer le plat dans les 24h']
      });
    }
    
    // Preservation recommendations
    if (item.quantity > 2 && this.canBePreserved(productName)) {
      recommendations.push({
        type: 'preservation',
        action: `Congeler une partie de ${productName}`,
        urgency: 'medium',
        estimatedSavings: item.price_per_unit * (item.quantity * 0.5),
        difficulty: 'easy',
        timeRequired: 10,
        instructions: [
          `Diviser ${productName} en portions`,
          'Emballer pour la congélation',
          'Étiqueter avec la date'
        ]
      });
    }
    
    // Sharing recommendations for large quantities
    if (item.quantity > 3) {
      recommendations.push({
        type: 'sharing',
        action: `Partager ${productName} avec des voisins ou amis`,
        urgency: 'low',
        estimatedSavings: item.price_per_unit * (item.quantity * 0.3),
        difficulty: 'easy',
        timeRequired: 15,
        instructions: [
          'Contacter des proches',
          `Proposer de partager ${productName}`,
          'Organiser l\'échange'
        ]
      });
    }
    
    return recommendations;
  }

  private canBePreserved(productName: string): boolean {
    const preservableItems = [
      'viande', 'poisson', 'légumes', 'fruits', 'pain', 'fromage',
      'plats cuisinés', 'soupes', 'sauces'
    ];
    
    return preservableItems.some(item => 
      productName.toLowerCase().includes(item)
    );
  }

  private async request(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Analytics API Error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Machine Learning Model Management
   */
  async updateMLModel(modelName: string, trainingData: any[]): Promise<void> {
    try {
      await this.request('POST', `/analytics/models/${modelName}/train`, {
        trainingData
      });
    } catch (error) {
      console.error('Failed to update ML model:', error);
    }
  }

  async getModelAccuracy(modelName: string): Promise<number> {
    try {
      const response = await this.request('GET', `/analytics/models/${modelName}/accuracy`);
      return response.accuracy;
    } catch (error) {
      console.error('Failed to get model accuracy:', error);
      return 0.5; // Default accuracy
    }
  }
}

// Export singleton instance
let wasteReductionEngineInstance: WasteReductionEngine | null = null;

export function getWasteReductionEngine(apiUrl?: string, authToken?: string): WasteReductionEngine {
  const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  if (!wasteReductionEngineInstance) {
    wasteReductionEngineInstance = new WasteReductionEngine(apiUrl || defaultApiUrl, authToken);
  }
  
  // Update auth token if provided
  if (authToken) {
    wasteReductionEngineInstance.setAuthToken(authToken);
  }
  
  return wasteReductionEngineInstance;
}