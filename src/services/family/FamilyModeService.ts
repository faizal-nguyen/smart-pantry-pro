import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/lib/database.types';

// Types pour le système Family Mode
interface FamilyMember {
  id: string;
  name: string;
  age?: number;
  role: 'parent' | 'child' | 'teen' | 'adult';
  dietary_restrictions: string[];
  allergies: string[];
  preferences: {
    cuisines: string[];
    dislikes: string[];
    favorites: string[];
    spice_tolerance: 1 | 2 | 3 | 4 | 5;
  };
  schedule: {
    breakfast_time?: string;
    lunch_time?: string;
    dinner_time?: string;
    availability: Array<{
      day: string;
      available_hours: string[];
    }>;
  };
  health_conditions?: string[];
  cooking_skills: 1 | 2 | 3 | 4 | 5; // 1 = aucune, 5 = expert
}

interface FamilyProfile {
  id: string;
  family_name: string;
  primary_user_id: string;
  members: FamilyMember[];
  household_rules: {
    max_prep_time: number;
    budget_per_week: number;
    cooking_rotation: boolean;
    meal_decision_maker: string | 'rotate' | 'vote';
    emergency_protocols: string[];
  };
  collective_preferences: {
    common_cuisines: string[];
    banned_ingredients: string[];
    default_portions: number;
    meal_timing_flexibility: number; // 1-5 scale
  };
  conflict_resolution: {
    cuisine_conflicts: 'rotate' | 'vote' | 'parent_decides';
    dietary_conflicts: 'accommodate_all' | 'majority_rule' | 'separate_meals';
    budget_conflicts: 'strict_limit' | 'flexible' | 'negotiate';
  };
  communication_preferences: {
    notifications_enabled: boolean;
    reminder_advance_minutes: number;
    panic_alert_all_members: boolean;
    decision_timeout_minutes: number;
  };
}

interface FamilyMealPlan {
  id: string;
  family_id: string;
  week_start_date: Date;
  status: 'draft' | 'proposed' | 'approved' | 'active';
  created_by: string;
  approved_by: string[];
  rejected_by: string[];
  meals: Array<{
    day: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    primary_recipe_id: string;
    adaptations: Array<{
      member_id: string;
      modifications: string[];
      alternative_recipe?: string;
    }>;
    assignment: {
      cook: string;
      helpers: string[];
      prep_time: string;
    };
    nutrition_analysis: {
      meets_all_requirements: boolean;
      warnings: string[];
      member_specific_notes: Record<string, string>;
    };
  }>;
  shopping_list: {
    items: Array<{
      ingredient: string;
      quantity: number;
      unit: string;
      for_members: string[];
      alternatives: string[];
      priority: 'essential' | 'preferred' | 'optional';
    }>;
    estimated_cost: number;
    assigned_shopper: string;
  };
  family_feedback: Array<{
    member_id: string;
    meal_id: string;
    rating: number;
    comments: string;
    would_repeat: boolean;
  }>;
}

interface FamilyPanicEvent {
  id: string;
  family_id: string;
  triggered_by: string;
  panic_type: 'meal_emergency' | 'dietary_conflict' | 'time_shortage' | 'budget_crisis' | 'cooking_disaster';
  stress_indicators: {
    time_pressure: number; // 1-5
    family_tension: number; // 1-5
    resource_shortage: number; // 1-5
  };
  affected_members: string[];
  solution_preferences: Array<{
    member_id: string;
    preferred_solutions: string[];
    veto_solutions: string[];
  }>;
  family_consensus: {
    voting_enabled: boolean;
    decision_deadline: Date;
    current_votes: Record<string, string>; // member_id -> solution_id
  };
  resolution: {
    chosen_solution: string;
    compromise_factors: string[];
    satisfaction_scores: Record<string, number>;
    lessons_learned: string[];
  };
}

export class FamilyModeService {
  constructor(
    private supabase: SupabaseClient<Database> = supabase
  ) {}

  /**
   * Active le mode famille et configure les préférences
   */
  async activateFamilyMode(
    userId: string,
    familyData: {
      familyName: string;
      members: Omit<FamilyMember, 'id'>[];
      householdRules: Partial<FamilyProfile['household_rules']>;
      communicationPrefs?: Partial<FamilyProfile['communication_preferences']>;
    }
  ): Promise<FamilyProfile> {
    try {
      // Créer les membres avec IDs
      const membersWithIds: FamilyMember[] = familyData.members.map((member, index) => ({
        ...member,
        id: `member_${Date.now()}_${index}`
      }));

      // Analyser les préférences collectives
      const collectivePreferences = this.analyzeCollectivePreferences(membersWithIds);
      
      // Créer le profil famille
      const familyProfile: FamilyProfile = {
        id: `family_${Date.now()}_${userId}`,
        family_name: familyData.familyName,
        primary_user_id: userId,
        members: membersWithIds,
        household_rules: {
          max_prep_time: 45,
          budget_per_week: 150,
          cooking_rotation: true,
          meal_decision_maker: 'vote',
          emergency_protocols: ['panic_button', 'backup_meals', 'delivery_fallback'],
          ...familyData.householdRules
        },
        collective_preferences: collectivePreferences,
        conflict_resolution: {
          cuisine_conflicts: 'rotate',
          dietary_conflicts: 'accommodate_all',
          budget_conflicts: 'flexible'
        },
        communication_preferences: {
          notifications_enabled: true,
          reminder_advance_minutes: 30,
          panic_alert_all_members: true,
          decision_timeout_minutes: 10,
          ...familyData.communicationPrefs
        }
      };

      // Sauvegarder en base
      await this.saveFamilyProfile(familyProfile);

      // Générer le premier plan famille
      await this.generateInitialFamilyPlan(familyProfile);

      console.log(`Family mode activated for ${membersWithIds.length} members`);
      return familyProfile;
    } catch (error) {
      console.error('Failed to activate family mode:', error);
      throw error;
    }
  }

  /**
   * Génère un plan de repas optimisé pour toute la famille
   */
  async generateFamilyMealPlan(
    familyId: string,
    weekStartDate: Date,
    options: {
      considerAllPreferences: boolean;
      allowAlternatives: boolean;
      maxPrepTime?: number;
      budgetConstraint?: number;
    } = { considerAllPreferences: true, allowAlternatives: true }
  ): Promise<FamilyMealPlan> {
    try {
      const familyProfile = await this.getFamilyProfile(familyId);
      if (!familyProfile) throw new Error('Family profile not found');

      // Analyser les contraintes et préférences
      const constraints = this.analyzeFamilyConstraints(familyProfile);
      
      // Générer les repas pour la semaine
      const meals = await this.generateWeeklyMeals(familyProfile, constraints, options);

      // Créer la liste de courses optimisée
      const shoppingList = await this.generateFamilyShoppingList(meals, familyProfile);

      // Assigner les responsabilités
      const assignments = this.assignCookingResponsibilities(meals, familyProfile);

      const familyPlan: FamilyMealPlan = {
        id: `plan_${Date.now()}_${familyId}`,
        family_id: familyId,
        week_start_date: weekStartDate,
        status: 'proposed',
        created_by: familyProfile.primary_user_id,
        approved_by: [],
        rejected_by: [],
        meals: assignments,
        shopping_list: shoppingList,
        family_feedback: []
      };

      // Sauvegarder le plan
      await this.saveFamilyMealPlan(familyPlan);

      // Déclencher le processus de validation famille
      await this.initiatefamilyApproval(familyPlan);

      return familyPlan;
    } catch (error) {
      console.error('Failed to generate family meal plan:', error);
      throw error;
    }
  }

  /**
   * Gère les situations de panique en mode famille
   */
  async handleFamilyPanic(
    familyId: string,
    panicData: {
      triggeredBy: string;
      panicType: FamilyPanicEvent['panic_type'];
      stressLevel: number;
      affectedMembers?: string[];
      timeConstraint?: number;
      budgetConstraint?: number;
    }
  ): Promise<{
    solutions: Array<{
      id: string;
      title: string;
      description: string;
      accommodates_members: string[];
      estimated_time: number;
      estimated_cost: number;
      family_satisfaction_score: number;
      compromise_factors: string[];
    }>;
    votingRequired: boolean;
    decisionDeadline: Date;
  }> {
    try {
      const familyProfile = await this.getFamilyProfile(familyId);
      if (!familyProfile) throw new Error('Family profile not found');

      // Créer l'événement de panique
      const panicEvent: FamilyPanicEvent = {
        id: `panic_${Date.now()}_${familyId}`,
        family_id: familyId,
        triggered_by: panicData.triggeredBy,
        panic_type: panicData.panicType,
        stress_indicators: {
          time_pressure: Math.min(5, panicData.stressLevel),
          family_tension: this.assessFamilyTension(familyProfile, panicData),
          resource_shortage: this.assessResourceShortage(panicData)
        },
        affected_members: panicData.affectedMembers || familyProfile.members.map(m => m.id),
        solution_preferences: [],
        family_consensus: {
          voting_enabled: familyProfile.household_rules.meal_decision_maker === 'vote',
          decision_deadline: new Date(Date.now() + (familyProfile.communication_preferences.decision_timeout_minutes * 60 * 1000)),
          current_votes: {}
        },
        resolution: {
          chosen_solution: '',
          compromise_factors: [],
          satisfaction_scores: {},
          lessons_learned: []
        }
      };

      // Générer des solutions adaptées à la famille
      const solutions = await this.generateFamilyPanicSolutions(familyProfile, panicEvent, {
        timeConstraint: panicData.timeConstraint,
        budgetConstraint: panicData.budgetConstraint
      });

      // Déterminer si un vote est nécessaire
      const votingRequired = this.determineIfVotingRequired(familyProfile, solutions);

      return {
        solutions,
        votingRequired,
        decisionDeadline: panicEvent.family_consensus.decision_deadline
      };
    } catch (error) {
      console.error('Failed to handle family panic:', error);
      throw error;
    }
  }

  /**
   * Adapte une recette pour tous les membres de la famille
   */
  async adaptRecipeForFamily(
    recipeId: string,
    familyId: string,
    options: {
      handleDietaryRestrictions: boolean;
      scalePortion: boolean;
      substituteIngredients: boolean;
    } = {
      handleDietaryRestrictions: true,
      scalePortion: true,
      substituteIngredients: true
    }
  ): Promise<{
    adaptedRecipe: any;
    memberAlternatives: Array<{
      memberId: string;
      modifications: string[];
      alternativeRecipe?: any;
    }>;
    familyNutritionAnalysis: {
      meetsAllRequirements: boolean;
      warnings: string[];
      memberSpecificNotes: Record<string, string>;
    };
  }> {
    try {
      const familyProfile = await this.getFamilyProfile(familyId);
      if (!familyProfile) throw new Error('Family profile not found');

      // Récupérer la recette originale
      const originalRecipe = await this.getRecipe(recipeId);
      if (!originalRecipe) throw new Error('Recipe not found');

      // Analyser les besoins de chaque membre
      const memberNeeds = this.analyzeMemberNeedsForRecipe(familyProfile.members, originalRecipe);

      // Adapter la recette principale
      let adaptedRecipe = { ...originalRecipe };
      
      if (options.scalePortion) {
        adaptedRecipe = this.scaleRecipeForFamily(adaptedRecipe, familyProfile.members.length);
      }

      // Gérer les restrictions alimentaires communes
      if (options.handleDietaryRestrictions) {
        adaptedRecipe = await this.handleCommonDietaryRestrictions(
          adaptedRecipe, 
          familyProfile.members
        );
      }

      // Créer des alternatives pour les membres ayant des besoins spécifiques
      const memberAlternatives = [];
      
      if (options.substituteIngredients) {
        for (const member of familyProfile.members) {
          const needs = memberNeeds[member.id];
          
          if (needs.requiresAlternative) {
            const modifications = await this.generateMemberModifications(
              originalRecipe, 
              member, 
              needs
            );
            
            memberAlternatives.push({
              memberId: member.id,
              modifications: modifications.changes,
              alternativeRecipe: modifications.alternativeRecipe
            });
          }
        }
      }

      // Analyse nutritionnelle pour la famille
      const nutritionAnalysis = await this.analyzeFamilyNutrition(
        adaptedRecipe,
        memberAlternatives,
        familyProfile.members
      );

      return {
        adaptedRecipe,
        memberAlternatives,
        familyNutritionAnalysis: nutritionAnalysis
      };
    } catch (error) {
      console.error('Failed to adapt recipe for family:', error);
      throw error;
    }
  }

  /**
   * Coordonne les actions rapides en mode famille
   */
  async coordinateFamilyQuickAction(
    familyId: string,
    actionType: string,
    initiatedBy: string,
    params?: any
  ): Promise<{
    coordination_needed: boolean;
    affected_members: string[];
    required_approvals: string[];
    estimated_impact: {
      time_saved: number;
      cost_impact: number;
      satisfaction_impact: Record<string, number>;
    };
    execution_plan: {
      immediate_actions: string[];
      member_tasks: Array<{
        member_id: string;
        task: string;
        deadline: Date;
      }>;
      coordination_checkpoints: string[];
    };
  }> {
    try {
      const familyProfile = await this.getFamilyProfile(familyId);
      if (!familyProfile) throw new Error('Family profile not found');

      // Analyser l'impact de l'action sur la famille
      const impact = await this.analyzeActionImpactOnFamily(
        actionType, 
        familyProfile, 
        params
      );

      // Déterminer qui doit être impliqué
      const coordination = this.determineCoordinationNeeds(
        actionType,
        familyProfile,
        impact
      );

      // Créer le plan d'exécution
      const executionPlan = this.createFamilyExecutionPlan(
        actionType,
        familyProfile,
        coordination,
        initiatedBy
      );

      return {
        coordination_needed: coordination.required,
        affected_members: coordination.affectedMembers,
        required_approvals: coordination.requiredApprovals,
        estimated_impact: impact,
        execution_plan: executionPlan
      };
    } catch (error) {
      console.error('Failed to coordinate family quick action:', error);
      throw error;
    }
  }

  // === MÉTHODES PRIVÉES ===

  private analyzeCollectivePreferences(members: FamilyMember[]): FamilyProfile['collective_preferences'] {
    const allCuisines = members.flatMap(m => m.preferences.cuisines);
    const allDislikes = members.flatMap(m => m.preferences.dislikes);
    
    // Cuisines communes (aimées par au moins 50% des membres)
    const cuisineCounts: Record<string, number> = {};
    allCuisines.forEach(cuisine => {
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    });
    
    const commonCuisines = Object.entries(cuisineCounts)
      .filter(([, count]) => count >= Math.ceil(members.length / 2))
      .map(([cuisine]) => cuisine);

    // Ingrédients bannis (détestés par au moins un membre)
    const bannedIngredients = [...new Set(allDislikes)];

    return {
      common_cuisines: commonCuisines,
      banned_ingredients: bannedIngredients,
      default_portions: members.length,
      meal_timing_flexibility: 3 // Valeur par défaut
    };
  }

  private async generateInitialFamilyPlan(familyProfile: FamilyProfile): Promise<void> {
    const nextMonday = this.getNextMonday();
    await this.generateFamilyMealPlan(familyProfile.id, nextMonday, {
      considerAllPreferences: true,
      allowAlternatives: true,
      maxPrepTime: familyProfile.household_rules.max_prep_time,
      budgetConstraint: familyProfile.household_rules.budget_per_week
    });
  }

  private analyzeFamilyConstraints(familyProfile: FamilyProfile): any {
    return {
      dietary_restrictions: familyProfile.members.flatMap(m => m.dietary_restrictions),
      allergies: familyProfile.members.flatMap(m => m.allergies),
      max_prep_time: familyProfile.household_rules.max_prep_time,
      budget_limit: familyProfile.household_rules.budget_per_week,
      skill_levels: familyProfile.members.map(m => m.cooking_skills),
      time_availability: familyProfile.members.flatMap(m => m.schedule.availability)
    };
  }

  private async generateWeeklyMeals(
    familyProfile: FamilyProfile,
    constraints: any,
    options: any
  ): Promise<any[]> {
    // Simulé - génération de repas optimisés pour la famille
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    
    const meals = [];
    
    for (const day of days) {
      for (const mealType of mealTypes) {
        // Skip breakfast and lunch on weekdays for simplicity
        if ((mealType === 'breakfast' || mealType === 'lunch') && 
            !['saturday', 'sunday'].includes(day)) {
          continue;
        }
        
        meals.push({
          day,
          meal_type: mealType,
          primary_recipe_id: `recipe_${day}_${mealType}`,
          adaptations: [],
          assignment: {
            cook: this.assignCook(familyProfile, day),
            helpers: this.assignHelpers(familyProfile, day),
            prep_time: '18:00'
          },
          nutrition_analysis: {
            meets_all_requirements: true,
            warnings: [],
            member_specific_notes: {}
          }
        });
      }
    }
    
    return meals;
  }

  private async generateFamilyShoppingList(meals: any[], familyProfile: FamilyProfile): Promise<any> {
    return {
      items: [
        {
          ingredient: 'Pâtes',
          quantity: 2,
          unit: 'kg',
          for_members: familyProfile.members.map(m => m.id),
          alternatives: ['riz', 'quinoa'],
          priority: 'essential' as const
        },
        {
          ingredient: 'Tomates',
          quantity: 1.5,
          unit: 'kg',
          for_members: familyProfile.members.map(m => m.id),
          alternatives: ['tomates en conserve'],
          priority: 'preferred' as const
        }
      ],
      estimated_cost: familyProfile.household_rules.budget_per_week * 0.8,
      assigned_shopper: familyProfile.primary_user_id
    };
  }

  private assignCookingResponsibilities(meals: any[], familyProfile: FamilyProfile): any[] {
    return meals.map(meal => ({
      ...meal,
      assignment: {
        cook: this.assignCook(familyProfile, meal.day),
        helpers: this.assignHelpers(familyProfile, meal.day),
        prep_time: '18:00'
      }
    }));
  }

  private assignCook(familyProfile: FamilyProfile, day: string): string {
    // Rotation des responsabilités ou assignation selon les compétences
    const availableMembers = familyProfile.members.filter(m => 
      m.role !== 'child' && m.cooking_skills >= 2
    );
    
    return availableMembers.length > 0 
      ? availableMembers[0].id 
      : familyProfile.primary_user_id;
  }

  private assignHelpers(familyProfile: FamilyProfile, day: string): string[] {
    return familyProfile.members
      .filter(m => m.role !== 'child' || (m.age && m.age >= 10))
      .slice(0, 2)
      .map(m => m.id);
  }

  private async generateFamilyPanicSolutions(
    familyProfile: FamilyProfile,
    panicEvent: FamilyPanicEvent,
    constraints: any
  ): Promise<any[]> {
    return [
      {
        id: 'family_pasta_solution',
        title: 'Pâtes express famille',
        description: 'Pâtes simples adaptées à tous les goûts',
        accommodates_members: familyProfile.members.map(m => m.id),
        estimated_time: 15,
        estimated_cost: 8,
        family_satisfaction_score: 0.85,
        compromise_factors: ['Rapide', 'Économique', 'Plaît aux enfants']
      },
      {
        id: 'family_delivery_solution',
        title: 'Commande groupée',
        description: 'Plusieurs plats de différents restaurants',
        accommodates_members: familyProfile.members.map(m => m.id),
        estimated_time: 35,
        estimated_cost: 45,
        family_satisfaction_score: 0.92,
        compromise_factors: ['Satisfait tous les goûts', 'Zéro effort']
      }
    ];
  }

  private assessFamilyTension(familyProfile: FamilyProfile, panicData: any): number {
    // Évaluer le niveau de tension familiale basé sur les conflits récents, etc.
    return Math.min(5, panicData.stressLevel + 1);
  }

  private assessResourceShortage(panicData: any): number {
    let shortage = 1;
    if (panicData.timeConstraint && panicData.timeConstraint < 30) shortage += 2;
    if (panicData.budgetConstraint && panicData.budgetConstraint < 20) shortage += 2;
    return Math.min(5, shortage);
  }

  private determineIfVotingRequired(familyProfile: FamilyProfile, solutions: any[]): boolean {
    return familyProfile.household_rules.meal_decision_maker === 'vote' && 
           solutions.length > 1 &&
           familyProfile.members.filter(m => m.age && m.age >= 12).length > 1;
  }

  private getNextMonday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday;
  }

  // Méthodes de base de données (à implémenter)
  private async saveFamilyProfile(profile: FamilyProfile): Promise<void> {
    // En production, sauvegarder dans Supabase
    console.log('Family profile saved:', profile.id);
  }

  private async getFamilyProfile(familyId: string): Promise<FamilyProfile | null> {
    // En production, récupérer depuis Supabase
    return null; // Simulé
  }

  private async saveFamilyMealPlan(plan: FamilyMealPlan): Promise<void> {
    // En production, sauvegarder dans Supabase
    console.log('Family meal plan saved:', plan.id);
  }

  private async initiateamilyApproval(plan: FamilyMealPlan): Promise<void> {
    // Déclencher les notifications aux membres famille
    console.log('Family approval process initiated for plan:', plan.id);
  }

  private async getRecipe(recipeId: string): Promise<any> {
    // Récupérer la recette depuis la base
    return { id: recipeId, name: 'Example Recipe' };
  }

  private analyzeMemberNeedsForRecipe(members: FamilyMember[], recipe: any): Record<string, any> {
    const needs: Record<string, any> = {};
    
    members.forEach(member => {
      needs[member.id] = {
        requiresAlternative: member.dietary_restrictions.length > 0 || member.allergies.length > 0,
        restrictions: [...member.dietary_restrictions, ...member.allergies],
        preferences: member.preferences
      };
    });
    
    return needs;
  }

  private scaleRecipeForFamily(recipe: any, familySize: number): any {
    // Multiplier les quantités d'ingrédients
    return {
      ...recipe,
      servings: familySize,
      ingredients: recipe.ingredients?.map((ing: any) => ({
        ...ing,
        quantity: ing.quantity * (familySize / (recipe.servings || 4))
      }))
    };
  }

  private async handleCommonDietaryRestrictions(recipe: any, members: FamilyMember[]): Promise<any> {
    // Adapter la recette pour les restrictions communes
    return recipe;
  }

  private async generateMemberModifications(recipe: any, member: FamilyMember, needs: any): Promise<any> {
    return {
      changes: [`Substitution pour ${member.name}`],
      alternativeRecipe: null
    };
  }

  private async analyzeFamilyNutrition(recipe: any, alternatives: any[], members: FamilyMember[]): Promise<any> {
    return {
      meetsAllRequirements: true,
      warnings: [],
      memberSpecificNotes: {}
    };
  }

  private async analyzeActionImpactOnFamily(actionType: string, family: FamilyProfile, params?: any): Promise<any> {
    return {
      time_saved: 30,
      cost_impact: 0,
      satisfaction_impact: Object.fromEntries(
        family.members.map(m => [m.id, 4])
      )
    };
  }

  private determineCoordinationNeeds(actionType: string, family: FamilyProfile, impact: any): any {
    return {
      required: true,
      affectedMembers: family.members.map(m => m.id),
      requiredApprovals: [family.primary_user_id]
    };
  }

  private createFamilyExecutionPlan(actionType: string, family: FamilyProfile, coordination: any, initiator: string): any {
    return {
      immediate_actions: ['Notifier les membres'],
      member_tasks: family.members.map(member => ({
        member_id: member.id,
        task: `Participer à ${actionType}`,
        deadline: new Date(Date.now() + 30 * 60 * 1000)
      })),
      coordination_checkpoints: ['Validation initiale', 'Confirmation finale']
    };
  }
}

// Export de l'instance par défaut
export const familyModeService = new FamilyModeService();