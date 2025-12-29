-- Fix pour les contraintes manquantes dans le système contextuel

-- Ajouter la contrainte UNIQUE sur product_name si elle n'existe pas déjà
DO $$
BEGIN
    -- Vérifier si la contrainte existe déjà
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'seasonal_products_product_name_key' 
        AND table_name = 'seasonal_products'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la contrainte UNIQUE
        ALTER TABLE public.seasonal_products 
        ADD CONSTRAINT seasonal_products_product_name_key UNIQUE (product_name);
    END IF;
END $$;

-- Insérer les données de produits saisonniers avec gestion des conflits
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

-- Insérer les règles contextuelles par défaut
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