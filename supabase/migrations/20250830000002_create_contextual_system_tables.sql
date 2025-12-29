-- PRP-032.4: Contextual System - Database Schema
-- Système intelligent d'adaptation selon météo, planning, saisons et promotions

-- ====================================================================
-- 1. TABLE PRINCIPALE DE CONTEXTE
-- ====================================================================

-- Vérifier si la table weekly_meal_plans existe, sinon la créer
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_meal_plans') THEN
        CREATE TABLE public.weekly_meal_plans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            week_start_date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'draft',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END
$$;

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
-- 2. RÈGLES CONTEXTUELLES
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.context_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('weather', 'schedule', 'season', 'price', 'family', 'combined')),
    
    -- Conditions d'application
    conditions JSONB NOT NULL, -- {temperature: {min: 30}, weather: "sunny"}
    
    -- Actions à appliquer
    actions JSONB NOT NULL, -- {preferColdDishes: true, avoidOven: true}
    
    -- Metadata
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
    
    -- Family mode
    family_specific BOOLEAN DEFAULT FALSE,
    family_conditions JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. PRÉFÉRENCES CONTEXTUELLES UTILISATEUR
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.user_context_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Feature toggles
    weather_adaptation BOOLEAN DEFAULT TRUE,
    calendar_sync BOOLEAN DEFAULT TRUE,
    seasonal_preferences BOOLEAN DEFAULT TRUE,
    price_optimization BOOLEAN DEFAULT TRUE,
    
    -- Sensibilités
    weather_sensitivity VARCHAR(20) DEFAULT 'medium' CHECK (weather_sensitivity IN ('low', 'medium', 'high')),
    schedule_flexibility VARCHAR(20) DEFAULT 'flexible' CHECK (schedule_flexibility IN ('rigid', 'flexible', 'very_flexible')),
    price_sensitivity VARCHAR(20) DEFAULT 'medium' CHECK (price_sensitivity IN ('low', 'medium', 'high')),
    seasonal_commitment VARCHAR(20) DEFAULT 'moderate' CHECK (seasonal_commitment IN ('low', 'moderate', 'high')),
    
    -- Connexions externes
    google_calendar_connected BOOLEAN DEFAULT FALSE,
    google_calendar_token TEXT,
    google_calendar_id TEXT,
    outlook_calendar_connected BOOLEAN DEFAULT FALSE,
    outlook_calendar_token TEXT,
    outlook_calendar_id TEXT,
    
    -- Localisation
    home_location JSONB, -- {lat, lng, address, timezone}
    work_location JSONB, -- {lat, lng, address}
    preferred_stores UUID[] DEFAULT '{}', -- Store IDs
    max_store_distance DECIMAL(5,2) DEFAULT 10.0, -- km
    
    -- Préférences d'adaptation
    max_adaptations_per_week INTEGER DEFAULT 3,
    adaptation_aggressiveness VARCHAR(20) DEFAULT 'moderate' CHECK (adaptation_aggressiveness IN ('conservative', 'moderate', 'aggressive')),
    
    -- Family mode preferences
    family_context_enabled BOOLEAN DEFAULT FALSE,
    family_schedule_priority VARCHAR(20) DEFAULT 'balanced' CHECK (family_schedule_priority IN ('individual', 'balanced', 'family_first')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 4. CACHE DES DONNÉES CONTEXTUELLES
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.context_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_type VARCHAR(50) NOT NULL CHECK (cache_type IN ('weather', 'calendar', 'seasonal', 'promotions', 'combined')),
    
    -- Données cachées
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}', -- Source, confidence, etc.
    
    -- Validité
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ,
    
    -- Invalidation
    invalidation_triggers TEXT[] DEFAULT '{}', -- Events that invalidate this cache
    force_refresh BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 5. HISTORIQUE DES ADAPTATIONS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.context_adaptations_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    meal_plan_id UUID REFERENCES public.weekly_meal_plans(id),
    
    -- Type et raison d'adaptation
    adaptation_type VARCHAR(50) NOT NULL CHECK (adaptation_type IN ('weather', 'schedule', 'seasonal', 'promotion', 'family', 'combined')),
    adaptation_subtype VARCHAR(50), -- hot_weather, busy_day, etc.
    
    -- Détails de l'adaptation
    original_suggestion JSONB NOT NULL,
    adapted_suggestion JSONB NOT NULL,
    reason TEXT NOT NULL,
    detailed_explanation JSONB DEFAULT '{}',
    
    -- Impact et acceptance
    impact_score DECIMAL(3,2) DEFAULT 0, -- 0-1, niveau de changement
    confidence_score DECIMAL(3,2) DEFAULT 0, -- 0-1, confiance dans l'adaptation
    user_accepted BOOLEAN,
    user_feedback TEXT,
    
    -- Contexte au moment de l'adaptation
    context_snapshot JSONB DEFAULT '{}', -- Weather, schedule, etc. at adaptation time
    
    -- Family mode
    affected_family_members UUID[] DEFAULT '{}',
    family_votes JSONB DEFAULT '{}', -- {member_id: accepted/rejected}
    
    -- Cipher integration
    cipher_recommendation_id UUID,
    cipher_confidence DECIMAL(3,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 6. PRODUITS DE SAISON
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.seasonal_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(100) NOT NULL,
    product_category VARCHAR(50) NOT NULL CHECK (product_category IN ('fruit', 'vegetable', 'fish', 'meat', 'dairy', 'other')),
    
    -- Saisonnalité par mois (1-12)
    peak_months INTEGER[] NOT NULL,
    availability_calendar JSONB NOT NULL, -- {1: {inSeason: true, quality: "excellent", priceIndex: 0.8}, ...}
    
    -- Origine et localité
    origin VARCHAR(50) DEFAULT 'local' CHECK (origin IN ('local', 'national', 'imported')),
    region_specific BOOLEAN DEFAULT FALSE,
    regions TEXT[] DEFAULT '{}',
    
    -- Données nutritionnelles saisonnières
    peak_nutrition_boost DECIMAL(3,2) DEFAULT 1.0, -- Multiplicateur nutritionnel en saison
    
    -- Suggestions
    recipe_tags TEXT[] DEFAULT '{}',
    cooking_methods TEXT[] DEFAULT '{}',
    pairing_suggestions TEXT[] DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT TRUE,
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
    
    -- API Integration
    api_endpoint TEXT,
    api_key_encrypted TEXT, -- Encrypted API key
    api_version VARCHAR(20),
    integration_type VARCHAR(50) CHECK (integration_type IN ('api', 'scraping', 'manual', 'email')),
    
    -- Capacités
    provides_promotions BOOLEAN DEFAULT TRUE,
    provides_inventory BOOLEAN DEFAULT FALSE,
    provides_delivery BOOLEAN DEFAULT FALSE,
    update_frequency_hours INTEGER DEFAULT 24,
    
    -- Données de performance
    last_sync_at TIMESTAMPTZ,
    last_sync_success BOOLEAN,
    sync_error_count INTEGER DEFAULT 0,
    average_response_time_ms INTEGER,
    
    is_active BOOLEAN DEFAULT TRUE,
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
    
    -- Prix et réduction
    original_price DECIMAL(10,2) NOT NULL,
    discounted_price DECIMAL(10,2) NOT NULL,
    discount_percent INTEGER GENERATED ALWAYS AS (ROUND(((original_price - discounted_price) / original_price) * 100)) STORED,
    promotion_type VARCHAR(50) CHECK (promotion_type IN ('percentage', 'fixed', 'bogo', 'bundle', 'loyalty')),
    
    -- Validité
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    
    -- Conditions
    minimum_quantity INTEGER DEFAULT 1,
    maximum_quantity INTEGER,
    conditions JSONB DEFAULT '{}', -- Conditions spéciales
    
    -- Métadonnées
    external_id VARCHAR(100), -- ID dans le système du magasin
    last_verified TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte pour éviter les doublons
    UNIQUE(store_id, external_id)
);

-- ====================================================================
-- 9. RÈGLES MÉTÉO PRÉDÉFINIES
-- ====================================================================

-- Insérer des règles météo de base
INSERT INTO public.context_rules (rule_name, rule_type, conditions, actions, priority) VALUES
('Canicule', 'weather', 
 '{"temperature": {"min": 32}, "weather": ["sunny", "clear"]}',
 '{"preferColdDishes": true, "avoidOven": true, "suggestSalads": true, "hydrationFocus": true}',
 10),

('Grand froid', 'weather',
 '{"temperature": {"max": 5}, "weather": ["snow", "cold"]}',
 '{"preferHotDishes": true, "suggestSoups": true, "comfortFood": true, "slowCooker": true}',
 10),

('Jour de pluie', 'weather',
 '{"rain": {"min": 5}, "weather": ["rain", "drizzle"]}',
 '{"indoorCooking": true, "comfortFood": true, "avoidBBQ": true}',
 5),

('Journée très chargée', 'schedule',
 '{"busyScore": {"min": 8}}',
 '{"maxPrepTime": 20, "preferQuickMeals": true, "suggestMealPrep": true}',
 8),

('Occasion spéciale', 'schedule',
 '{"eventType": ["birthday", "anniversary", "holiday"]}',
 '{"specialMeal": true, "increaseBudget": 1.5, "suggestDessert": true}',
 9),

('Produits de saison', 'season',
 '{"seasonalScore": {"min": 80}}',
 '{"prioritizeSeasonal": true, "highlightLocalProduce": true}',
 6),

('Super promotion', 'price',
 '{"discountPercent": {"min": 30}}',
 '{"suggestPromoRecipes": true, "considerBulkBuying": true}',
 7);

-- ====================================================================
-- 10. INDEXES POUR PERFORMANCE
-- ====================================================================

-- Indexes principaux
CREATE INDEX IF NOT EXISTS idx_contextual_data_user ON public.contextual_planning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_contextual_data_meal_plan ON public.contextual_planning_data(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_contextual_data_sync ON public.contextual_planning_data(last_sync_at DESC);

-- Indexes pour les règles
CREATE INDEX IF NOT EXISTS idx_context_rules_type ON public.context_rules(rule_type, enabled);
CREATE INDEX IF NOT EXISTS idx_context_rules_priority ON public.context_rules(priority DESC) WHERE enabled = TRUE;

-- Indexes pour le cache
CREATE INDEX IF NOT EXISTS idx_context_cache_key ON public.context_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_context_cache_expiry ON public.context_cache(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_context_cache_type ON public.context_cache(cache_type);

-- Indexes pour les adaptations
CREATE INDEX IF NOT EXISTS idx_adaptations_user_date ON public.context_adaptations_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adaptations_type ON public.context_adaptations_log(adaptation_type);
CREATE INDEX IF NOT EXISTS idx_adaptations_accepted ON public.context_adaptations_log(user_accepted) WHERE user_accepted IS NOT NULL;

-- Indexes pour les produits de saison
CREATE INDEX IF NOT EXISTS idx_seasonal_products_category ON public.seasonal_products(product_category);
CREATE INDEX IF NOT EXISTS idx_seasonal_products_months ON public.seasonal_products USING GIN(peak_months);

-- Indexes pour les promotions
CREATE INDEX IF NOT EXISTS idx_promotions_store ON public.active_promotions(store_id);
CREATE INDEX IF NOT EXISTS idx_promotions_validity ON public.active_promotions(valid_until) WHERE valid_until > NOW();
CREATE INDEX IF NOT EXISTS idx_promotions_category ON public.active_promotions(product_category);

-- ====================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Enable RLS
ALTER TABLE public.contextual_planning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_adaptations_log ENABLE ROW LEVEL SECURITY;

-- Policies pour contextual_planning_data
CREATE POLICY "Users can manage their contextual data" ON public.contextual_planning_data
    FOR ALL USING (auth.uid() = user_id);

-- Policies pour user_context_preferences
CREATE POLICY "Users can manage their context preferences" ON public.user_context_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Policies pour context_adaptations_log
CREATE POLICY "Users can view their adaptation history" ON public.context_adaptations_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert adaptations" ON public.context_adaptations_log
    FOR INSERT WITH CHECK (true);

-- Les règles contextuelles sont publiques (lecture seule)
CREATE POLICY "Anyone can read context rules" ON public.context_rules
    FOR SELECT USING (enabled = true);

-- Les produits de saison sont publics
CREATE POLICY "Anyone can read seasonal products" ON public.seasonal_products
    FOR SELECT USING (is_active = true);

-- ====================================================================
-- 12. FUNCTIONS UTILITAIRES
-- ====================================================================

-- Fonction pour nettoyer le cache expiré
CREATE OR REPLACE FUNCTION cleanup_context_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM public.context_cache
    WHERE expires_at < NOW()
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le score météo
CREATE OR REPLACE FUNCTION calculate_weather_impact(weather_data JSONB)
RETURNS DECIMAL AS $$
DECLARE
    temp DECIMAL;
    impact DECIMAL := 0;
BEGIN
    -- Extraire la température moyenne
    temp := (weather_data->>'avgTemp')::DECIMAL;
    
    -- Calculer l'impact basé sur la température
    IF temp > 30 THEN
        impact := 0.9; -- Très chaud = fort impact
    ELSIF temp > 25 THEN
        impact := 0.6;
    ELSIF temp < 10 THEN
        impact := 0.8; -- Très froid = fort impact
    ELSIF temp < 15 THEN
        impact := 0.5;
    ELSE
        impact := 0.3; -- Température modérée = faible impact
    END IF;
    
    -- Ajuster selon la pluie
    IF (weather_data->>'rainyDays')::INTEGER > 3 THEN
        impact := impact + 0.1;
    END IF;
    
    RETURN LEAST(1.0, impact);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les produits de saison du mois
CREATE OR REPLACE FUNCTION get_current_seasonal_products()
RETURNS TABLE(
    product_name VARCHAR,
    category VARCHAR,
    quality VARCHAR,
    price_index DECIMAL
) AS $$
DECLARE
    current_month INTEGER := EXTRACT(MONTH FROM NOW());
BEGIN
    RETURN QUERY
    SELECT 
        sp.product_name,
        sp.product_category,
        (sp.availability_calendar->current_month::TEXT->>'quality')::VARCHAR as quality,
        (sp.availability_calendar->current_month::TEXT->>'priceIndex')::DECIMAL as price_index
    FROM public.seasonal_products sp
    WHERE 
        sp.is_active = true
        AND current_month = ANY(sp.peak_months)
        AND (sp.availability_calendar->current_month::TEXT->>'inSeason')::BOOLEAN = true
    ORDER BY 
        (sp.availability_calendar->current_month::TEXT->>'priceIndex')::DECIMAL ASC,
        sp.product_name;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 13. TRIGGERS
-- ====================================================================

-- Trigger pour updated_at
CREATE TRIGGER update_contextual_data_updated_at
    BEFORE UPDATE ON public.contextual_planning_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_preferences_updated_at
    BEFORE UPDATE ON public.user_context_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_rules_updated_at
    BEFORE UPDATE ON public.context_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seasonal_products_updated_at
    BEFORE UPDATE ON public.seasonal_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_partnerships_updated_at
    BEFORE UPDATE ON public.store_partnerships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 14. SEED DATA - PRODUITS DE SAISON (FRANCE)
-- ====================================================================

INSERT INTO public.seasonal_products (
    product_name, product_category, peak_months, availability_calendar, 
    origin, recipe_tags, cooking_methods
) VALUES
-- Fruits d'été
('Fraise', 'fruit', '{5,6,7}', 
 '{"1": {"inSeason": false, "quality": "poor", "priceIndex": 3.0},
   "2": {"inSeason": false, "quality": "poor", "priceIndex": 3.0},
   "3": {"inSeason": false, "quality": "poor", "priceIndex": 2.5},
   "4": {"inSeason": true, "quality": "good", "priceIndex": 1.5},
   "5": {"inSeason": true, "quality": "excellent", "priceIndex": 0.7},
   "6": {"inSeason": true, "quality": "excellent", "priceIndex": 0.6},
   "7": {"inSeason": true, "quality": "good", "priceIndex": 0.8},
   "8": {"inSeason": false, "quality": "poor", "priceIndex": 1.5},
   "9": {"inSeason": false, "quality": "poor", "priceIndex": 2.0},
   "10": {"inSeason": false, "quality": "poor", "priceIndex": 2.5},
   "11": {"inSeason": false, "quality": "poor", "priceIndex": 3.0},
   "12": {"inSeason": false, "quality": "poor", "priceIndex": 3.0}}',
 'local', '{"dessert", "fresh", "summer"}', '{"raw", "jam", "tart"}'),

-- Légumes d'été
('Tomate', 'vegetable', '{6,7,8,9}',
 '{"1": {"inSeason": false, "quality": "poor", "priceIndex": 2.0},
   "2": {"inSeason": false, "quality": "poor", "priceIndex": 2.0},
   "3": {"inSeason": false, "quality": "poor", "priceIndex": 1.8},
   "4": {"inSeason": false, "quality": "poor", "priceIndex": 1.6},
   "5": {"inSeason": true, "quality": "good", "priceIndex": 1.2},
   "6": {"inSeason": true, "quality": "excellent", "priceIndex": 0.8},
   "7": {"inSeason": true, "quality": "excellent", "priceIndex": 0.6},
   "8": {"inSeason": true, "quality": "excellent", "priceIndex": 0.6},
   "9": {"inSeason": true, "quality": "good", "priceIndex": 0.8},
   "10": {"inSeason": false, "quality": "good", "priceIndex": 1.2},
   "11": {"inSeason": false, "quality": "poor", "priceIndex": 1.6},
   "12": {"inSeason": false, "quality": "poor", "priceIndex": 2.0}}',
 'local', '{"salad", "sauce", "mediterranean"}', '{"raw", "roasted", "grilled"}'),

-- Légumes d'hiver
('Poireau', 'vegetable', '{10,11,12,1,2,3}',
 '{"1": {"inSeason": true, "quality": "excellent", "priceIndex": 0.7},
   "2": {"inSeason": true, "quality": "excellent", "priceIndex": 0.7},
   "3": {"inSeason": true, "quality": "good", "priceIndex": 0.8},
   "4": {"inSeason": false, "quality": "poor", "priceIndex": 1.2},
   "5": {"inSeason": false, "quality": "poor", "priceIndex": 1.5},
   "6": {"inSeason": false, "quality": "poor", "priceIndex": 1.8},
   "7": {"inSeason": false, "quality": "poor", "priceIndex": 2.0},
   "8": {"inSeason": false, "quality": "poor", "priceIndex": 2.0},
   "9": {"inSeason": false, "quality": "poor", "priceIndex": 1.5},
   "10": {"inSeason": true, "quality": "good", "priceIndex": 0.9},
   "11": {"inSeason": true, "quality": "excellent", "priceIndex": 0.7},
   "12": {"inSeason": true, "quality": "excellent", "priceIndex": 0.7}}',
 'local', '{"soup", "winter", "comfort"}', '{"braised", "soup", "gratin"}'),

-- Fruits d'automne
('Pomme', 'fruit', '{9,10,11}',
 '{"1": {"inSeason": false, "quality": "good", "priceIndex": 1.2},
   "2": {"inSeason": false, "quality": "good", "priceIndex": 1.3},
   "3": {"inSeason": false, "quality": "poor", "priceIndex": 1.5},
   "4": {"inSeason": false, "quality": "poor", "priceIndex": 1.6},
   "5": {"inSeason": false, "quality": "poor", "priceIndex": 1.8},
   "6": {"inSeason": false, "quality": "poor", "priceIndex": 2.0},
   "7": {"inSeason": false, "quality": "poor", "priceIndex": 2.0},
   "8": {"inSeason": true, "quality": "good", "priceIndex": 1.0},
   "9": {"inSeason": true, "quality": "excellent", "priceIndex": 0.6},
   "10": {"inSeason": true, "quality": "excellent", "priceIndex": 0.5},
   "11": {"inSeason": true, "quality": "excellent", "priceIndex": 0.6},
   "12": {"inSeason": false, "quality": "good", "priceIndex": 1.0}}',
 'local', '{"dessert", "autumn", "tart"}', '{"raw", "baked", "compote"}');

-- ====================================================================
-- 15. VUES MATÉRIALISÉES POUR PERFORMANCE
-- ====================================================================

-- Vue pour le contexte actuel par utilisateur
CREATE MATERIALIZED VIEW IF NOT EXISTS public.current_context_summary AS
SELECT 
    u.id as user_id,
    cp.weather_adaptation,
    cp.calendar_sync,
    cp.seasonal_preferences,
    cp.price_optimization,
    COALESCE(
        (SELECT COUNT(*) 
         FROM context_adaptations_log cal 
         WHERE cal.user_id = u.id 
         AND cal.created_at > NOW() - INTERVAL '7 days'
         AND cal.user_accepted = true), 0
    ) as weekly_accepted_adaptations,
    COALESCE(
        (SELECT AVG(impact_score) 
         FROM context_adaptations_log cal 
         WHERE cal.user_id = u.id 
         AND cal.created_at > NOW() - INTERVAL '30 days'), 0
    ) as avg_impact_score
FROM auth.users u
LEFT JOIN public.user_context_preferences cp ON u.id = cp.user_id;

-- Rafraîchir toutes les heures
CREATE OR REPLACE FUNCTION refresh_context_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.current_context_summary;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 16. COMMENTAIRES ET DOCUMENTATION
-- ====================================================================

COMMENT ON TABLE public.contextual_planning_data IS 'Données contextuelles pour adapter les plans de repas selon météo, planning, saisons et promotions';
COMMENT ON TABLE public.context_rules IS 'Règles d''adaptation automatique selon différents contextes';
COMMENT ON TABLE public.user_context_preferences IS 'Préférences utilisateur pour les adaptations contextuelles';
COMMENT ON TABLE public.context_cache IS 'Cache des données externes pour performance';
COMMENT ON TABLE public.context_adaptations_log IS 'Historique des adaptations avec feedback utilisateur';
COMMENT ON TABLE public.seasonal_products IS 'Base de données des produits de saison avec disponibilité mensuelle';
COMMENT ON TABLE public.store_partnerships IS 'Intégrations avec les magasins partenaires pour les promotions';
COMMENT ON TABLE public.active_promotions IS 'Promotions actuelles des magasins partenaires';

COMMENT ON COLUMN public.contextual_planning_data.weather_impact_score IS 'Score 0-1 indiquant l''influence de la météo sur les choix de repas';
COMMENT ON COLUMN public.contextual_planning_data.context_hash IS 'Hash pour invalider le cache lors de changements significatifs';
COMMENT ON COLUMN public.user_context_preferences.weather_sensitivity IS 'Sensibilité aux changements météo: low=peu d''adaptations, high=beaucoup d''adaptations';
COMMENT ON COLUMN public.seasonal_products.availability_calendar IS 'Disponibilité et qualité par mois (1-12) avec index de prix relatif';