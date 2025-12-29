-- PRP-032.4: Contextual System - Database Schema (Fixed)
-- Système intelligent d'adaptation selon météo, planning, saisons et promotions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 0. VÉRIFICATIONS ET CRÉATIONS DE TABLES PREREQUIS
-- ====================================================================

-- Vérifier et créer la table weekly_meal_plans si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_meal_plans') THEN
        CREATE TABLE public.weekly_meal_plans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            week_start_date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'draft',
            family_size INTEGER DEFAULT 2,
            dietary_restrictions TEXT[] DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Index pour performance
        CREATE INDEX IF NOT EXISTS idx_weekly_meal_plans_user_id ON public.weekly_meal_plans(user_id);
        CREATE INDEX IF NOT EXISTS idx_weekly_meal_plans_week_start ON public.weekly_meal_plans(week_start_date);
    END IF;
END
$$;

-- ====================================================================
-- 1. TABLE PRINCIPALE DE CONTEXTE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.contextual_planning_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_plan_id UUID REFERENCES public.weekly_meal_plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Données météo
    weather_forecast JSONB DEFAULT '{}', -- Prévisions 7 jours complètes
    weather_impact_score DECIMAL(3,2) DEFAULT 0, -- 0-1, influence sur les choix
    weather_last_sync TIMESTAMPTZ,
    
    -- Planning familial
    family_schedule JSONB DEFAULT '{}', -- Événements Google Calendar/Outlook
    busy_score_per_day INTEGER[] DEFAULT '{}', -- 0-10 par jour
    schedule_conflicts JSONB DEFAULT '[]', -- Conflits détectés
    
    -- Occasions spéciales
    special_occasions TEXT[] DEFAULT '{}', -- Anniversaires, fêtes, etc.
    occasion_details JSONB DEFAULT '[]', -- [{date, type, attendees, preferences}]
    
    -- Saisonnalité
    seasonal_ingredients JSONB DEFAULT '{}', -- Produits de saison avec scores
    seasonality_score DECIMAL(3,2) DEFAULT 0, -- Alignement saisonnier global
    seasonal_recommendations JSONB DEFAULT '[]',
    
    -- Promotions locales
    local_promotions JSONB DEFAULT '[]', -- Offres des magasins proches
    savings_potential DECIMAL(10,2) DEFAULT 0, -- Économies possibles totales
    promotion_opportunities JSONB DEFAULT '[]', -- Opportunités identifiées
    
    -- Méta-données
    context_hash VARCHAR(64), -- Pour cache invalidation
    confidence_level DECIMAL(3,2) DEFAULT 0.5, -- Fiabilité des données
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Family mode
    family_context JSONB DEFAULT '{}', -- Contexte spécifique famille
    family_adaptations JSONB DEFAULT '[]', -- Adaptations pour membres famille
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. RÈGLES D'ADAPTATION CONTEXTUELLES
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.context_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL, -- 'weather', 'schedule', 'seasonal', 'promotion'
    
    -- Conditions de déclenchement
    trigger_conditions JSONB NOT NULL, -- Quand appliquer cette règle
    
    -- Actions à effectuer
    adaptations JSONB NOT NULL, -- Quoi faire quand déclenchée
    
    -- Métadonnées
    priority INTEGER DEFAULT 5, -- 1=haute, 10=basse priorité
    confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
    active BOOLEAN DEFAULT true,
    
    -- Paramètres famille
    family_mode_enabled BOOLEAN DEFAULT false,
    family_consensus_required BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. PRÉFÉRENCES CONTEXTUELLES UTILISATEUR
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.contextual_user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Préférences principales
    weather_adaptation BOOLEAN DEFAULT true,
    weather_sensitivity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    
    calendar_sync BOOLEAN DEFAULT false,
    schedule_flexibility VARCHAR(20) DEFAULT 'flexible', -- 'rigid', 'flexible', 'very_flexible'
    
    seasonal_preferences BOOLEAN DEFAULT true,
    seasonal_commitment VARCHAR(20) DEFAULT 'moderate', -- 'low', 'moderate', 'high'
    
    price_optimization BOOLEAN DEFAULT true,
    price_sensitivity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    
    -- Paramètres avancés
    max_adaptations_per_week INTEGER DEFAULT 5,
    home_location JSONB, -- {lat, lng, address}
    preferred_stores TEXT[] DEFAULT '{}',
    excluded_categories TEXT[] DEFAULT '{}',
    max_store_distance DECIMAL(5,2) DEFAULT 10.0, -- km
    
    -- Mode famille
    family_context_enabled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 4. CACHE CONTEXTUEL
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.context_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(200) NOT NULL UNIQUE,
    cache_type VARCHAR(50) NOT NULL, -- 'weather', 'calendar', 'promotions'
    
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 5. LOG DES ADAPTATIONS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.context_adaptations_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    meal_plan_id UUID REFERENCES public.weekly_meal_plans(id) ON DELETE SET NULL,
    
    -- Type d'adaptation
    adaptation_type VARCHAR(50) NOT NULL,
    trigger_context JSONB NOT NULL, -- Contexte qui a déclenché l'adaptation
    
    -- Changements appliqués
    original_suggestion JSONB,
    adapted_suggestion JSONB,
    reason TEXT,
    
    -- Métriques
    confidence_score DECIMAL(3,2),
    impact_score DECIMAL(3,2), -- Impact estimé 0-1
    
    -- Feedback utilisateur
    user_accepted BOOLEAN,
    user_satisfaction INTEGER, -- 1-5 étoiles
    user_feedback TEXT,
    
    -- Family mode
    family_member_feedback JSONB DEFAULT '{}', -- {memberId: {accepted, satisfaction}}
    family_consensus_reached BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 6. PRODUITS DE SAISON
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.seasonal_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(100) NOT NULL UNIQUE,
    product_category VARCHAR(50) NOT NULL, -- 'fruit', 'vegetable', 'herb'
    
    -- Disponibilité mensuelle (1-12)
    availability_calendar JSONB NOT NULL, -- {1: {inSeason: true, quality: "excellent", priceIndex: 0.8}}
    peak_months INTEGER[] NOT NULL,
    
    -- Informations produit
    origin VARCHAR(50) DEFAULT 'local', -- 'local', 'imported'
    nutritional_benefits TEXT[],
    storage_tips TEXT,
    
    -- Métadonnées
    region VARCHAR(100) DEFAULT 'France',
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 7. PARTENARIATS MAGASINS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.store_partnerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_chain VARCHAR(100) NOT NULL,
    store_name VARCHAR(200) NOT NULL,
    store_location JSONB NOT NULL, -- {lat, lng, address, city, postalCode}
    
    -- API Configuration
    api_endpoint VARCHAR(500),
    api_credentials_encrypted TEXT,
    api_active BOOLEAN DEFAULT false,
    
    -- Métadonnées
    partnership_start_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Statistiques
    last_sync_at TIMESTAMPTZ,
    total_promotions_found INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 8. PROMOTIONS ACTIVES
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.active_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.store_partnerships(id) ON DELETE CASCADE,
    
    -- Produit et promotion
    product_name VARCHAR(200) NOT NULL,
    product_category VARCHAR(50),
    brand VARCHAR(100),
    
    -- Détails promotion
    original_price DECIMAL(10,2),
    discounted_price DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    promotion_type VARCHAR(50), -- 'percentage', 'fixed_amount', '2+1', 'bulk'
    
    -- Conditions
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER,
    conditions_text TEXT,
    
    -- Validité
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    
    -- Méta-données
    source_url VARCHAR(500),
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 9. MODE FAMILLE - TABLES ADDITIONNELLES
-- ====================================================================

-- Table pour gérer les familles
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_name VARCHAR(100) NOT NULL,
    main_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shared_preferences JSONB DEFAULT '{}',
    consensus_level DECIMAL(3,2) DEFAULT 0.8,
    adaptation_strategy VARCHAR(50) DEFAULT 'balanced', -- 'health_focused', 'budget_focused', 'time_focused', 'balanced'
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les membres de famille
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'parent', 'child', 'other'
    preferences JSONB DEFAULT '{}',
    dietary_restrictions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- Table pour l'historique de résolution de conflits
CREATE TABLE IF NOT EXISTS public.family_conflict_resolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    conflict_description TEXT NOT NULL,
    resolution_method VARCHAR(50) NOT NULL, -- 'voting', 'compromise', 'rotation', 'ai_suggestion'
    outcome VARCHAR(50) NOT NULL, -- 'resolved', 'pending', 'escalated'
    member_votes JSONB DEFAULT '{}',
    average_satisfaction DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 10. FONCTIONS UTILITAIRES
-- ====================================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ====================================================================
-- 11. TRIGGERS
-- ====================================================================

CREATE TRIGGER update_contextual_planning_data_updated_at
    BEFORE UPDATE ON public.contextual_planning_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_rules_updated_at
    BEFORE UPDATE ON public.context_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contextual_user_preferences_updated_at
    BEFORE UPDATE ON public.contextual_user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seasonal_products_updated_at
    BEFORE UPDATE ON public.seasonal_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_partnerships_updated_at
    BEFORE UPDATE ON public.store_partnerships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_promotions_updated_at
    BEFORE UPDATE ON public.active_promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON public.families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 12. INDEX POUR PERFORMANCE
-- ====================================================================

-- Index pour les données contextuelles
CREATE INDEX IF NOT EXISTS idx_contextual_planning_data_user_id ON public.contextual_planning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_contextual_planning_data_meal_plan_id ON public.contextual_planning_data(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_contextual_planning_data_last_sync ON public.contextual_planning_data(last_sync_at);

-- Index pour le cache
CREATE INDEX IF NOT EXISTS idx_context_cache_expires_at ON public.context_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_context_cache_type ON public.context_cache(cache_type);

-- Index pour les adaptations
CREATE INDEX IF NOT EXISTS idx_context_adaptations_log_user_id ON public.context_adaptations_log(user_id);
CREATE INDEX IF NOT EXISTS idx_context_adaptations_log_created_at ON public.context_adaptations_log(created_at);
CREATE INDEX IF NOT EXISTS idx_context_adaptations_log_type ON public.context_adaptations_log(adaptation_type);

-- Index pour les produits saisonniers
CREATE INDEX IF NOT EXISTS idx_seasonal_products_category ON public.seasonal_products(product_category);
CREATE INDEX IF NOT EXISTS idx_seasonal_products_active ON public.seasonal_products(is_active);

-- Index pour les promotions
CREATE INDEX IF NOT EXISTS idx_active_promotions_store_id ON public.active_promotions(store_id);
CREATE INDEX IF NOT EXISTS idx_active_promotions_valid_until ON public.active_promotions(valid_until);
CREATE INDEX IF NOT EXISTS idx_active_promotions_category ON public.active_promotions(product_category);

-- Index pour famille
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);

-- ====================================================================
-- 13. RLS (ROW LEVEL SECURITY)
-- ====================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.contextual_planning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contextual_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_adaptations_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_conflict_resolutions ENABLE ROW LEVEL SECURITY;

-- Politiques pour les données contextuelles (accès utilisateur uniquement)
CREATE POLICY "Users can access own contextual data" ON public.contextual_planning_data
    FOR ALL USING (auth.uid() = user_id);

-- Politiques pour les préférences utilisateur
CREATE POLICY "Users can manage own preferences" ON public.contextual_user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Politiques pour les logs d'adaptation
CREATE POLICY "Users can view own adaptation logs" ON public.context_adaptations_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own adaptation logs" ON public.context_adaptations_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques pour les familles
CREATE POLICY "Family main user can manage family" ON public.families
    FOR ALL USING (auth.uid() = main_user_id);

CREATE POLICY "Family members can view family" ON public.families
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.family_members 
            WHERE family_id = public.families.id
        )
    );

-- Politiques pour les membres de famille
CREATE POLICY "Family members can view other members" ON public.family_members
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT fm.user_id FROM public.family_members fm
            WHERE fm.family_id = public.family_members.family_id
        )
    );

-- Politiques pour les règles contextuelles (lecture seule pour tous)
CREATE POLICY "All users can read context rules" ON public.context_rules
    FOR SELECT USING (active = true);

-- Politiques pour les produits saisonniers (lecture seule)
CREATE POLICY "All users can read seasonal products" ON public.seasonal_products
    FOR SELECT USING (is_active = true);

-- Politiques pour les magasins partenaires (lecture seule)
CREATE POLICY "All users can read store partnerships" ON public.store_partnerships
    FOR SELECT USING (is_active = true);

-- Politiques pour les promotions actives (lecture seule)
CREATE POLICY "All users can read active promotions" ON public.active_promotions
    FOR SELECT USING (valid_until >= CURRENT_DATE);

-- ====================================================================
-- 14. DONNÉES DE SEED POUR PRODUITS SAISONNIERS (FRANCE)
-- ====================================================================

INSERT INTO public.seasonal_products (product_name, product_category, availability_calendar, peak_months, origin, nutritional_benefits, region) VALUES
-- Légumes d'été
('Tomate', 'vegetable', '{"1":{"inSeason":false,"quality":"poor","priceIndex":2.0},"2":{"inSeason":false,"quality":"poor","priceIndex":2.0},"3":{"inSeason":false,"quality":"poor","priceIndex":1.8},"4":{"inSeason":false,"quality":"poor","priceIndex":1.6},"5":{"inSeason":true,"quality":"good","priceIndex":1.2},"6":{"inSeason":true,"quality":"excellent","priceIndex":0.8},"7":{"inSeason":true,"quality":"excellent","priceIndex":0.6},"8":{"inSeason":true,"quality":"excellent","priceIndex":0.6},"9":{"inSeason":true,"quality":"good","priceIndex":0.8},"10":{"inSeason":false,"quality":"good","priceIndex":1.2},"11":{"inSeason":false,"quality":"poor","priceIndex":1.6},"12":{"inSeason":false,"quality":"poor","priceIndex":2.0}}', '{6,7,8,9}', 'local', '{"Vitamine C", "Lycopène", "Potassium"}', 'France'),

('Courgette', 'vegetable', '{"1":{"inSeason":false,"quality":"poor","priceIndex":3.0},"2":{"inSeason":false,"quality":"poor","priceIndex":3.0},"3":{"inSeason":false,"quality":"poor","priceIndex":2.5},"4":{"inSeason":false,"quality":"poor","priceIndex":2.0},"5":{"inSeason":true,"quality":"good","priceIndex":1.5},"6":{"inSeason":true,"quality":"excellent","priceIndex":0.8},"7":{"inSeason":true,"quality":"excellent","priceIndex":0.6},"8":{"inSeason":true,"quality":"excellent","priceIndex":0.6},"9":{"inSeason":true,"quality":"good","priceIndex":0.8},"10":{"inSeason":false,"quality":"poor","priceIndex":1.5},"11":{"inSeason":false,"quality":"poor","priceIndex":2.5},"12":{"inSeason":false,"quality":"poor","priceIndex":3.0}}', '{6,7,8,9}', 'local', '{"Vitamine A", "Fibres", "Magnésium"}', 'France'),

-- Légumes d'hiver
('Poireau', 'vegetable', '{"1":{"inSeason":true,"quality":"excellent","priceIndex":0.7},"2":{"inSeason":true,"quality":"excellent","priceIndex":0.7},"3":{"inSeason":true,"quality":"good","priceIndex":0.8},"4":{"inSeason":false,"quality":"poor","priceIndex":1.2},"5":{"inSeason":false,"quality":"poor","priceIndex":1.5},"6":{"inSeason":false,"quality":"poor","priceIndex":1.8},"7":{"inSeason":false,"quality":"poor","priceIndex":2.0},"8":{"inSeason":false,"quality":"poor","priceIndex":2.0},"9":{"inSeason":false,"quality":"poor","priceIndex":1.5},"10":{"inSeason":true,"quality":"good","priceIndex":0.9},"11":{"inSeason":true,"quality":"excellent","priceIndex":0.7},"12":{"inSeason":true,"quality":"excellent","priceIndex":0.7}}', '{10,11,12,1,2,3}', 'local', '{"Vitamine K", "Folates", "Manganèse"}', 'France'),

('Potiron', 'vegetable', '{"1":{"inSeason":false,"quality":"good","priceIndex":1.2},"2":{"inSeason":false,"quality":"poor","priceIndex":1.5},"3":{"inSeason":false,"quality":"poor","priceIndex":2.0},"4":{"inSeason":false,"quality":"poor","priceIndex":2.5},"5":{"inSeason":false,"quality":"poor","priceIndex":3.0},"6":{"inSeason":false,"quality":"poor","priceIndex":3.0},"7":{"inSeason":false,"quality":"poor","priceIndex":2.5},"8":{"inSeason":false,"quality":"poor","priceIndex":2.0},"9":{"inSeason":true,"quality":"good","priceIndex":1.0},"10":{"inSeason":true,"quality":"excellent","priceIndex":0.7},"11":{"inSeason":true,"quality":"excellent","priceIndex":0.7},"12":{"inSeason":true,"quality":"good","priceIndex":0.9}}', '{9,10,11,12}', 'local', '{"Bêta-carotène", "Vitamine A", "Fibres"}', 'France'),

-- Fruits d'été
('Fraise', 'fruit', '{"1":{"inSeason":false,"quality":"poor","priceIndex":3.0},"2":{"inSeason":false,"quality":"poor","priceIndex":3.0},"3":{"inSeason":false,"quality":"poor","priceIndex":2.5},"4":{"inSeason":true,"quality":"good","priceIndex":1.5},"5":{"inSeason":true,"quality":"excellent","priceIndex":0.7},"6":{"inSeason":true,"quality":"excellent","priceIndex":0.6},"7":{"inSeason":true,"quality":"good","priceIndex":1.0},"8":{"inSeason":false,"quality":"poor","priceIndex":1.5},"9":{"inSeason":false,"quality":"poor","priceIndex":2.0},"10":{"inSeason":false,"quality":"poor","priceIndex":2.5},"11":{"inSeason":false,"quality":"poor","priceIndex":3.0},"12":{"inSeason":false,"quality":"poor","priceIndex":3.0}}', '{5,6}', 'local', '{"Vitamine C", "Antioxydants", "Folates"}', 'France'),

('Pêche', 'fruit', '{"1":{"inSeason":false,"quality":"poor","priceIndex":4.0},"2":{"inSeason":false,"quality":"poor","priceIndex":4.0},"3":{"inSeason":false,"quality":"poor","priceIndex":3.5},"4":{"inSeason":false,"quality":"poor","priceIndex":3.0},"5":{"inSeason":false,"quality":"poor","priceIndex":2.5},"6":{"inSeason":true,"quality":"good","priceIndex":1.5},"7":{"inSeason":true,"quality":"excellent","priceIndex":0.8},"8":{"inSeason":true,"quality":"excellent","priceIndex":0.7},"9":{"inSeason":false,"quality":"good","priceIndex":1.5},"10":{"inSeason":false,"quality":"poor","priceIndex":2.5},"11":{"inSeason":false,"quality":"poor","priceIndex":3.5},"12":{"inSeason":false,"quality":"poor","priceIndex":4.0}}', '{7,8}', 'local', '{"Vitamine A", "Vitamine C", "Potassium"}', 'France'),

-- Fruits d'hiver/automne
('Pomme', 'fruit', '{"1":{"inSeason":false,"quality":"good","priceIndex":1.2},"2":{"inSeason":false,"quality":"good","priceIndex":1.3},"3":{"inSeason":false,"quality":"poor","priceIndex":1.5},"4":{"inSeason":false,"quality":"poor","priceIndex":1.6},"5":{"inSeason":false,"quality":"poor","priceIndex":1.8},"6":{"inSeason":false,"quality":"poor","priceIndex":2.0},"7":{"inSeason":false,"quality":"poor","priceIndex":2.0},"8":{"inSeason":true,"quality":"good","priceIndex":1.0},"9":{"inSeason":true,"quality":"excellent","priceIndex":0.6},"10":{"inSeason":true,"quality":"excellent","priceIndex":0.5},"11":{"inSeason":true,"quality":"excellent","priceIndex":0.6},"12":{"inSeason":false,"quality":"good","priceIndex":1.0}}', '{9,10,11}', 'local', '{"Fibres", "Vitamine C", "Antioxydants"}', 'France'),

('Orange', 'fruit', '{"1":{"inSeason":true,"quality":"excellent","priceIndex":0.8},"2":{"inSeason":true,"quality":"excellent","priceIndex":0.8},"3":{"inSeason":true,"quality":"good","priceIndex":0.9},"4":{"inSeason":false,"quality":"poor","priceIndex":1.2},"5":{"inSeason":false,"quality":"poor","priceIndex":1.5},"6":{"inSeason":false,"quality":"poor","priceIndex":1.8},"7":{"inSeason":false,"quality":"poor","priceIndex":2.0},"8":{"inSeason":false,"quality":"poor","priceIndex":2.0},"9":{"inSeason":false,"quality":"poor","priceIndex":1.8},"10":{"inSeason":false,"quality":"poor","priceIndex":1.5},"11":{"inSeason":false,"quality":"good","priceIndex":1.2},"12":{"inSeason":true,"quality":"excellent","priceIndex":0.8}}', '{12,1,2,3}', 'imported', '{"Vitamine C", "Folates", "Calcium"}', 'France')

ON CONFLICT (product_name) DO NOTHING;

-- ====================================================================
-- 15. RÈGLES CONTEXTUELLES PAR DÉFAUT
-- ====================================================================

INSERT INTO public.context_rules (rule_name, rule_type, trigger_conditions, adaptations, priority, confidence_threshold, family_mode_enabled) VALUES
-- Règles météo
('hot_weather_adaptation', 'weather', '{"temperature": {"min": 28}, "conditions": ["clear", "sunny"]}', '{"suggest_cold_dishes": true, "avoid_hot_cooking": true, "recommend_salads": true}', 2, 0.8, true),
('cold_weather_adaptation', 'weather', '{"temperature": {"max": 8}, "conditions": ["snow", "cold"]}', '{"suggest_hot_dishes": true, "recommend_soups": true, "avoid_cold_dishes": true}', 2, 0.8, true),
('rainy_day_comfort', 'weather', '{"precipitation": {"min": 5}, "conditions": ["rain", "drizzle"]}', '{"suggest_comfort_food": true, "indoor_cooking": true}', 3, 0.7, true),

-- Règles planning
('busy_day_quick_meals', 'schedule', '{"busy_score": {"min": 7}}', '{"max_prep_time": 30, "suggest_quick_recipes": true, "batch_cooking": true}', 1, 0.9, true),
('weekend_elaborate_cooking', 'schedule', '{"day_type": "weekend", "busy_score": {"max": 4}}', '{"allow_complex_recipes": true, "suggest_new_recipes": true}', 4, 0.6, true),
('dinner_party_adaptation', 'schedule', '{"special_occasion": true, "attendees": {"min": 6}}', '{"scale_portions": true, "suggest_impressive_dishes": true}', 1, 0.8, true),

-- Règles saisonnières
('seasonal_optimization', 'seasonal', '{"season_score": {"min": 80}}', '{"prioritize_seasonal": true, "suggest_seasonal_recipes": true}', 3, 0.7, false),
('end_of_season_bulk', 'seasonal', '{"ending_soon": true, "price_drop": {"min": 0.3}}', '{"suggest_preservation": true, "bulk_buying": true}', 4, 0.6, true),

-- Règles promotions
('significant_savings', 'promotion', '{"discount_percentage": {"min": 30}, "category": "meat"}', '{"suggest_bulk_purchase": true, "recommend_freezing": true}', 2, 0.8, true),
('combo_opportunity', 'promotion', '{"recipe_match": true, "total_savings": {"min": 5}}', '{"suggest_recipe": true, "highlight_savings": true}', 3, 0.7, false)

ON CONFLICT (rule_name) DO NOTHING;

-- ====================================================================
-- 16. COMMENTAIRES DE DOCUMENTATION
-- ====================================================================

COMMENT ON TABLE public.contextual_planning_data IS 'Stockage centralisé des données contextuelles pour chaque plan de repas';
COMMENT ON TABLE public.context_rules IS 'Règles d''adaptation automatique selon différents contextes';
COMMENT ON TABLE public.contextual_user_preferences IS 'Préférences utilisateur pour les adaptations contextuelles';
COMMENT ON TABLE public.context_cache IS 'Cache des données externes pour performance';
COMMENT ON TABLE public.context_adaptations_log IS 'Historique des adaptations avec feedback utilisateur';
COMMENT ON TABLE public.seasonal_products IS 'Base de données des produits de saison avec disponibilité mensuelle';
COMMENT ON TABLE public.store_partnerships IS 'Intégrations avec les magasins partenaires pour les promotions';
COMMENT ON TABLE public.active_promotions IS 'Promotions actuelles des magasins partenaires';
COMMENT ON TABLE public.families IS 'Gestion des familles pour le mode famille';
COMMENT ON TABLE public.family_members IS 'Membres des familles avec leurs rôles et préférences';
COMMENT ON TABLE public.family_conflict_resolutions IS 'Historique de résolution de conflits familiaux';

COMMENT ON COLUMN public.contextual_planning_data.weather_impact_score IS 'Score 0-1 indiquant l''influence de la météo sur les choix de repas';
COMMENT ON COLUMN public.contextual_planning_data.context_hash IS 'Hash pour invalider le cache lors de changements significatifs';
COMMENT ON COLUMN public.contextual_user_preferences.weather_sensitivity IS 'Sensibilité aux changements météo: low=peu d''adaptations, high=beaucoup d''adaptations';
COMMENT ON COLUMN public.contextual_user_preferences.schedule_flexibility IS 'Flexibilité horaire: rigid=pas d''adaptation horaire, flexible=adaptations possibles';
COMMENT ON COLUMN public.contextual_user_preferences.seasonal_commitment IS 'Engagement saisonnier: low=peu important, high=priorité absolue';
COMMENT ON COLUMN public.contextual_user_preferences.price_sensitivity IS 'Sensibilité prix: low=prix pas important, high=économies prioritaires';
COMMENT ON COLUMN public.families.adaptation_strategy IS 'Stratégie d''adaptation famille: balanced, health_focused, budget_focused, time_focused';
COMMENT ON COLUMN public.families.consensus_level IS 'Niveau de consensus requis (0-1) pour valider une adaptation';