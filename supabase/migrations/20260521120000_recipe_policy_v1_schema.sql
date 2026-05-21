-- =========================================================================
-- PRP-239 PR1b — Recipe Policy V1 schema (additive, idempotent).
--
-- Sets up the storage primitives the next migration uses to apply the
-- archived manifest (`supabase/seeds/manifests/2026-05-21-recipe-policy-v1.json`).
--
-- Touches :
--   - public.recipes                  : recipe_facets, sanitized_at,
--                                        sanitization_versions
--   - public.recipe_corrections_log   : audit + rollback trail (NEW)
--   - public.recipe_policy_skipped_log: review-driven skip log     (NEW)
--   - public.ingredient_substitutions : extended for policy rules
--
-- See PRP-239 §4.1, §4.1.1, §4.1.2, §4.2 for design notes.
-- =========================================================================

-- ---- recipes table ------------------------------------------------------
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS recipe_facets JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sanitized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sanitization_versions JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_recipes_recipe_facets_gin
  ON public.recipes USING GIN (recipe_facets);

COMMENT ON COLUMN public.recipes.recipe_facets IS
  'PRP-239 §4.1 — facets (protein families, cuts, dietary flags) and provenance (quality_flags). Append-only by convention; migrations must merge arrays, not replace.';

COMMENT ON COLUMN public.recipes.sanitization_versions IS
  'PRP-239 §4.1 — per-domain version map, e.g. {"pork.v1":"2026-05-21","alcohol.v1":"2026-05-21"}. Idempotency key: a rule version is skipped on replay if already present.';

-- ---- recipe_corrections_log (audit + rollback) --------------------------
CREATE TABLE IF NOT EXISTS public.recipe_corrections_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  quality_flag TEXT,
  manifest_version INT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by TEXT NOT NULL DEFAULT 'prp-239',
  UNIQUE (recipe_id, field, old_value, new_value, rule_id, manifest_version)
);

ALTER TABLE public.recipe_corrections_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_corrections_log_read_own"
  ON public.recipe_corrections_log;

-- PRP-239 V3.1 — correlated EXISTS subquery so users only see corrections
-- on their own recipes. JOIN-in-policy would be slower; the unique
-- constraint above already covers `recipe_id` indexing.
CREATE POLICY "recipe_corrections_log_read_own"
  ON public.recipe_corrections_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_corrections_log.recipe_id
        AND r.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.recipe_corrections_log IS
  'PRP-239 §4.1.1 — audit + rollback trail for every policy correction applied to recipes. Service role inserts; users read their own via RLS.';

-- ---- recipe_policy_skipped_log (review surface) -------------------------
CREATE TABLE IF NOT EXISTS public.recipe_policy_skipped_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_version INT NOT NULL,
  recipe_id UUID,
  recipe_name TEXT,
  source_url TEXT,
  field TEXT NOT NULL,
  expected_old_value TEXT NOT NULL,
  actual_value TEXT,
  rule_id TEXT NOT NULL,
  reason_skip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_policy_skipped_log ENABLE ROW LEVEL SECURITY;
-- No client policy: service-role-only table by design.

COMMENT ON TABLE public.recipe_policy_skipped_log IS
  'PRP-239 §4.1.2 — manifest entries the migration declined to apply (recipe missing, ambiguous match, old_value diverged, already applied). Service-role-only.';

-- ---- ingredient_substitutions extension ---------------------------------
ALTER TABLE public.ingredient_substitutions
  ADD COLUMN IF NOT EXISTS substitution_kind TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS rule_id TEXT,
  ADD COLUMN IF NOT EXISTS is_policy_rule BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS replacement_components JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ingredient_substitutions_policy
  ON public.ingredient_substitutions(substitution_kind, context)
  WHERE is_policy_rule = true;

COMMENT ON COLUMN public.ingredient_substitutions.replacement_components IS
  'PRP-239 §4.2 — JSONB array for multi-component substitutes (e.g. mirin → [{ingredient:"vinaigre de riz",ratio:3},{ingredient:"sucre",ratio:1},{ingredient:"eau",ratio:3}]). `ratio NUMERIC(4,2)` stays for simple 1:N rules.';

-- ---- Alcohol substitution rules (PRP §4.2 V1 set) -----------------------
-- Idempotent insert: (rule_id, context) is unique by policy.
DO $$
DECLARE
  v_rule RECORD;
BEGIN
  FOR v_rule IN
    SELECT * FROM (VALUES
      ('alcohol.mirin.sauce',         'mirin',             'sauce',            'mirin -> vinaigre de riz + sucre + eau (3:1:3)',
       '[{"ingredient":"vinaigre de riz","ratio":3},{"ingredient":"sucre","ratio":1},{"ingredient":"eau","ratio":3}]'::jsonb,
       'cooking'),
      ('alcohol.mirin.dessert',       'mirin',             'dessert',          'mirin (dessert) -> sirop de riz dilue',
       '[{"ingredient":"sirop de riz dilue","ratio":1}]'::jsonb,
       'cooking'),
      ('alcohol.sake.cooking',        'sake',              'cooking',          'sake -> bouillon dashi (compenser umami au besoin)',
       '[{"ingredient":"bouillon dashi","ratio":1}]'::jsonb,
       'cooking'),
      ('alcohol.vin_de_riz.cooking',  'vin de riz',        'cooking',          'vin de riz -> bouillon leger + vinaigre de riz',
       '[{"ingredient":"bouillon leger","ratio":1},{"ingredient":"vinaigre de riz","ratio":0.2}]'::jsonb,
       'cooking'),
      ('alcohol.vin_shaoxing.stirfry','vin de Shaoxing',   'stir_fry',         'vin de Shaoxing -> bouillon de poulet + vinaigre de cidre',
       '[{"ingredient":"bouillon de poulet","ratio":1},{"ingredient":"vinaigre de cidre","ratio":0.2}]'::jsonb,
       'cooking'),
      ('alcohol.vin_blanc.deglaze',   'vin blanc',         'deglaze',          'vin blanc -> bouillon + jus de citron',
       '[{"ingredient":"bouillon","ratio":1},{"ingredient":"jus de citron","ratio":0.2}]'::jsonb,
       'cooking'),
      ('alcohol.vin_rouge.braise',    'vin rouge',         'braise',           'vin rouge -> bouillon corse + vinaigre balsamique',
       '[{"ingredient":"bouillon corse","ratio":1},{"ingredient":"vinaigre balsamique","ratio":0.15}]'::jsonb,
       'cooking'),
      ('alcohol.sherry.cooking',      'sherry',            'cooking',          'sherry/xeres -> bouillon + vinaigre de cidre',
       '[{"ingredient":"bouillon","ratio":1},{"ingredient":"vinaigre de cidre","ratio":0.2}]'::jsonb,
       'cooking'),
      ('alcohol.biere.pate',          'biere',             'pate',             'biere (pate) -> eau gazeuse',
       '[{"ingredient":"eau gazeuse","ratio":1}]'::jsonb,
       'cooking'),
      ('alcohol.biere.cooking',       'biere',             'cooking',          'biere (cuisson) -> bouillon',
       '[{"ingredient":"bouillon","ratio":1}]'::jsonb,
       'cooking')
    ) AS s(rule_id, original_ingredient, context, notes, replacement_components, recipe_type)
  LOOP
    -- Update existing row if rule_id+context match.
    UPDATE public.ingredient_substitutions
       SET original_ingredient    = v_rule.original_ingredient,
           substitute_ingredient  = COALESCE(NULLIF((v_rule.replacement_components->0->>'ingredient'), ''), original_ingredient),
           substitution_kind      = 'alcohol',
           context                = v_rule.context,
           is_policy_rule         = true,
           replacement_components = v_rule.replacement_components,
           notes                  = v_rule.notes,
           recipe_type            = v_rule.recipe_type
     WHERE rule_id = v_rule.rule_id;

    IF NOT FOUND THEN
      INSERT INTO public.ingredient_substitutions
        (original_ingredient, substitute_ingredient, ratio, recipe_type, notes,
         substitution_kind, context, rule_id, is_policy_rule, replacement_components)
      VALUES
        (v_rule.original_ingredient,
         COALESCE(NULLIF((v_rule.replacement_components->0->>'ingredient'), ''), v_rule.original_ingredient),
         1.0,
         v_rule.recipe_type,
         v_rule.notes,
         'alcohol',
         v_rule.context,
         v_rule.rule_id,
         true,
         v_rule.replacement_components);
    END IF;
  END LOOP;
END;
$$;
