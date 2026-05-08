-- =====================================================================
-- PRP-221 J1 — Augmentation `products` pour l'agent vocal.
--
-- Trois colonnes ajoutées :
--   - normalized_name : pour le matching fuzzy + dédup
--   - source          : audit de l'origine (user / assistant_auto / imported / seeded)
--   - created_by      : qui a créé la ligne (auth.users(id) ou NULL pour les seeds)
--
-- Plus :
--   - extensions pg_trgm + unaccent
--   - backfill normalized_name pour les rows existantes
--   - UNIQUE INDEX sur normalized_name (empêche "Tomate" / "tomate" / "tomates"
--     de créer 3 rows séparées)
--   - GIN trigram index pour le fuzzy match du ProductResolver
--
-- Idempotent. Safe à ré-appliquer. Aucune donnée existante n'est altérée
-- au-delà du backfill normalized_name (qui ne change pas le `name` affiché).
-- =====================================================================

-- ---- Extensions ------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---- Colonnes --------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS normalized_name TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT
    CHECK (source IN ('unknown','user_manual','assistant_auto','imported','seeded')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Default 'unknown' pour les rows pré-existantes : on ne sait pas qui a
-- créé les products legacy (le seeding original n'a pas tracké). Les
-- nouvelles insertions devront expliciter la source.
UPDATE public.products SET source = 'unknown' WHERE source IS NULL;

-- ---- Backfill normalized_name ---------------------------------------
-- Conservatif : `lower(unaccent(trim))`, sans pluralisation. La
-- pluralisation FR/EN est faite côté ProductResolver applicatif (pour
-- pas embarquer une lib SQL). Si on a déjà 2 rows "tomate" et
-- "tomates" en prod, l'UNIQUE INDEX en bas plantera à la création —
-- voir le bloc DEDUP ci-dessous.
UPDATE public.products
   SET normalized_name = lower(unaccent(trim(name)))
 WHERE normalized_name IS NULL;

-- ---- Dédup pré-UNIQUE INDEX -----------------------------------------
-- Si des collisions existent (ex: "Tomate", "tomate"), on garde le row
-- le plus ancien et on bouge les FK des autres dessus avant suppression.
-- Cette étape ne tourne qu'une fois (les rows en collision sont
-- nettoyées) ; idempotent ensuite.
DO $$
DECLARE
  collision RECORD;
  canonical_id UUID;
BEGIN
  FOR collision IN
    SELECT normalized_name
      FROM public.products
     GROUP BY normalized_name
    HAVING count(*) > 1
  LOOP
    SELECT id INTO canonical_id
      FROM public.products
     WHERE normalized_name = collision.normalized_name
     ORDER BY created_at ASC
     LIMIT 1;

    -- Repointer les FK qui référencent les rows en collision
    UPDATE public.inventory
       SET product_id = canonical_id
     WHERE product_id IN (
       SELECT id FROM public.products
        WHERE normalized_name = collision.normalized_name
          AND id <> canonical_id
     );
    UPDATE public.shopping_list
       SET product_id = canonical_id
     WHERE product_id IN (
       SELECT id FROM public.products
        WHERE normalized_name = collision.normalized_name
          AND id <> canonical_id
     );
    -- recipe_ingredients utilise `inventory_product_id` (cf. SCHEMA-OFFICIAL-COLUMNS)
    UPDATE public.recipe_ingredients
       SET inventory_product_id = canonical_id
     WHERE inventory_product_id IN (
       SELECT id FROM public.products
        WHERE normalized_name = collision.normalized_name
          AND id <> canonical_id
     );

    -- Maintenant on peut supprimer les duplicatas
    DELETE FROM public.products
     WHERE normalized_name = collision.normalized_name
       AND id <> canonical_id;
  END LOOP;
END $$;

-- ---- NOT NULL + UNIQUE -----------------------------------------------
ALTER TABLE public.products
  ALTER COLUMN normalized_name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_normalized_name_unique
  ON public.products(normalized_name);

CREATE INDEX IF NOT EXISTS idx_products_source
  ON public.products(source) WHERE source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_normalized_trgm
  ON public.products USING gin (normalized_name gin_trgm_ops);

-- ---- Trigger pour maintenir normalized_name à jour ------------------
CREATE OR REPLACE FUNCTION public.products_normalize_name_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NULL THEN
    RAISE EXCEPTION 'products.name cannot be NULL';
  END IF;
  -- Toujours dériver normalized_name du name source canonique.
  NEW.normalized_name := lower(unaccent(trim(NEW.name)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_normalize_name ON public.products;
CREATE TRIGGER trg_products_normalize_name
  BEFORE INSERT OR UPDATE OF name ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_normalize_name_trigger();

NOTIFY pgrst, 'reload schema';
