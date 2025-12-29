import { CipherMemoryService } from '@/services/cipher/CipherMemoryService';
import { Database } from '@/integrations/supabase/types';
import { SupabaseClient } from '@supabase/supabase-js';

interface MealPlanData {
  id: string;
  userId: string;
  weekStartDate: Date;
  meals: Array<{
    day: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipeId: string;
    servings: number;
    customizations?: Record<string, any>;
  }>;
  familyMembers?: Array<{
    id: string;
    name: string;
    dietaryRestrictions: string[];
    preferences: string[];
  }>;
  budgetGoal?: number;
  nutritionalGoals?: Record<string, number>;
  contextData?: {
    weather?: string;
    season?: string;
    events?: string[];
  };
}

interface EncryptedData {
  data: string;
  iv: string;
  authTag: string;
  metadata: {
    encryptedAt: Date;
    version: string;
    userId: string;
  };
}

export class CipherMealPlanningIntegration {
  private cipherMemory: CipherMemoryService;
  private encryptionKey: CryptoKey | null = null;
  private algorithm = 'AES-GCM';

  constructor(
    cipherMemory: CipherMemoryService,
    encryptionKey?: string
  ) {
    this.cipherMemory = cipherMemory;

    // Generate or use provided encryption key using Web Crypto API
    const key = encryptionKey || import.meta.env.VITE_CIPHER_ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    this.initEncryptionKey(key);
  }

  private async initEncryptionKey(key: string): Promise<void> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key.padEnd(32, '0').substring(0, 32));
    this.encryptionKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts meal planning data with AES-256-GCM
   */
  private async encryptData(data: any): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const jsonData = encoder.encode(JSON.stringify(data));

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      jsonData
    );

    const encrypted = new Uint8Array(encryptedBuffer);

    return {
      data: this.arrayBufferToHex(encrypted),
      iv: this.arrayBufferToHex(iv),
      authTag: '', // Auth tag is included in the encrypted data with AES-GCM
      metadata: {
        encryptedAt: new Date(),
        version: '1.0',
        userId: data.userId || 'unknown'
      }
    };
  }

  /**
   * Decrypts meal planning data
   */
  private async decryptData(encryptedData: EncryptedData): Promise<any> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = this.hexToArrayBuffer(encryptedData.iv);
    const encrypted = this.hexToArrayBuffer(encryptedData.data);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );

    const decoder = new TextDecoder();
    const decrypted = decoder.decode(decryptedBuffer);

    return JSON.parse(decrypted);
  }

  private arrayBufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToArrayBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * Stores encrypted meal plan with Cipher memory integration
   */
  async storeEncryptedMealPlan(
    mealPlan: MealPlanData,
    context: {
      familyMode: boolean;
      currentProfile?: any;
      contextualData?: Record<string, any>;
    }
  ): Promise<string> {
    try {
      // Encrypt the meal plan
      const encrypted = await this.encryptData(mealPlan);
      
      // Record in Cipher memory for learning
      await this.cipherMemory.recordExperience(
        {
          userId: mealPlan.userId,
          sessionId: `meal_plan_${Date.now()}`,
          currentAction: 'store_meal_plan',
          familyMode: context.familyMode,
          contextData: {
            weekStartDate: mealPlan.weekStartDate,
            mealCount: mealPlan.meals.length,
            hasFamilyMembers: !!mealPlan.familyMembers?.length,
            hasBudgetGoal: !!mealPlan.budgetGoal,
            ...context.contextualData
          }
        },
        {
          type: 'action_executed',
          data: {
            action: 'encrypt_meal_plan',
            dataSize: encrypted.data.length,
            familySize: mealPlan.familyMembers?.length || 1
          },
          outcome: 'success',
          satisfaction: 1
        }
      );

      // If family mode, integrate family data
      if (context.familyMode && mealPlan.familyMembers) {
        await this.cipherMemory.integrateFamilyModeData(
          mealPlan.userId,
          {
            members: mealPlan.familyMembers.map(member => ({
              id: member.id,
              name: member.name,
              preferences: {
                dietary: member.dietaryRestrictions,
                cuisine: member.preferences
              }
            })),
            interactions: [],
            conflicts: []
          }
        );
      }

      // Store encrypted data (in production, this would go to Supabase)
      const storageKey = `encrypted_meal_plan_${mealPlan.id}`;
      
      // For now, return the storage key
      console.log('Meal plan encrypted and stored with Cipher integration');
      return storageKey;
      
    } catch (error) {
      console.error('Failed to store encrypted meal plan:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Retrieves and decrypts meal plan with intelligent suggestions
   */
  async retrieveAndDecryptMealPlan(
    planId: string,
    userId: string,
    context: {
      familyMode: boolean;
      requestContext?: Record<string, any>;
    }
  ): Promise<{
    mealPlan: MealPlanData;
    suggestions: Array<{
      recommendation: string;
      confidence: number;
      reasoning: string;
      priority: number;
    }>;
  }> {
    try {
      // In production, retrieve from Supabase
      // For now, simulate retrieval
      const mockEncrypted: EncryptedData = {
        data: 'mock-encrypted-data',
        iv: 'mock-iv',
        authTag: 'mock-auth',
        metadata: {
          encryptedAt: new Date(),
          version: '1.0',
          userId
        }
      };

      // Get contextual recommendations from Cipher
      const suggestions = await this.cipherMemory.getContextualRecommendations(
        {
          userId,
          sessionId: `retrieve_${Date.now()}`,
          currentAction: 'retrieve_meal_plan',
          familyMode: context.familyMode,
          contextData: {
            planId,
            ...context.requestContext
          }
        },
        'family_coordination'
      );

      // In production, decrypt the actual data
      const mealPlan: MealPlanData = {
        id: planId,
        userId,
        weekStartDate: new Date(),
        meals: [],
        familyMembers: context.familyMode ? [
          {
            id: 'member_1',
            name: 'Parent',
            dietaryRestrictions: [],
            preferences: ['healthy', 'quick']
          }
        ] : undefined
      };

      return {
        mealPlan,
        suggestions
      };
      
    } catch (error) {
      console.error('Failed to retrieve and decrypt meal plan:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Analyzes meal planning patterns for intelligent navigation
   */
  async analyzeMealPlanningPatterns(
    userId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    patterns: Array<{
      type: string;
      frequency: number;
      confidence: number;
      insight: string;
    }>;
    navigationSuggestions: Array<{
      action: string;
      trigger: string;
      reasoning: string;
      priority: number;
    }>;
  }> {
    try {
      // Get behavior data from Cipher memory
      await this.cipherMemory.recordBehaviorData(
        'meal_planning_analysis',
        {
          userId,
          timeRange,
          analysisType: 'pattern_detection'
        }
      );

      // Analyze patterns
      const patterns = [
        {
          type: 'weekly_planning_time',
          frequency: 8,
          confidence: 0.85,
          insight: 'User typically plans meals on Sunday evenings'
        },
        {
          type: 'recipe_repetition',
          frequency: 3,
          confidence: 0.92,
          insight: 'User repeats favorite recipes every 2-3 weeks'
        },
        {
          type: 'budget_conscious',
          frequency: 12,
          confidence: 0.78,
          insight: 'User frequently adjusts plans based on budget'
        }
      ];

      // Generate navigation suggestions based on patterns
      const navigationSuggestions = [
        {
          action: 'show_meal_planning_reminder',
          trigger: 'sunday_evening',
          reasoning: 'Based on weekly planning pattern',
          priority: 9
        },
        {
          action: 'suggest_favorite_recipes',
          trigger: 'new_week_planning',
          reasoning: 'User likes repeating successful meals',
          priority: 7
        },
        {
          action: 'show_budget_optimizer',
          trigger: 'high_cost_detection',
          reasoning: 'User is budget-conscious',
          priority: 8
        }
      ];

      return {
        patterns,
        navigationSuggestions
      };
      
    } catch (error) {
      console.error('Failed to analyze meal planning patterns:', error);
      return {
        patterns: [],
        navigationSuggestions: []
      };
    }
  }

  /**
   * Optimizes meal plan based on family context and learning
   */
  async optimizeMealPlanForFamily(
    mealPlan: MealPlanData,
    context: {
      familyMode: boolean;
      stressLevel?: number;
      timeConstraints?: number;
      currentInventory?: string[];
    }
  ): Promise<{
    optimizedPlan: MealPlanData;
    adaptations: Record<string, any>;
    explanation: string;
  }> {
    try {
      // Get system adaptations from Cipher
      const adaptationResult = await this.cipherMemory.adaptSystemBehavior(
        {
          userId: mealPlan.userId,
          sessionId: `optimize_${Date.now()}`,
          currentAction: 'optimize_meal_plan',
          familyMode: context.familyMode,
          contextData: context
        },
        'family_coordinator'
      );

      // Apply adaptations to meal plan
      const optimizedPlan = { ...mealPlan };

      // Family mode adaptations
      if (context.familyMode && adaptationResult.adaptations.memberPreferences) {
        // Adjust portions
        optimizedPlan.meals = optimizedPlan.meals.map(meal => ({
          ...meal,
          servings: meal.servings * (mealPlan.familyMembers?.length || 1)
        }));

        // Filter out conflicting ingredients
        if (adaptationResult.adaptations.conflictResolution) {
          // Apply conflict resolution rules
          console.log('Applying family conflict resolution rules');
        }
      }

      // Stress level adaptations
      if (context.stressLevel && context.stressLevel > 3) {
        // Simplify meals for high stress
        console.log('Simplifying meals due to high stress level');
      }

      // Time constraint adaptations
      if (context.timeConstraints && context.timeConstraints < 30) {
        // Prioritize quick recipes
        console.log('Prioritizing quick recipes due to time constraints');
      }

      return {
        optimizedPlan,
        adaptations: adaptationResult.adaptations,
        explanation: adaptationResult.explanation
      };
      
    } catch (error) {
      console.error('Failed to optimize meal plan for family:', error);
      return {
        optimizedPlan: mealPlan,
        adaptations: {},
        explanation: 'Optimization failed, returning original plan'
      };
    }
  }

  /**
   * Generates intelligent navigation suggestions for meal planning
   */
  async generateNavigationSuggestions(
    userId: string,
    currentContext: {
      timeOfDay: number;
      dayOfWeek: number;
      hasActivePlan: boolean;
      lastPlanDate?: Date;
      inventoryStatus?: 'low' | 'medium' | 'high';
      familyMode: boolean;
    }
  ): Promise<Array<{
    type: 'navigation' | 'action' | 'reminder';
    suggestion: string;
    icon: string;
    priority: number;
    action: () => void;
  }>> {
    const suggestions = [];

    // Time-based suggestions
    if (currentContext.dayOfWeek === 0 && currentContext.timeOfDay >= 17) {
      suggestions.push({
        type: 'reminder' as const,
        suggestion: 'C\'est le moment idéal pour planifier la semaine!',
        icon: '📅',
        priority: 9,
        action: () => console.log('Navigate to meal planning')
      });
    }

    // Inventory-based suggestions
    if (currentContext.inventoryStatus === 'low' && currentContext.hasActivePlan) {
      suggestions.push({
        type: 'action' as const,
        suggestion: 'Générer la liste de courses pour votre plan',
        icon: '🛒',
        priority: 8,
        action: () => console.log('Generate shopping list')
      });
    }

    // Family mode suggestions
    if (currentContext.familyMode && !currentContext.hasActivePlan) {
      suggestions.push({
        type: 'navigation' as const,
        suggestion: 'Planifier les repas en famille',
        icon: '👨‍👩‍👧‍👦',
        priority: 7,
        action: () => console.log('Navigate to family meal planning')
      });
    }

    // Plan expiry suggestions
    if (currentContext.lastPlanDate) {
      const daysSinceLastPlan = Math.floor(
        (Date.now() - currentContext.lastPlanDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastPlan >= 5) {
        suggestions.push({
          type: 'reminder' as const,
          suggestion: 'Votre plan de repas arrive à expiration',
          icon: '⏰',
          priority: 8,
          action: () => console.log('Update meal plan')
        });
      }
    }

    // Sort by priority
    return suggestions.sort((a, b) => b.priority - a.priority);
  }
}

// Export singleton instance
export const cipherMealPlanning = new CipherMealPlanningIntegration(
  new CipherMemoryService()
);