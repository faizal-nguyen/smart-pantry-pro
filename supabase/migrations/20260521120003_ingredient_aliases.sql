-- =========================================================================
-- PRP-239 PR2 — `ingredient_aliases` table + normalisation trigger.
--
-- Provides a canonical mapping for recipe ingredient names that diverge
-- from the inventory product catalog vocabulary:
--   - `oignon doux`, `oignon jaune`, `oignon rouge` → `oignon`
--   - `concombres coreens ou kirby` / `concombre japonais` → `concombre`
--   - `eau ou bouillon` → `eau`
--   - `huile vegetale` / `huile de cuisson` → `huile neutre`
--   - `viande hachee` → `boeuf hache` (per policy)
--   - hauts de cuisse / cuisses / pilons / ailes / escalope de poulet
--     normalized to PRP-239 §9.2 cut taxonomy
--
-- Designed to be consumed by `IngredientAliasResolver`
-- (`apps/api/src/services/ingredients/IngredientAliasResolver.ts`)
-- and the backfill script `scripts/backfill-recipe-ingredient-canonical.ts`.
--
-- Normalisation is enforced via trigger (mirror of `products.normalized_name`
-- pattern, see migration 20260508120000_products_augmentation_assistant.sql).
-- V3.1 fix: trigger fires on ANY UPDATE (no `OF` clause), so a future
-- `UPDATE … SET locale = 'en'` still keeps `alias_normalized` in sync.
-- =========================================================================

-- ---- Extensions (idempotent) -------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- Table -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias                      TEXT NOT NULL,
  alias_normalized           TEXT NOT NULL,
  canonical_name             TEXT NOT NULL,
  canonical_name_normalized  TEXT NOT NULL,
  canonical_note             TEXT,
  kind                       TEXT NOT NULL DEFAULT 'ingredient',
  locale                     TEXT NOT NULL DEFAULT 'fr',
  confidence                 NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alias_normalized, locale)
);

CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_canonical
  ON public.ingredient_aliases (canonical_name_normalized);

ALTER TABLE public.ingredient_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredient_aliases_read_all" ON public.ingredient_aliases;
CREATE POLICY "ingredient_aliases_read_all"
  ON public.ingredient_aliases FOR SELECT
  USING (true);

COMMENT ON TABLE public.ingredient_aliases IS
  'PRP-239 §4.3 — alias → canonical mapping for recipe ingredient canonicalization. Reads are open to all authenticated users (catalog data); writes are service-role only.';

-- ---- Normalisation trigger ---------------------------------------------
-- `unaccent` is marked STABLE (not IMMUTABLE) in the contrib package, so
-- we can't use a GENERATED column. A BEFORE trigger gives us the same
-- semantics with less subtlety. Fires on EVERY UPDATE so a partial
-- update (locale change, confidence tweak) re-derives the normalized
-- columns from `alias` / `canonical_name` (idempotent — same input,
-- same output).
CREATE OR REPLACE FUNCTION public.set_ingredient_alias_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW.alias_normalized          := lower(unaccent(trim(NEW.alias)));
  NEW.canonical_name_normalized := lower(unaccent(trim(NEW.canonical_name)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ingredient_aliases_normalized
  ON public.ingredient_aliases;

CREATE TRIGGER trg_ingredient_aliases_normalized
  BEFORE INSERT OR UPDATE
  ON public.ingredient_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ingredient_alias_normalized();

-- ---- Seed aliases (PRP §4.3 starting table) ----------------------------
-- Idempotent via ON CONFLICT on `(alias_normalized, locale)`. The
-- trigger derives the normalized columns from `alias` / `canonical_name`
-- so we don't have to pre-compute them here.
INSERT INTO public.ingredient_aliases
  (alias, canonical_name, canonical_note, kind, locale)
VALUES
  -- Oignon variants.
  ('oignon doux',                'oignon',                  'type doux',                'ingredient', 'fr'),
  ('oignon jaune',               'oignon',                  'type jaune',               'ingredient', 'fr'),
  ('oignon rouge',               'oignon',                  'type rouge',               'ingredient', 'fr'),
  ('oignon nouveau',             'oignon vert',             'scallion',                 'ingredient', 'fr'),
  -- Concombre variants.
  ('concombres coreens ou kirby','concombre',               'coreen ou kirby accepte',  'ingredient', 'fr'),
  ('concombre japonais',         'concombre',               'type japonais',            'ingredient', 'fr'),
  -- Eau / bouillon fallback.
  ('eau ou bouillon',            'eau',                     'bouillon accepte',         'ingredient', 'fr'),
  ('bouillon d''anchois ou eau', 'eau',                     'bouillon d''anchois accepte','ingredient', 'fr'),
  -- Huiles.
  ('huile de cuisson',           'huile neutre',            'cuisson haute temperature','ingredient', 'fr'),
  ('huile vegetale',             'huile neutre',            'cuisson neutre',           'ingredient', 'fr'),
  -- Beurre / ail / gingembre prep variants.
  ('beurre doux',                'beurre',                  'non sale',                 'ingredient', 'fr'),
  ('ail emince',                 'ail',                     'emince',                   'ingredient', 'fr'),
  ('gingembre rape',             'gingembre',               'rape',                     'ingredient', 'fr'),
  -- Poulet cuts (PRP §9.2 taxonomy).
  ('hauts de cuisse de poulet',  'haut de cuisse de poulet','coupe poulet',             'ingredient', 'fr'),
  ('cuisses de poulet',          'cuisse de poulet',        'coupe poulet',             'ingredient', 'fr'),
  ('pilons de poulet',           'pilon de poulet',         'coupe poulet',             'ingredient', 'fr'),
  ('ailes de poulet',            'aile de poulet',          'coupe poulet',             'ingredient', 'fr'),
  ('escalope de poulet',         'blanc de poulet',         'coupe poulet',             'ingredient', 'fr'),
  -- Default policy substitute for unqualified "viande hachee".
  ('viande hachee',              'boeuf hache',             'default policy',           'ingredient', 'fr')
ON CONFLICT (alias_normalized, locale) DO NOTHING;
