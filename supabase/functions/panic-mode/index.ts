import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PanicContext {
  userId: string;
  timeAvailable: number;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  familyMembers: number;
  currentLocation?: { lat: number; lng: number };
  inventory?: InventoryItem[];
  preferences?: UserPreferences;
  triggerType?: 'manual' | 'automatic' | 'time_based' | 'context_based' | 'shake' | 'gesture';
}

interface PanicSolution {
  id: string;
  type: 'instant' | 'delivery' | 'prepared' | 'restaurant';
  title: string;
  description: string;
  timeRequired: number;
  estimatedCost?: number;
  difficulty: 'trivial' | 'easy' | 'medium';
  confidence: number;
  steps?: string[];
  ingredients?: Array<{name: string; amount: number; unit: string}>;
  restaurant?: any;
  recipe?: any;
  category?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
}

interface UserPreferences {
  cuisines: string[];
  dietaryRestrictions: string[];
  budgetConstraints: {
    weeklyBudget: number;
    maxMealCost: number;
  };
  timeConstraints: {
    maxPrepTime: number;
    maxCookTime: number;
  };
  familySize: number;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Vérifications de sécurité
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse request body
    const { context } = await req.json() as { context: PanicContext };
    if (!context || !context.userId) {
      throw new Error('Invalid context provided');
    }

    const startTime = Date.now();
    console.log(`Panic mode triggered for user ${context.userId} with stress level ${context.stressLevel}`);

    // 1. Vérifier le cache de solutions pré-calculées en premier
    const cacheKey = generateContextHash(context);
    const cachedSolutions = await getCachedSolutions(supabase, context.userId, cacheKey);
    
    if (cachedSolutions && cachedSolutions.length > 0) {
      console.log(`Returning ${cachedSolutions.length} cached solutions`);
      await logPanicEvent(supabase, context, cachedSolutions, 'cache', startTime);
      
      return new Response(JSON.stringify({
        success: true,
        solutions: cachedSolutions,
        source: 'cache',
        generatedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Générer des solutions en parallèle avec timeout
    const solutionGenerators = [
      generateInstantSolutions(supabase, context),
      generateDeliverySolutions(supabase, context),
      generatePreparedSolutions(supabase, context)
    ];

    // Timeout de sécurité à 25 secondes
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Solution generation timeout')), 25000)
    );

    const results = await Promise.race([
      Promise.allSettled(solutionGenerators),
      timeoutPromise
    ]) as PromiseSettledResult<PanicSolution[]>[];

    // 3. Combiner toutes les solutions réussies
    const allSolutions: PanicSolution[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allSolutions.push(...result.value);
      } else {
        console.warn(`Solution generator ${index} failed:`, result.reason);
      }
    });

    // 4. Ranker et sélectionner les top 3
    const rankedSolutions = rankSolutions(allSolutions, context);
    const top3Solutions = rankedSolutions.slice(0, 3);

    // Si pas de solutions trouvées, utiliser les solutions d'urgence
    if (top3Solutions.length === 0) {
      const emergencySolutions = getEmergencySolutions(context);
      await logPanicEvent(supabase, context, emergencySolutions, 'emergency', startTime);
      
      return new Response(JSON.stringify({
        success: true,
        solutions: emergencySolutions,
        source: 'emergency',
        generatedAt: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
        warning: 'Used emergency fallback solutions'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Mettre en cache pour la prochaine fois (ne pas attendre)
    cacheSolutions(supabase, context.userId, cacheKey, top3Solutions)
      .catch(err => console.warn('Cache storage failed:', err));

    // 6. Vérifier la contrainte de temps
    const executionTime = Date.now() - startTime;
    if (executionTime > 30000) {
      console.error(`Panic resolution took ${executionTime}ms - exceeded 30s limit`);
    }

    // 7. Logger l'événement et retourner
    await logPanicEvent(supabase, context, top3Solutions, 'generated', startTime);

    return new Response(JSON.stringify({
      success: true,
      solutions: top3Solutions,
      source: 'generated',
      generatedAt: new Date().toISOString(),
      executionTimeMs: executionTime,
      metrics: {
        solutionsGenerated: allSolutions.length,
        solutionsReturned: top3Solutions.length,
        cacheHit: false
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Panic mode error:', error);

    // Solutions d'urgence absolue en cas d'erreur
    const emergencyFallback: PanicSolution[] = [
      {
        id: 'emergency-pizza-fallback',
        type: 'delivery',
        title: 'Commander une pizza',
        description: 'Solution de secours fiable',
        timeRequired: 25,
        difficulty: 'trivial',
        confidence: 90,
        estimatedCost: 15,
        steps: ['Téléphoner à la pizzeria', 'Commander votre pizza préférée', 'Attendre la livraison'],
        category: 'emergency'
      },
      {
        id: 'emergency-pasta-fallback',
        type: 'instant',
        title: 'Pâtes express',
        description: 'Rapide avec les basiques du placard',
        timeRequired: 10,
        difficulty: 'trivial',
        confidence: 85,
        steps: ['Faire bouillir de l\'eau', 'Cuire les pâtes', 'Ajouter beurre/huile', 'Servir'],
        category: 'emergency'
      },
      {
        id: 'emergency-sandwich-fallback',
        type: 'instant',
        title: 'Sandwich simple',
        description: 'Pain + garniture disponible',
        timeRequired: 5,
        difficulty: 'trivial',
        confidence: 80,
        steps: ['Prendre du pain', 'Ajouter garniture', 'Assembler', 'Servir'],
        category: 'emergency'
      }
    ];

    return new Response(JSON.stringify({
      success: false,
      solutions: emergencyFallback,
      source: 'fallback',
      error: error.message,
      generatedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - (Date.now() - 1000) // Approximation
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // 200 car on fournit quand même des solutions
    });
  }
});

// === FONCTIONS UTILITAIRES ===

async function getCachedSolutions(
  supabase: any, 
  userId: string, 
  contextHash: string
): Promise<PanicSolution[] | null> {
  try {
    const { data, error } = await supabase
      .from('pre_computed_solutions')
      .select('solution_data, access_count')
      .eq('user_id', userId)
      .eq('context_hash', contextHash)
      .overlaps('validity_period', `[${new Date().toISOString()}, ${new Date().toISOString()}]`)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !data || data.length === 0) return null;

    // Incrémenter le compteur d'accès
    const solutionIds = data.map(d => d.id);
    await supabase
      .from('pre_computed_solutions')
      .update({ 
        access_count: data[0].access_count + 1,
        last_accessed: new Date().toISOString()
      })
      .in('id', solutionIds);

    return data.map(d => d.solution_data as PanicSolution);
  } catch (error) {
    console.warn('Failed to get cached solutions:', error);
    return null;
  }
}

async function cacheSolutions(
  supabase: any,
  userId: string,
  contextHash: string,
  solutions: PanicSolution[]
): Promise<void> {
  try {
    const validUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const validFrom = new Date();

    const cacheEntries = solutions.map((solution, index) => ({
      user_id: userId,
      solution_type: solution.type,
      solution_data: solution,
      validity_period: `[${validFrom.toISOString()}, ${validUntil.toISOString()}]`,
      context_hash: contextHash,
      context_factors: {
        priority: index,
        confidence: solution.confidence,
        category: solution.category
      },
      generation_cost_ms: Date.now() % 1000, // Approximation
      access_count: 0
    }));

    await supabase
      .from('pre_computed_solutions')
      .insert(cacheEntries);

    console.log(`Cached ${solutions.length} solutions for future use`);
  } catch (error) {
    console.warn('Failed to cache solutions:', error);
  }
}

async function generateInstantSolutions(
  supabase: any, 
  context: PanicContext
): Promise<PanicSolution[]> {
  const solutions: PanicSolution[] = [];

  try {
    // 1. Récupérer les templates d'urgence
    const { data: templates } = await supabase
      .from('emergency_meal_templates')
      .select('*')
      .eq('is_active', true)
      .lte('max_prep_time', context.timeAvailable || 15)
      .order('success_rate', { ascending: false })
      .limit(5);

    if (templates) {
      templates.forEach(template => {
        solutions.push({
          id: `instant-${template.id}`,
          type: 'instant',
          title: template.name,
          description: template.description || 'Recette express',
          timeRequired: template.max_prep_time + template.max_cook_time,
          difficulty: mapDifficulty(template.difficulty_level),
          confidence: calculateTemplateConfidence(template, context),
          steps: parseInstructions(template.instructions),
          ingredients: parseIngredients(template.ingredients_required),
          category: 'template'
        });
      });
    }

    // 2. Solutions universelles toujours disponibles
    solutions.push(
      {
        id: 'instant-pasta-aglio',
        type: 'instant',
        title: 'Pâtes Aglio e Olio',
        description: 'Pâtes à l\'huile d\'olive et à l\'ail',
        timeRequired: 8,
        difficulty: 'trivial',
        confidence: 95,
        steps: [
          'Faire bouillir l\'eau salée',
          'Cuire les pâtes selon l\'emballage',
          'Faire revenir l\'ail dans l\'huile',
          'Mélanger et servir'
        ],
        ingredients: [
          { name: 'Pâtes', amount: 100, unit: 'g' },
          { name: 'Huile d\'olive', amount: 3, unit: 'c. à soupe' },
          { name: 'Ail', amount: 2, unit: 'gousses' }
        ],
        category: 'universal'
      },
      {
        id: 'instant-omelette',
        type: 'instant',
        title: 'Omelette Express',
        description: 'Œufs battus avec ce que vous avez',
        timeRequired: 6,
        difficulty: 'trivial',
        confidence: 92,
        steps: [
          'Battre les œufs avec sel et poivre',
          'Ajouter garniture disponible',
          'Cuire dans la poêle 3-4 minutes',
          'Plier et servir'
        ],
        ingredients: [
          { name: 'Œufs', amount: 3, unit: 'pièces' },
          { name: 'Beurre', amount: 1, unit: 'c. à soupe' }
        ],
        category: 'universal'
      }
    );

    return solutions;
  } catch (error) {
    console.warn('Failed to generate instant solutions:', error);
    return solutions;
  }
}

async function generateDeliverySolutions(
  supabase: any, 
  context: PanicContext
): Promise<PanicSolution[]> {
  // En mode démo - dans une vraie implémentation, intégrer avec APIs de livraison
  if (!context.currentLocation) return [];

  const mockRestaurants: PanicSolution[] = [
    {
      id: 'delivery-pizza-mario',
      type: 'delivery',
      title: 'Pizza Mario',
      description: 'Pizzeria italienne - Livraison 25min',
      timeRequired: 25,
      difficulty: 'trivial',
      confidence: 90,
      estimatedCost: 12 * context.familyMembers,
      restaurant: {
        id: 'pizza-mario',
        name: 'Pizza Mario',
        cuisine: 'Italien',
        rating: 4.2
      },
      category: 'delivery'
    },
    {
      id: 'delivery-burger-station',
      type: 'delivery',
      title: 'Burger Station',
      description: 'Fast-food américain - Livraison 20min',
      timeRequired: 20,
      difficulty: 'trivial',
      confidence: 85,
      estimatedCost: 10 * context.familyMembers,
      restaurant: {
        id: 'burger-station',
        name: 'Burger Station',
        cuisine: 'Américain',
        rating: 3.9
      },
      category: 'delivery'
    }
  ];

  // Filtrer selon les préférences et contraintes
  return mockRestaurants.filter(restaurant => {
    if (context.preferences?.budgetConstraints.maxMealCost && 
        restaurant.estimatedCost! > context.preferences.budgetConstraints.maxMealCost) {
      return false;
    }
    
    if (restaurant.timeRequired > (context.timeAvailable || 45)) {
      return false;
    }

    return true;
  });
}

async function generatePreparedSolutions(
  supabase: any, 
  context: PanicContext
): Promise<PanicSolution[]> {
  try {
    // Chercher les plats préparés dans l'inventaire
    const { data: preparedMeals } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', context.userId)
      .eq('location', 'freezer')
      .or('category.eq.prepared_meals,category.eq.frozen_meals')
      .gt('quantity', 0)
      .limit(3);

    if (!preparedMeals || preparedMeals.length === 0) {
      return [];
    }

    return preparedMeals.map(meal => ({
      id: `prepared-${meal.id}`,
      type: 'prepared' as const,
      title: meal.name,
      description: 'Plat préparé du congélateur',
      timeRequired: 15, // Temps moyen de décongélation + réchauffage
      difficulty: 'trivial' as const,
      confidence: 100,
      steps: [
        'Sortir du congélateur',
        'Percer le film si nécessaire',
        'Réchauffer au micro-ondes selon instructions',
        'Laisser reposer 1 minute'
      ],
      category: 'prepared'
    }));
  } catch (error) {
    console.warn('Failed to generate prepared solutions:', error);
    return [];
  }
}

function rankSolutions(solutions: PanicSolution[], context: PanicContext): PanicSolution[] {
  return solutions.sort((a, b) => {
    const scoreA = calculateSolutionScore(a, context);
    const scoreB = calculateSolutionScore(b, context);
    return scoreB - scoreA;
  });
}

function calculateSolutionScore(solution: PanicSolution, context: PanicContext): number {
  let score = solution.confidence;
  
  // Bonus pour rapidité
  if (solution.timeRequired <= 10) score += 25;
  else if (solution.timeRequired <= 20) score += 15;
  else if (solution.timeRequired <= 30) score += 5;
  
  // Bonus pour simplicité
  if (solution.difficulty === 'trivial') score += 20;
  else if (solution.difficulty === 'easy') score += 10;
  
  // Ajustements selon le stress
  if (context.stressLevel >= 4) {
    if (solution.type === 'instant') score += 30;
    if (solution.type === 'prepared') score += 25;
    if (solution.type === 'delivery') score += 10;
  }
  
  // Malus pour coût élevé
  if (solution.estimatedCost && solution.estimatedCost > 25) {
    score -= 15;
  }
  
  // Contraintes temporelles
  if (context.timeAvailable && solution.timeRequired > context.timeAvailable) {
    score -= 50;
  }
  
  return Math.min(100, Math.max(0, score));
}

function getEmergencySolutions(context: PanicContext): PanicSolution[] {
  return [
    {
      id: 'emergency-cereals',
      type: 'instant',
      title: 'Céréales ou tartines',
      description: 'Solution rapide et simple',
      timeRequired: 2,
      difficulty: 'trivial',
      confidence: 100,
      steps: ['Sortir céréales et lait', 'Servir dans un bol'],
      category: 'emergency'
    },
    {
      id: 'emergency-delivery',
      type: 'delivery',
      title: 'Commander à emporter',
      description: 'Téléphoner au restaurant le plus proche',
      timeRequired: 30,
      difficulty: 'trivial',
      confidence: 95,
      estimatedCost: 15,
      steps: ['Chercher un restaurant proche', 'Téléphoner', 'Commander', 'Aller chercher ou attendre'],
      category: 'emergency'
    }
  ];
}

async function logPanicEvent(
  supabase: any,
  context: PanicContext,
  solutions: PanicSolution[],
  source: string,
  startTime: number
): Promise<void> {
  try {
    await supabase
      .from('panic_events')
      .insert({
        user_id: context.userId,
        trigger_type: context.triggerType || 'manual',
        user_stress_level: context.stressLevel,
        family_members_present: context.familyMembers,
        solutions_offered: solutions.map(s => ({
          id: s.id,
          type: s.type,
          title: s.title,
          confidence: s.confidence
        })),
        time_to_resolution: Math.floor((Date.now() - startTime) / 1000),
        generation_time_ms: Date.now() - startTime,
        success: solutions.length > 0,
        context_data: {
          timeAvailable: context.timeAvailable,
          hasLocation: !!context.currentLocation,
          solutionSource: source,
          timestamp: new Date().toISOString()
        }
      });

    console.log(`Logged panic event for user ${context.userId}`);
  } catch (error) {
    console.warn('Failed to log panic event:', error);
  }
}

// Fonctions utilitaires

function generateContextHash(context: PanicContext): string {
  const hashInput = JSON.stringify({
    stressLevel: context.stressLevel,
    timeAvailable: context.timeAvailable,
    familyMembers: context.familyMembers,
    hasLocation: !!context.currentLocation
  });

  // Hash simple (en production, utiliser algo plus robuste)
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function mapDifficulty(level: string): 'trivial' | 'easy' | 'medium' {
  switch (level?.toLowerCase()) {
    case 'trivial': return 'trivial';
    case 'easy': return 'easy';
    case 'medium': return 'medium';
    default: return 'easy';
  }
}

function calculateTemplateConfidence(template: any, context: PanicContext): number {
  let confidence = (template.success_rate || 0.8) * 100;
  
  if (template.max_prep_time <= 10) confidence += 10;
  if (template.difficulty_level === 'trivial') confidence += 15;
  if (context.stressLevel >= 4 && template.max_prep_time <= 5) confidence += 20;
  
  return Math.min(100, confidence);
}

function parseInstructions(instructions: string): string[] {
  if (!instructions) return [];
  return instructions.split('\n')
    .map(step => step.trim())
    .filter(step => step.length > 0)
    .slice(0, 4); // Max 4 étapes pour panic mode
}

function parseIngredients(ingredientsJson: any): Array<{name: string; amount: number; unit: string}> {
  try {
    if (typeof ingredientsJson === 'string') {
      ingredientsJson = JSON.parse(ingredientsJson);
    }
    
    if (Array.isArray(ingredientsJson)) {
      return ingredientsJson.map(ing => ({
        name: ing.name || '',
        amount: ing.amount || 0,
        unit: ing.unit || ''
      }));
    }
    
    return [];
  } catch {
    return [];
  }
}

console.log('Panic Mode Edge Function initialized');