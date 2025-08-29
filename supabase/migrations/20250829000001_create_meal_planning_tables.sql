-- ====================================================================
-- MEAL PLANNING TABLES - Core Planning Engine
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Weekly Meal Plans - Plans hebdomadaires
CREATE TABLE IF NOT EXISTS public.weekly_meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'completed')) DEFAULT 'draft',
    total_estimated_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Résumé nutritionnel agrégé
    nutritional_summary JSONB DEFAULT '{
        "totalCalories": 0,
        "averageDailyCalories": 0,
        "macroDistribution": {
            "protein": {"grams": 0, "percentage": 0},
            "carbs": {"grams": 0, "percentage": 0},
            "fat": {"grams": 0, "percentage": 0}
        },
        "micronutrientHighlights": {
            "strong": [],
            "weak": []
        },
        "varietyScore": 0,
        "healthScore": 0
    }',
    
    -- Liste de courses optimisée
    shopping_list JSONB DEFAULT '{
        "totalCost": 0,
        "estimatedSavings": 0,
        "items": [],
        "storeRecommendations": [],
        "bulkBuyingOpportunities": [],
        "seasonalSubstitutions": []
    }',
    
    -- Options alternatives
    alternative_options JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte unicité par utilisateur et semaine
    UNIQUE(user_id, week_start_date)
);

-- 2. Meal Plan Entries - Entrées du planning
CREATE TABLE IF NOT EXISTS public.meal_plan_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_plan_id UUID REFERENCES public.weekly_meal_plans(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6) NOT NULL,
    meal_type VARCHAR(20) CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')) NOT NULL,
    recipe_id UUID REFERENCES public.recipes_catalog(id) ON DELETE SET NULL,
    recipe_name VARCHAR(255) NOT NULL,
    servings INTEGER DEFAULT 1,
    
    -- Coûts et temps
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    prep_time INTEGER DEFAULT 0,
    cook_time INTEGER DEFAULT 0,
    
    -- Information nutritionnelle
    nutritional_info JSONB DEFAULT '{
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0
    }',
    
    -- Ingrédients requis et manquants
    required_ingredients JSONB DEFAULT '[]',
    missing_ingredients JSONB DEFAULT '[]',
    
    -- Notes et conseils de préparation
    notes TEXT,
    preparation_tips JSONB DEFAULT '[]', -- [{type, message, daysInAdvance, priority}]
    
    -- Score de confiance (0-1)
    confidence DECIMAL(3,2) DEFAULT 0.7,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte unicité par plan, jour et type de repas
    UNIQUE(meal_plan_id, day_of_week, meal_type)
);

-- 3. User Meal Preferences - Préférences utilisateur
CREATE TABLE IF NOT EXISTS public.user_meal_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Restrictions et allergies
    dietary_restrictions TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    cuisine_preferences TEXT[] DEFAULT '{}',
    
    -- Niveau de compétence
    cooking_skill_level VARCHAR(20) CHECK (cooking_skill_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
    
    -- Contraintes de temps
    max_prep_time INTEGER DEFAULT 30,
    max_cook_time INTEGER DEFAULT 45,
    busy_days TEXT[] DEFAULT '{}',
    
    -- Taille famille et budget
    family_size INTEGER DEFAULT 2,
    weekly_budget DECIMAL(10,2) DEFAULT 100,
    strict_budget_mode BOOLEAN DEFAULT FALSE,
    
    -- Objectifs nutritionnels
    nutritional_goals JSONB DEFAULT '{
        "targetCalories": null,
        "macroRatios": null
    }',
    
    -- Équipement disponible
    equipment_available TEXT[] DEFAULT '{}',
    
    -- Préférences shopping
    prefer_local BOOLEAN DEFAULT FALSE,
    organic_preference VARCHAR(10) CHECK (organic_preference IN ('none', 'some', 'all')) DEFAULT 'some',
    max_trip_frequency INTEGER DEFAULT 2,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Meal Planning Templates - Templates réutilisables
CREATE TABLE IF NOT EXISTS public.meal_planning_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Structure du template
    template_data JSONB NOT NULL, -- Structure complète du planning
    
    -- Métadonnées
    tags TEXT[] DEFAULT '{}',
    estimated_weekly_cost DECIMAL(10,2),
    average_daily_calories INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Meal Planning Analytics - Métriques et apprentissage
CREATE TABLE IF NOT EXISTS public.meal_planning_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start_date DATE NOT NULL,
    
    -- Métriques d'utilisation
    plan_completion_rate DECIMAL(3,2) DEFAULT 0,
    recipes_cooked INTEGER DEFAULT 0,
    recipes_skipped INTEGER DEFAULT 0,
    
    -- Métriques économiques
    planned_cost DECIMAL(10,2) DEFAULT 0,
    actual_cost DECIMAL(10,2) DEFAULT 0,
    savings_achieved DECIMAL(10,2) DEFAULT 0,
    
    -- Métriques nutritionnelles
    nutrition_goals_met BOOLEAN DEFAULT FALSE,
    average_health_score DECIMAL(3,2) DEFAULT 0,
    
    -- Feedback et apprentissage
    user_satisfaction_score INTEGER CHECK (user_satisfaction_score >= 1 AND user_satisfaction_score <= 5),
    favorite_recipes UUID[] DEFAULT '{}',
    rejected_recipes UUID[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte unicité par utilisateur et semaine
    UNIQUE(user_id, week_start_date)
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================================

-- Weekly Meal Plans
CREATE INDEX idx_weekly_meal_plans_user_date ON public.weekly_meal_plans(user_id, week_start_date DESC);
CREATE INDEX idx_weekly_meal_plans_status ON public.weekly_meal_plans(status) WHERE status = 'active';

-- Meal Plan Entries
CREATE INDEX idx_meal_entries_plan ON public.meal_plan_entries(meal_plan_id);
CREATE INDEX idx_meal_entries_recipe ON public.meal_plan_entries(recipe_id);
CREATE INDEX idx_meal_entries_day_type ON public.meal_plan_entries(day_of_week, meal_type);

-- User Preferences
CREATE INDEX idx_user_preferences_user ON public.user_meal_preferences(user_id);

-- Templates
CREATE INDEX idx_meal_templates_user ON public.meal_planning_templates(user_id);
CREATE INDEX idx_meal_templates_public ON public.meal_planning_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_meal_templates_tags ON public.meal_planning_templates USING gin(tags);

-- Analytics
CREATE INDEX idx_meal_analytics_user_date ON public.meal_planning_analytics(user_id, week_start_date DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.weekly_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meal_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_planning_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_planning_analytics ENABLE ROW LEVEL SECURITY;

-- Weekly Meal Plans Policies
CREATE POLICY "Users can manage their own meal plans" ON public.weekly_meal_plans
    FOR ALL USING (auth.uid() = user_id);

-- Meal Plan Entries Policies
CREATE POLICY "Users can manage their meal plan entries" ON public.meal_plan_entries
    FOR ALL USING (
        meal_plan_id IN (
            SELECT id FROM public.weekly_meal_plans 
            WHERE user_id = auth.uid()
        )
    );

-- User Preferences Policies
CREATE POLICY "Users can manage their own preferences" ON public.user_meal_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Templates Policies
CREATE POLICY "Users can view public templates" ON public.meal_planning_templates
    FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own templates" ON public.meal_planning_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.meal_planning_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.meal_planning_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Analytics Policies
CREATE POLICY "Users can manage their own analytics" ON public.meal_planning_analytics
    FOR ALL USING (auth.uid() = user_id);

-- ====================================================================
-- FUNCTIONS AND TRIGGERS
-- ====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meal_planning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_weekly_meal_plans_updated_at 
    BEFORE UPDATE ON public.weekly_meal_plans 
    FOR EACH ROW EXECUTE FUNCTION update_meal_planning_updated_at();

CREATE TRIGGER update_user_meal_preferences_updated_at 
    BEFORE UPDATE ON public.user_meal_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_meal_planning_updated_at();

CREATE TRIGGER update_meal_planning_templates_updated_at 
    BEFORE UPDATE ON public.meal_planning_templates 
    FOR EACH ROW EXECUTE FUNCTION update_meal_planning_updated_at();

-- Function to calculate meal plan totals
CREATE OR REPLACE FUNCTION calculate_meal_plan_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total cost and nutritional summary when entries change
    IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
        UPDATE public.weekly_meal_plans
        SET 
            total_estimated_cost = (
                SELECT COALESCE(SUM(estimated_cost), 0)
                FROM public.meal_plan_entries
                WHERE meal_plan_id = COALESCE(NEW.meal_plan_id, OLD.meal_plan_id)
            ),
            updated_at = NOW()
        WHERE id = COALESCE(NEW.meal_plan_id, OLD.meal_plan_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for automatic calculation
CREATE TRIGGER calculate_meal_plan_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.meal_plan_entries
    FOR EACH ROW EXECUTE FUNCTION calculate_meal_plan_totals();

-- ====================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ====================================================================

-- Popular recipes for meal planning
CREATE MATERIALIZED VIEW IF NOT EXISTS public.popular_meal_recipes AS
SELECT 
    r.id as recipe_id,
    r.title,
    r.prep_time,
    r.cook_time,
    r.difficulty,
    r.tags,
    COUNT(DISTINCT mpe.meal_plan_id) as usage_count,
    AVG(mpe.confidence) as avg_confidence,
    AVG(mpe.estimated_cost) as avg_cost
FROM public.recipes_catalog r
JOIN public.meal_plan_entries mpe ON r.id = mpe.recipe_id
GROUP BY r.id, r.title, r.prep_time, r.cook_time, r.difficulty, r.tags
ORDER BY usage_count DESC;

-- Create index on materialized view
CREATE INDEX idx_popular_meal_recipes_count ON public.popular_meal_recipes(usage_count DESC);

-- ====================================================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================================================

COMMENT ON TABLE public.weekly_meal_plans IS 'Plans de repas hebdomadaires avec optimisation nutritionnelle et budgétaire';
COMMENT ON TABLE public.meal_plan_entries IS 'Entrées détaillées pour chaque repas planifié';
COMMENT ON TABLE public.user_meal_preferences IS 'Préférences utilisateur pour la génération de plans personnalisés';
COMMENT ON TABLE public.meal_planning_templates IS 'Templates réutilisables de plans de repas';
COMMENT ON TABLE public.meal_planning_analytics IS 'Métriques et apprentissage pour amélioration continue';

COMMENT ON COLUMN public.meal_plan_entries.preparation_tips IS 'Conseils JSON: [{type: "defrost", message: "Sortir poulet", daysInAdvance: 1, priority: "high"}]';
COMMENT ON COLUMN public.weekly_meal_plans.nutritional_summary IS 'Résumé nutritionnel agrégé du plan complet';
COMMENT ON COLUMN public.weekly_meal_plans.shopping_list IS 'Liste de courses optimisée avec recommandations';