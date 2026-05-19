-- Add the missing FK `recipe_interactions.recipe_id -> recipes.id`.
--
-- Context: PRP-226 PR3 created `public.recipe_interactions` with
-- `recipe_id UUID` and no FK declared. PostgREST embedded resource
-- syntax (`recipes!inner(...)`) requires a declared foreign key to
-- infer the relation, otherwise the request fails with HTTP 400.
-- This migration adds the FK with `ON DELETE SET NULL` so that
-- deleting a recipe leaves the interaction history intact but
-- detached, matching the pattern used by `social_recipe_imports`
-- and `media_assets`.
--
-- Safety: orphan interactions (where `recipe_id` no longer matches
-- any row in `recipes`) would block the `ALTER TABLE`. We first
-- null them out, then add the constraint.

BEGIN;

UPDATE public.recipe_interactions ri
SET recipe_id = NULL
WHERE recipe_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.recipes r WHERE r.id = ri.recipe_id
  );

ALTER TABLE public.recipe_interactions
  DROP CONSTRAINT IF EXISTS recipe_interactions_recipe_id_fkey;

ALTER TABLE public.recipe_interactions
  ADD CONSTRAINT recipe_interactions_recipe_id_fkey
  FOREIGN KEY (recipe_id)
  REFERENCES public.recipes(id)
  ON DELETE SET NULL;

COMMIT;
