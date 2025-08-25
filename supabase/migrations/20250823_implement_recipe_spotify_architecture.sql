-- PRP-031: Implémentation architecture "Spotify des recettes"
-- Double-layer system: Catalogue global + Bibliothèque personnelle

-- ====================================================================
-- 1. RECIPES CATALOG - Base commune à tous les utilisateurs
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.recipes_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Contenu structuré
  ingredients_json JSONB NOT NULL, -- [{name, amount, unit, notes}]
  instructions TEXT NOT NULL,
  
  -- Métadonnées visuelles
  photo_url TEXT,
  photo_credits TEXT,
  
  -- Informations nutritionnelles
  nutrition_json JSONB, -- {calories, proteins, carbs, fats, vitamins, etc.}
  
  -- Catégorisation et filtres
  tags TEXT[] DEFAULT '{}', -- ["rapide", "végétarien", "sans-gluten", etc.]
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5) DEFAULT 3,
  
  -- Temps de préparation
  prep_time INTEGER DEFAULT 0, -- en minutes
  cook_time INTEGER DEFAULT 0, -- en minutes
  rest_time INTEGER DEFAULT 0, -- en minutes (levée, marinage, etc.)
  
  -- Portions
  servings INTEGER DEFAULT 4,
  
  -- Source et validation
  source VARCHAR(100), -- "partnership", "scraping", "proprietary", "community"
  source_url TEXT,
  verified_status BOOLEAN DEFAULT FALSE,
  
  -- Métriques d'engagement
  rating_avg DECIMAL(2,1) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  times_added INTEGER DEFAULT 0, -- Combien de fois ajoutée aux bibliothèques
  
  -- Monétisation
  is_premium BOOLEAN DEFAULT FALSE,
  is_exclusive BOOLEAN DEFAULT FALSE, -- Premium+ uniquement
  
  -- Méta
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('french', title || ' ' || COALESCE(description, '') || ' ' || array_to_string(tags, ' '))
  ) STORED
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_recipes_catalog_search ON public.recipes_catalog USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_recipes_catalog_tags ON public.recipes_catalog USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_recipes_catalog_rating ON public.recipes_catalog(rating_avg DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_catalog_difficulty ON public.recipes_catalog(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_catalog_prep_time ON public.recipes_catalog(prep_time);
CREATE INDEX IF NOT EXISTS idx_recipes_catalog_verified ON public.recipes_catalog(verified_status);
CREATE INDEX IF NOT EXISTS idx_recipes_catalog_premium ON public.recipes_catalog(is_premium);

-- ====================================================================
-- 2. USER RECIPES - Bibliothèque personnelle de chaque utilisateur
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.user_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Référence vers catalogue ou recette custom
  recipe_id UUID REFERENCES public.recipes_catalog(id) ON DELETE SET NULL,
  is_from_catalog BOOLEAN DEFAULT TRUE,
  
  -- Contenu pour recettes custom (si recipe_id est NULL)
  custom_title VARCHAR(255),
  custom_ingredients_json JSONB,
  custom_instructions TEXT,
  custom_photo_url TEXT,
  
  -- Personnalisations même pour recettes catalogue
  custom_modifications JSONB DEFAULT '{}', -- {title, ingredients_override, instructions_append, etc.}
  
  -- Métadonnées personnelles
  personal_notes TEXT,
  personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 5),
  personal_tags TEXT[] DEFAULT '{}',
  
  -- Collections personnelles (folders)
  collections TEXT[] DEFAULT '{}', -- ["Batch Cooking", "Comfort Food", "Été 2024"]
  
  -- Historique d'usage
  added_date TIMESTAMP DEFAULT NOW(),
  last_cooked_date TIMESTAMP,
  times_cooked INTEGER DEFAULT 0,
  
  -- Partage
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with UUID[], -- Partage avec utilisateurs spécifiques
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_user_recipes_user ON public.user_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_catalog ON public.user_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_collections ON public.user_recipes USING gin(collections);
CREATE INDEX IF NOT EXISTS idx_user_recipes_added_date ON public.user_recipes(added_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_recipes_last_cooked ON public.user_recipes(last_cooked_date DESC);

-- ====================================================================
-- 3. CATALOG RATINGS - Système de notation du catalogue
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.catalog_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES public.recipes_catalog(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Contrainte unicité par utilisateur/recette
  UNIQUE(recipe_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_ratings_recipe ON public.catalog_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_catalog_ratings_user ON public.catalog_ratings(user_id);

-- ====================================================================
-- 4. COLLECTIONS METADATA - Métadonnées des collections
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.user_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
  icon VARCHAR(50) DEFAULT 'folder',
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Métadonnées
  recipe_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contrainte unicité par utilisateur
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_collections_user ON public.user_collections(user_id);

-- ====================================================================
-- 5. RLS (Row Level Security) POLICIES
-- ====================================================================

-- Recipes Catalog - Lecture pour tous, écriture pour admins seulement
ALTER TABLE public.recipes_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verified recipes" ON public.recipes_catalog
  FOR SELECT USING (verified_status = TRUE);

CREATE POLICY "Premium users can view premium recipes" ON public.recipes_catalog
  FOR SELECT USING (
    NOT is_premium OR 
    (auth.jwt() ->> 'user_metadata' ->> 'subscription_tier') IN ('premium', 'premium_plus')
  );

-- User Recipes - Chaque utilisateur voit seulement ses recettes
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recipes" ON public.user_recipes
  USING (auth.uid() = user_id);

-- Catalog Ratings - Utilisateurs peuvent noter et voir les notes
ALTER TABLE public.catalog_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON public.catalog_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own ratings" ON public.catalog_ratings
  USING (auth.uid() = user_id);

-- User Collections
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own collections" ON public.user_collections
  USING (auth.uid() = user_id);

-- ====================================================================
-- 6. FUNCTIONS UTILITAIRES
-- ====================================================================

-- Fonction pour mettre à jour les stats du catalogue
CREATE OR REPLACE FUNCTION update_catalog_recipe_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Mise à jour du compteur times_added
  IF TG_OP = 'INSERT' AND NEW.is_from_catalog = TRUE THEN
    UPDATE recipes_catalog 
    SET times_added = times_added + 1 
    WHERE id = NEW.recipe_id;
  END IF;
  
  -- Mise à jour de la moyenne des ratings
  IF TG_TABLE_NAME = 'catalog_ratings' THEN
    UPDATE recipes_catalog SET
      rating_avg = (
        SELECT ROUND(AVG(rating)::numeric, 1) 
        FROM catalog_ratings 
        WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
      ),
      rating_count = (
        SELECT COUNT(*) 
        FROM catalog_ratings 
        WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
      )
    WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers pour maintenir les stats
CREATE TRIGGER trigger_update_catalog_stats_on_user_recipes
  AFTER INSERT OR UPDATE OR DELETE ON user_recipes
  FOR EACH ROW EXECUTE FUNCTION update_catalog_recipe_stats();

CREATE TRIGGER trigger_update_catalog_stats_on_ratings
  AFTER INSERT OR UPDATE OR DELETE ON catalog_ratings
  FOR EACH ROW EXECUTE FUNCTION update_catalog_recipe_stats();

-- Fonction pour nettoyer les collections vides dans user_recipes
CREATE OR REPLACE FUNCTION cleanup_empty_collections()
RETURNS void AS $$
BEGIN
  -- Supprimer les références à des collections qui n'existent plus
  UPDATE user_recipes SET collections = (
    SELECT array_agg(col)
    FROM unnest(collections) AS col
    WHERE col IN (
      SELECT name FROM user_collections 
      WHERE user_id = user_recipes.user_id
    )
  )
  WHERE collections != '{}';
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 7. SEED DATA INITIAL (quelques recettes d'exemple)
-- ====================================================================

INSERT INTO public.recipes_catalog (
  title, description, ingredients_json, instructions, 
  tags, difficulty, prep_time, cook_time, servings,
  source, verified_status, photo_url
) VALUES
-- Recette 1: Pâtes Carbonara
(
  'Pâtes Carbonara Authentiques',
  'La vraie carbonara italienne, crémeuse et savoureuse, avec seulement 5 ingrédients.',
  '[
    {"name": "Spaghettis", "amount": "400", "unit": "g"},
    {"name": "Guanciale", "amount": "200", "unit": "g"},
    {"name": "Œufs entiers", "amount": "2", "unit": "pièces"},
    {"name": "Jaunes d''œuf", "amount": "2", "unit": "pièces"},
    {"name": "Pecorino Romano râpé", "amount": "100", "unit": "g"},
    {"name": "Poivre noir", "amount": "1", "unit": "c. à café"}
  ]',
  '1. Faites bouillir de l''eau salée pour les pâtes.
2. Coupez le guanciale en dés et faites-le revenir dans une poêle jusqu''à ce qu''il soit croustillant.
3. Battez les œufs entiers et les jaunes avec le pecorino et le poivre.
4. Cuisez les spaghettis al dente.
5. Égouttez les pâtes en réservant un verre d''eau de cuisson.
6. Mélangez rapidement les pâtes chaudes avec l''œuf-fromage hors du feu.
7. Ajoutez le guanciale et un peu d''eau de cuisson si nécessaire.
8. Servez immédiatement avec du pecorino supplémentaire.',
  '{italien,pâtes,rapide,comfort food}',
  2, 10, 15, 4,
  'proprietary', TRUE,
  'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800'
),

-- Recette 2: Buddha Bowl Végétarien
(
  'Buddha Bowl Arc-en-ciel',
  'Un bol coloré et nutritif, parfait pour un déjeuner sain et équilibré.',
  '[
    {"name": "Quinoa", "amount": "200", "unit": "g"},
    {"name": "Patate douce", "amount": "1", "unit": "grosse"},
    {"name": "Avocat", "amount": "1", "unit": "pièce"},
    {"name": "Edamames", "amount": "150", "unit": "g"},
    {"name": "Chou rouge", "amount": "100", "unit": "g"},
    {"name": "Carottes", "amount": "2", "unit": "moyennes"},
    {"name": "Tahini", "amount": "2", "unit": "c. à soupe"},
    {"name": "Citron", "amount": "1", "unit": "pièce"},
    {"name": "Graines de tournesol", "amount": "30", "unit": "g"}
  ]',
  '1. Préchauffez le four à 200°C.
2. Cuisez le quinoa selon les instructions du paquet.
3. Coupez la patate douce en cubes et enfournez 25 min.
4. Râpez les carottes et émincez le chou rouge.
5. Préparez la sauce: tahini + jus de citron + eau + sel.
6. Disposez tous les ingrédients dans un bol.
7. Arrosez de sauce et parsemez de graines.
8. Dégustez immédiatement.',
  '{végétarien,healthy,bowl,sans gluten,coloré}',
  1, 15, 25, 2,
  'proprietary', TRUE,
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800'
),

-- Recette 3: Tarte Tatin Express
(
  'Tarte Tatin Express aux Pommes',
  'Une version rapide et facile de la célèbre tarte tatin, parfaite pour les desserts improvisés.',
  '[
    {"name": "Pâte feuilletée", "amount": "1", "unit": "rouleau"},
    {"name": "Pommes", "amount": "6", "unit": "moyennes"},
    {"name": "Sucre", "amount": "100", "unit": "g"},
    {"name": "Beurre", "amount": "50", "unit": "g"},
    {"name": "Vanille", "amount": "1", "unit": "gousse"}
  ]',
  '1. Préchauffez le four à 180°C.
2. Épluchez et coupez les pommes en quartiers.
3. Dans une poêle allant au four, faites un caramel avec le sucre.
4. Ajoutez le beurre et la vanille.
5. Disposez les pommes sur le caramel.
6. Recouvrez de pâte feuilletée en rentrant les bords.
7. Enfournez 25-30 minutes jusqu''à ce que la pâte soit dorée.
8. Laissez reposer 5 min avant de démouler.
9. Retournez sur un plat et servez tiède.',
  '{dessert,pommes,tarte,français,facile}',
  2, 20, 30, 6,
  'proprietary', TRUE,
  'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=800'
)

ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 8. COMMENT ET DOCUMENTATION
-- ====================================================================

COMMENT ON TABLE public.recipes_catalog IS 'Catalogue global de recettes - base commune partagée par tous les utilisateurs';
COMMENT ON TABLE public.user_recipes IS 'Bibliothèque personnelle de chaque utilisateur - leur "Spotify" de recettes';
COMMENT ON TABLE public.catalog_ratings IS 'Système de notation du catalogue par les utilisateurs';
COMMENT ON TABLE public.user_collections IS 'Collections personnelles pour organiser les recettes (dossiers thématiques)';

COMMENT ON COLUMN public.recipes_catalog.times_added IS 'Métrique: nombre de fois que la recette a été ajoutée aux bibliothèques personnelles';
COMMENT ON COLUMN public.user_recipes.custom_modifications IS 'Personnalisations appliquées aux recettes du catalogue (JSON flexible)';
COMMENT ON COLUMN public.user_recipes.collections IS 'Appartenance à des collections personnelles (array de noms)';