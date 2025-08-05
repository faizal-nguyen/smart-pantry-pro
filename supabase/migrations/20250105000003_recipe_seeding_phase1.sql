-- Migration pour Recipe Database Seeding Phase 1 (50 recettes)
-- Focus: Sécurité alimentaire et performance mobile

-- 1. Enrichissement table recipes avec métadonnées multilingues
-- Traduction et langue
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS original_language CHAR(2) DEFAULT 'en';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS translated_title VARCHAR(500);
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS translated_description TEXT;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS translation_quality_score INTEGER CHECK (translation_quality_score >= 0 AND translation_quality_score <= 100);

-- Sécurité alimentaire obligatoire
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS allergen_info JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS allergen_warnings TEXT[] DEFAULT '{}';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS spice_level INTEGER CHECK (spice_level >= 0 AND spice_level <= 5);

-- Métadonnées indiennes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS indian_cuisine_type VARCHAR(100);
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS meal_timing VARCHAR(50);
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS festival_occasions TEXT[] DEFAULT '{}';

-- Validation qualité
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS safety_validated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS safety_validated_at TIMESTAMP;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS safety_validator_notes TEXT;

-- Source
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS source_name VARCHAR(100) DEFAULT 'kannammacooks.com';

-- 2. Index optimisés pour performance mobile <100ms
CREATE INDEX IF NOT EXISTS idx_recipes_search_fr ON public.recipes 
  USING gin(to_tsvector('french', COALESCE(translated_title, '') || ' ' || COALESCE(translated_description, '')));
CREATE INDEX IF NOT EXISTS idx_recipes_allergens ON public.recipes USING gin(allergen_warnings);
CREATE INDEX IF NOT EXISTS idx_recipes_dietary ON public.recipes USING gin(dietary_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON public.recipes(meal_timing);
CREATE INDEX IF NOT EXISTS idx_recipes_spice_level ON public.recipes(spice_level);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_type ON public.recipes(indian_cuisine_type);

-- 3. Table de mapping allergènes multilingue
CREATE TABLE IF NOT EXISTS public.allergen_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  allergen_key VARCHAR(50) NOT NULL, -- 'peanuts', 'dairy', 'gluten'
  language_code CHAR(2) NOT NULL,
  translation VARCHAR(100) NOT NULL,
  common_ingredients TEXT[] DEFAULT '{}', -- ingredients contenant cet allergène
  severity_level INTEGER CHECK (severity_level >= 1 AND severity_level <= 5),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(allergen_key, language_code)
);

-- 4. Données allergènes de base (français + anglais)
INSERT INTO public.allergen_translations (allergen_key, language_code, translation, common_ingredients, severity_level) VALUES
-- Français
('peanuts', 'fr', 'arachides', ARRAY['cacahuètes', 'huile d''arachide', 'beurre de cacahuète'], 5),
('dairy', 'fr', 'produits laitiers', ARRAY['lait', 'yaourt', 'ghee', 'paneer', 'crème', 'beurre'], 4),
('gluten', 'fr', 'gluten', ARRAY['blé', 'farine', 'chapati', 'naan', 'roti'], 4),
('shellfish', 'fr', 'crustacés', ARRAY['crevettes', 'crabes', 'homard'], 5),
('nuts', 'fr', 'fruits à coque', ARRAY['amandes', 'noix de cajou', 'pistaches', 'noix'], 4),
('eggs', 'fr', 'œufs', ARRAY['œuf', 'mayonnaise'], 3),
('soy', 'fr', 'soja', ARRAY['sauce soja', 'tofu', 'tempeh'], 3),
('sesame', 'fr', 'sésame', ARRAY['graines de sésame', 'tahini', 'huile de sésame'], 3),
-- Anglais
('peanuts', 'en', 'peanuts', ARRAY['peanuts', 'groundnut oil', 'peanut butter'], 5),
('dairy', 'en', 'dairy', ARRAY['milk', 'yogurt', 'ghee', 'paneer', 'cream', 'butter'], 4),
('gluten', 'en', 'gluten', ARRAY['wheat', 'flour', 'chapati', 'naan', 'roti'], 4),
('shellfish', 'en', 'shellfish', ARRAY['shrimp', 'crab', 'lobster'], 5),
('nuts', 'en', 'tree nuts', ARRAY['almonds', 'cashews', 'pistachios', 'walnuts'], 4),
('eggs', 'en', 'eggs', ARRAY['egg', 'mayonnaise'], 3),
('soy', 'en', 'soy', ARRAY['soy sauce', 'tofu', 'tempeh'], 3),
('sesame', 'en', 'sesame', ARRAY['sesame seeds', 'tahini', 'sesame oil'], 3)
ON CONFLICT (allergen_key, language_code) DO NOTHING;

-- 5. Table de cache traductions (économie API)
CREATE TABLE IF NOT EXISTS public.translation_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_text TEXT NOT NULL,
  source_language CHAR(2) NOT NULL,
  target_language CHAR(2) NOT NULL,
  translated_text TEXT NOT NULL,
  context VARCHAR(50), -- 'recipe_title', 'ingredient', 'instruction'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '90 days',
  UNIQUE(source_text, source_language, target_language, context)
);

-- Index pour recherche rapide dans le cache
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup ON public.translation_cache(source_text, source_language, target_language);
CREATE INDEX IF NOT EXISTS idx_translation_cache_expiry ON public.translation_cache(expires_at);

-- 6. Table de tracking coûts API (monitoring budget)
CREATE TABLE IF NOT EXISTS public.api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service VARCHAR(50) NOT NULL, -- 'openai', 'translation', 'scraping'
  cost DECIMAL(10,4) NOT NULL,
  tokens_used INTEGER,
  endpoint VARCHAR(200),
  timestamp TIMESTAMP DEFAULT NOW(),
  batch_size INTEGER DEFAULT 1,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);

-- Index pour monitoring mensuel
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON public.api_usage_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON public.api_usage_tracking(service, timestamp);

-- 7. Vue pour monitoring temps réel des coûts
CREATE OR REPLACE VIEW api_cost_monitoring AS
SELECT 
  service,
  DATE_TRUNC('day', timestamp) as day,
  COUNT(*) as api_calls,
  SUM(cost) as daily_cost,
  AVG(cost) as avg_cost_per_call,
  SUM(tokens_used) as total_tokens
FROM api_usage_tracking
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY service, DATE_TRUNC('day', timestamp)
ORDER BY day DESC, service;

-- 8. Fonction helper pour validation allergènes
CREATE OR REPLACE FUNCTION detect_allergens(ingredient_list TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  detected_allergens TEXT[] := '{}';
  ingredient TEXT;
  allergen RECORD;
BEGIN
  -- Pour chaque ingrédient
  FOREACH ingredient IN ARRAY ingredient_list
  LOOP
    -- Vérifier contre tous les allergènes connus
    FOR allergen IN 
      SELECT DISTINCT allergen_key, unnest(common_ingredients) as ingredient_name
      FROM allergen_translations
      WHERE language_code = 'fr'
    LOOP
      IF LOWER(ingredient) LIKE '%' || LOWER(allergen.ingredient_name) || '%' THEN
        detected_allergens := array_append(detected_allergens, allergen.allergen_key);
      END IF;
    END LOOP;
  END LOOP;
  
  -- Retourner allergènes uniques
  RETURN ARRAY(SELECT DISTINCT unnest(detected_allergens));
END;
$$ LANGUAGE plpgsql;

-- 9. RLS policies pour sécurité
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergen_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policies lecture publique pour recettes
CREATE POLICY "Recettes lisibles par tous" ON public.recipes
  FOR SELECT USING (true);

CREATE POLICY "Allergènes lisibles par tous" ON public.allergen_translations
  FOR SELECT USING (true);

-- Policies admin pour modifications
CREATE POLICY "Admin peut tout faire sur recettes" ON public.recipes
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin peut voir tracking API" ON public.api_usage_tracking
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- 10. Fonction pour estimer coût avant appel API
CREATE OR REPLACE FUNCTION estimate_api_cost(
  p_service VARCHAR,
  p_operation VARCHAR,
  p_batch_size INTEGER DEFAULT 1
) RETURNS DECIMAL AS $$
DECLARE
  estimated_cost DECIMAL;
BEGIN
  -- Tarifs approximatifs
  CASE p_service
    WHEN 'openai' THEN
      CASE p_operation
        WHEN 'extract_recipe' THEN estimated_cost := 0.003 * p_batch_size;
        WHEN 'translate' THEN estimated_cost := 0.002 * p_batch_size;
        ELSE estimated_cost := 0.005 * p_batch_size;
      END CASE;
    WHEN 'translation' THEN
      estimated_cost := 0.001 * p_batch_size;
    ELSE
      estimated_cost := 0.001 * p_batch_size;
  END CASE;
  
  RETURN estimated_cost;
END;
$$ LANGUAGE plpgsql;

-- 11. Fonction RPC pour exécuter du SQL raw (pour la recherche optimisée)
CREATE OR REPLACE FUNCTION execute_raw_sql(query TEXT, params TEXT[] DEFAULT '{}')
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Sécurité: seulement SELECT autorisé
  IF NOT (query ~* '^\s*SELECT') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  -- Exécuter la requête dynamique
  EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', query) 
  USING params
  INTO result;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Migration Recipe Seeding Phase 1 appliquée avec succès';
  RAISE NOTICE '📊 Tables créées: recipes (enrichie), allergen_translations, translation_cache, api_usage_tracking';
  RAISE NOTICE '🚀 Index performance mobile créés';
  RAISE NOTICE '🔒 Sécurité RLS activée';
END $$;