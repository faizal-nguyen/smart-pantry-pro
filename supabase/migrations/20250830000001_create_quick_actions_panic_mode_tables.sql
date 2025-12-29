-- PRP-032.3: Quick Actions & Panic Mode - Database Schema
-- Comprehensive system for emergency meal planning and rapid actions

-- ====================================================================
-- 1. PANIC EVENTS TRACKING
-- ====================================================================

-- Table pour tracking des panic events
CREATE TABLE IF NOT EXISTS public.panic_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Trigger information
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('manual', 'automatic', 'time_based', 'context_based', 'shake', 'gesture')),
    trigger_time TIMESTAMPTZ DEFAULT NOW(),
    
    -- Resolution details
    solution_selected VARCHAR(50), -- instant, delivery, prepared, custom, abandoned
    time_to_resolution INTEGER, -- en secondes
    user_stress_level INTEGER CHECK (user_stress_level BETWEEN 1 AND 5),
    success BOOLEAN DEFAULT FALSE,
    feedback TEXT,
    
    -- Context data (JSON for flexibility)
    context_data JSONB DEFAULT '{}', -- {weather, time, day, location, family_size, inventory_status}
    
    -- Solutions offered
    solutions_offered JSONB DEFAULT '[]', -- Array of solution objects
    solution_details JSONB DEFAULT '{}', -- Detailed info about selected solution
    
    -- Performance metrics
    generation_time_ms INTEGER, -- Time to generate solutions
    user_interaction_time_ms INTEGER, -- Time user spent choosing
    
    -- Family mode data
    family_members_present INTEGER DEFAULT 1,
    dietary_constraints_active TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. QUICK ACTIONS USAGE
-- ====================================================================

-- Table pour les quick actions
CREATE TABLE IF NOT EXISTS public.quick_actions_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'repeat_week', 'survival_mode', 'empty_fridge', 'reset_week', 
        'smart_suggest', 'batch_cooking', 'family_mode_toggle', 'quick_plan'
    )),
    
    -- Performance metrics
    execution_time_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    
    -- Results
    result_data JSONB DEFAULT '{}', -- What was generated/changed
    user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
    
    -- Context
    trigger_method VARCHAR(30) CHECK (trigger_method IN ('button', 'shortcut', 'gesture', 'voice', 'auto')),
    family_size INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. PRE-COMPUTED SOLUTIONS CACHE
-- ====================================================================

-- Table pour les solutions pré-calculées
CREATE TABLE IF NOT EXISTS public.pre_computed_solutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Solution metadata
    solution_type VARCHAR(50) NOT NULL CHECK (solution_type IN ('instant', 'delivery', 'prepared', 'emergency')),
    solution_data JSONB NOT NULL,
    
    -- Validity and context
    validity_period TSTZRANGE NOT NULL,
    context_hash VARCHAR(64) NOT NULL, -- Hash du contexte pour invalidation
    context_factors JSONB DEFAULT '{}', -- Factors that invalidate this solution
    
    -- Performance optimization
    generation_cost_ms INTEGER, -- How long it took to generate
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ,
    
    -- Family considerations
    family_size_range INT4RANGE, -- Valid for which family sizes
    dietary_restrictions TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 4. PANIC PREFERENCES
-- ====================================================================

-- Table pour les préférences de panic mode
CREATE TABLE IF NOT EXISTS public.panic_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Time constraints
    max_cooking_time INTEGER DEFAULT 15, -- minutes
    preferred_solution_type VARCHAR(50) DEFAULT 'instant' CHECK (preferred_solution_type IN ('instant', 'delivery', 'prepared', 'any')),
    
    -- Favorites and blocked items
    favorite_panic_recipes UUID[] DEFAULT '{}', -- recettes favorites pour panic
    blocked_restaurants UUID[] DEFAULT '{}', -- restos à éviter
    emergency_contacts JSONB DEFAULT '[]', -- [{name, phone, can_help_with}]
    
    -- Auto-trigger settings
    auto_trigger_enabled BOOLEAN DEFAULT TRUE,
    auto_trigger_time TIME DEFAULT '18:00',
    notification_advance INTEGER DEFAULT 30, -- minutes avant auto-trigger
    auto_trigger_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- 1=Monday, 7=Sunday
    
    -- Stress management
    stress_level_threshold INTEGER DEFAULT 3, -- Auto-suggest when stress >= this
    preferred_communication_style VARCHAR(20) DEFAULT 'friendly' CHECK (preferred_communication_style IN ('calm', 'friendly', 'direct', 'encouraging')),
    
    -- Family mode preferences
    family_panic_coordinator UUID REFERENCES auth.users(id), -- Who gets notified for family panics
    children_ages INTEGER[] DEFAULT '{}',
    family_dietary_restrictions TEXT[] DEFAULT '{}',
    emergency_meal_budget DECIMAL(5,2) DEFAULT 25.00,
    
    -- Location and delivery
    default_location JSONB, -- {lat, lng, address}
    max_delivery_time INTEGER DEFAULT 45, -- minutes
    max_delivery_cost DECIMAL(5,2) DEFAULT 35.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 5. QUICK ACTION SHORTCUTS
-- ====================================================================

-- Table pour les raccourcis personnalisés
CREATE TABLE IF NOT EXISTS public.quick_action_shortcuts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    action_type VARCHAR(50) NOT NULL,
    shortcut_key VARCHAR(10), -- 'R', 'S', etc.
    gesture_pattern VARCHAR(50), -- 'swipe_up', 'long_press', 'shake'
    voice_command TEXT, -- "panic mode", "quick plan"
    
    -- Customization
    custom_parameters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique shortcuts per user
    UNIQUE(user_id, shortcut_key),
    UNIQUE(user_id, gesture_pattern),
    UNIQUE(user_id, voice_command)
);

-- ====================================================================
-- 6. EMERGENCY MEAL TEMPLATES
-- ====================================================================

-- Table pour les templates de repas d'urgence
CREATE TABLE IF NOT EXISTS public.emergency_meal_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(30) CHECK (category IN ('instant', 'basic', 'comfort', 'healthy', 'kids')),
    
    -- Requirements
    max_prep_time INTEGER NOT NULL, -- minutes
    max_cook_time INTEGER NOT NULL,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('trivial', 'easy', 'medium')),
    
    -- Recipe data
    ingredients_required JSONB NOT NULL, -- [{name, amount, unit, alternatives}]
    instructions TEXT NOT NULL,
    serving_size INTEGER DEFAULT 2,
    scaling_factor DECIMAL(3,2) DEFAULT 1.0, -- How easily it scales
    
    -- Suitability
    suitable_for_families BOOLEAN DEFAULT TRUE,
    dietary_compatible TEXT[] DEFAULT '{}', -- vegetarian, vegan, gluten-free, etc.
    allergen_warnings TEXT[] DEFAULT '{}',
    
    -- Performance metrics
    success_rate DECIMAL(3,2) DEFAULT 0.95, -- Based on user feedback
    average_prep_time INTEGER, -- Real-world average
    user_rating DECIMAL(2,1) DEFAULT 4.0,
    usage_count INTEGER DEFAULT 0,
    
    -- Seasonal availability
    seasonal_availability TEXT[] DEFAULT '{"spring","summer","fall","winter"}',
    ingredient_availability_score INTEGER DEFAULT 85, -- 0-100, how likely ingredients are available
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 7. PERFORMANCE INDEXES
-- ====================================================================

-- Panic events indexes
CREATE INDEX IF NOT EXISTS idx_panic_events_user_time ON public.panic_events(user_id, trigger_time DESC);
CREATE INDEX IF NOT EXISTS idx_panic_events_trigger_type ON public.panic_events(trigger_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panic_events_success ON public.panic_events(success, user_stress_level);
CREATE INDEX IF NOT EXISTS idx_panic_events_context ON public.panic_events USING gin(context_data);

-- Quick actions indexes
CREATE INDEX IF NOT EXISTS idx_quick_actions_user_type ON public.quick_actions_usage(user_id, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_actions_performance ON public.quick_actions_usage(execution_time_ms, success);
CREATE INDEX IF NOT EXISTS idx_quick_actions_trigger ON public.quick_actions_usage(trigger_method, created_at DESC);

-- Pre-computed solutions indexes
CREATE INDEX IF NOT EXISTS idx_pre_computed_validity ON public.pre_computed_solutions(user_id, validity_period);
CREATE INDEX IF NOT EXISTS idx_pre_computed_context ON public.pre_computed_solutions(context_hash, solution_type);
CREATE INDEX IF NOT EXISTS idx_pre_computed_access ON public.pre_computed_solutions(last_accessed DESC, access_count DESC);

-- Emergency templates indexes
CREATE INDEX IF NOT EXISTS idx_emergency_templates_category ON public.emergency_meal_templates(category, max_prep_time);
CREATE INDEX IF NOT EXISTS idx_emergency_templates_difficulty ON public.emergency_meal_templates(difficulty_level, success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_templates_family ON public.emergency_meal_templates(suitable_for_families, serving_size);

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Enable RLS on all user-specific tables
ALTER TABLE public.panic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_actions_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_computed_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_action_shortcuts ENABLE ROW LEVEL SECURITY;

-- Emergency templates are global, no RLS needed
-- ALTER TABLE public.emergency_meal_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own panic events" ON public.panic_events
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own quick actions usage" ON public.quick_actions_usage
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own pre-computed solutions" ON public.pre_computed_solutions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own panic preferences" ON public.panic_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own shortcuts" ON public.quick_action_shortcuts
    FOR ALL USING (auth.uid() = user_id);

-- Emergency templates - everyone can read, only admins can write
CREATE POLICY "Anyone can view emergency meal templates" ON public.emergency_meal_templates
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage emergency templates" ON public.emergency_meal_templates
    FOR ALL USING (
        (auth.jwt()::jsonb ->> 'role') = 'admin' OR
        ((auth.jwt()::jsonb -> 'user_metadata')::jsonb ->> 'role') = 'admin'
    );

-- ====================================================================
-- 9. UTILITY FUNCTIONS
-- ====================================================================

-- Function to clean up expired pre-computed solutions
CREATE OR REPLACE FUNCTION cleanup_expired_solutions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.pre_computed_solutions
    WHERE NOT validity_period @> NOW()
    AND created_at < NOW() - INTERVAL '7 days'; -- Keep recent ones for analysis
END;
$$ LANGUAGE plpgsql;

-- Function to update solution access stats
CREATE OR REPLACE FUNCTION increment_solution_access(solution_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.pre_computed_solutions
    SET 
        access_count = access_count + 1,
        last_accessed = NOW(),
        updated_at = NOW()
    WHERE id = solution_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user panic patterns
CREATE OR REPLACE FUNCTION get_user_panic_patterns(target_user_id UUID)
RETURNS TABLE(
    peak_hour INTEGER,
    peak_day INTEGER,
    avg_stress_level DECIMAL,
    preferred_solution VARCHAR,
    avg_resolution_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM trigger_time)::INTEGER) as peak_hour,
        MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM trigger_time)::INTEGER) as peak_day,
        AVG(user_stress_level::DECIMAL) as avg_stress_level,
        MODE() WITHIN GROUP (ORDER BY solution_selected) as preferred_solution,
        AVG(time_to_resolution)::INTEGER as avg_resolution_time
    FROM public.panic_events
    WHERE user_id = target_user_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND success = true;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 10. TRIGGERS
-- ====================================================================

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_panic_events_updated_at
    BEFORE UPDATE ON public.panic_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_panic_preferences_updated_at
    BEFORE UPDATE ON public.panic_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_computed_solutions_updated_at
    BEFORE UPDATE ON public.pre_computed_solutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_templates_updated_at
    BEFORE UPDATE ON public.emergency_meal_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 11. SEED DATA - Emergency Meal Templates
-- ====================================================================

INSERT INTO public.emergency_meal_templates (
    name, description, category, max_prep_time, max_cook_time, 
    difficulty_level, ingredients_required, instructions, serving_size,
    suitable_for_families, dietary_compatible
) VALUES
-- Ultra-quick options
(
    'Pâtes Aglio e Olio Express',
    'Le classique italien en 8 minutes chrono',
    'instant',
    3, 8,
    'trivial',
    '[{"name": "Spaghettis", "amount": 100, "unit": "g", "alternatives": ["pennes", "fusilli"]}, 
      {"name": "Huile d''olive", "amount": 3, "unit": "c. à soupe", "alternatives": []}, 
      {"name": "Ail", "amount": 2, "unit": "gousses", "alternatives": ["ail en poudre"]},
      {"name": "Sel", "amount": 1, "unit": "pincée", "alternatives": []},
      {"name": "Parmesan", "amount": 30, "unit": "g", "alternatives": ["gruyère"]}]',
    '1. Faire bouillir l''eau salée\n2. Cuire les pâtes selon paquet\n3. Chauffer huile + ail émincé\n4. Mélanger pâtes + huile\n5. Ajouter parmesan et servir',
    2,
    true,
    '{"vegetarian"}'
),
(
    'Omelette Garnie Express',
    'Œufs battus + tout ce qui traîne dans le frigo',
    'instant',
    2, 5,
    'trivial',
    '[{"name": "Œufs", "amount": 4, "unit": "pièces", "alternatives": []},
      {"name": "Beurre", "amount": 1, "unit": "c. à soupe", "alternatives": ["huile"]},
      {"name": "Sel", "amount": 1, "unit": "pincée", "alternatives": []},
      {"name": "Poivre", "amount": 1, "unit": "pincée", "alternatives": []},
      {"name": "Garniture au choix", "amount": 50, "unit": "g", "alternatives": ["fromage", "jambon", "légumes"]}]',
    '1. Battre les œufs avec sel/poivre\n2. Chauffer beurre dans la poêle\n3. Verser œufs, ajouter garniture\n4. Plier en deux après 3-4min\n5. Servir immédiatement',
    2,
    true,
    '{"vegetarian", "gluten-free"}'
),
-- Comfort food
(
    'Riz Sauté aux Restes',
    'Le roi du meal prep avec les restes du frigo',
    'comfort',
    5, 10,
    'easy',
    '[{"name": "Riz cuit", "amount": 2, "unit": "tasses", "alternatives": ["riz minute"]},
      {"name": "Huile", "amount": 2, "unit": "c. à soupe", "alternatives": []},
      {"name": "Œuf", "amount": 1, "unit": "pièce", "alternatives": []},
      {"name": "Légumes variés", "amount": 100, "unit": "g", "alternatives": []},
      {"name": "Sauce soja", "amount": 2, "unit": "c. à soupe", "alternatives": ["sel"]},
      {"name": "Protéine au choix", "amount": 80, "unit": "g", "alternatives": ["jambon", "thon", "tofu"]}]',
    '1. Chauffer l''huile dans un wok\n2. Faire revenir protéine et légumes\n3. Ajouter riz et mélanger\n4. Pousser sur un côté, brouiller l''œuf\n5. Mélanger le tout + sauce soja',
    3,
    true,
    '{"gluten-free"}'
),
-- Kid-friendly
(
    'Croque-Monsieur Minute',
    'Le favori des enfants en version express',
    'kids',
    3, 5,
    'easy',
    '[{"name": "Pain de mie", "amount": 4, "unit": "tranches", "alternatives": []},
      {"name": "Jambon", "amount": 4, "unit": "tranches", "alternatives": ["dinde"]},
      {"name": "Fromage râpé", "amount": 80, "unit": "g", "alternatives": []},
      {"name": "Beurre", "amount": 1, "unit": "c. à soupe", "alternatives": []}]',
    '1. Beurrer légèrement les tranches\n2. Garnir: jambon + fromage\n3. Fermer les sandwichs\n4. Faire dorer à la poêle 2min/côté\n5. Couper en triangles pour les enfants',
    2,
    true,
    '{}'
);

-- ====================================================================
-- 12. COMMENTS AND DOCUMENTATION
-- ====================================================================

COMMENT ON TABLE public.panic_events IS 'Tracking des événements de panic mode pour analytics et amélioration';
COMMENT ON TABLE public.quick_actions_usage IS 'Usage des actions rapides pour optimiser les performances';
COMMENT ON TABLE public.pre_computed_solutions IS 'Cache des solutions pré-calculées pour réponse < 30s';
COMMENT ON TABLE public.panic_preferences IS 'Préférences utilisateur pour personnaliser le panic mode';
COMMENT ON TABLE public.emergency_meal_templates IS 'Templates de repas d''urgence validés et optimisés';

COMMENT ON COLUMN public.panic_events.context_data IS 'Données contextuelles: météo, heure, localisation, etc.';
COMMENT ON COLUMN public.panic_events.solutions_offered IS 'Array des solutions proposées à l''utilisateur';
COMMENT ON COLUMN public.pre_computed_solutions.context_hash IS 'Hash pour invalidation rapide du cache';
COMMENT ON COLUMN public.emergency_meal_templates.scaling_factor IS 'Facilité de multiplication des portions (1.0 = facile)';

-- ====================================================================
-- 13. MONITORING QUERIES (For dashboard)
-- ====================================================================

-- Create materialized view for panic analytics dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS public.panic_analytics_daily AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_panics,
    COUNT(CASE WHEN success THEN 1 END) as successful_panics,
    AVG(time_to_resolution) as avg_resolution_time,
    AVG(user_stress_level) as avg_stress_level,
    COUNT(CASE WHEN trigger_type = 'automatic' THEN 1 END) as auto_triggers,
    COUNT(CASE WHEN solution_selected = 'instant' THEN 1 END) as instant_solutions,
    COUNT(CASE WHEN solution_selected = 'delivery' THEN 1 END) as delivery_solutions,
    COUNT(CASE WHEN family_members_present > 1 THEN 1 END) as family_panics
FROM public.panic_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_panic_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.panic_analytics_daily;
END;
$$ LANGUAGE plpgsql;