-- =========================================================================
-- PRP-239 PR1b — Apply the archived v1 manifest to existing recipe rows.
--
-- Idempotent. Driven by the JSON manifest embedded below
-- (mirror of supabase/seeds/manifests/2026-05-21-recipe-policy-v1.json).
--
-- For each change entry :
--   1. Resolve the target recipe via
--        a) source_url match if the manifest carries one (today the v1
--           manifest does not — see PR1b note), or
--        b) fallback: normalized(name) match. Must be UNIQUE; otherwise
--           skipped as `recipe_match_ambiguous`.
--   2. Skip with `already_applied` if sanitization_versions[<domain>.v1]
--      is already set.
--   3. Find the ingredient row whose target field (`ingredient_name` or
--      `notes`) contains the manifest's `old_value` as an accent-tolerant
--      token. Skip `old_value_not_found` otherwise.
--   4. Substitute the matched token in-place. Log to recipe_corrections_log.
--   5. Append `quality_flag` to recipes.recipe_facets.quality_flags (set
--      union), bump sanitization_versions[domain.v1] = today, set
--      sanitized_at = now().
--
-- The matching pipeline relies on the `unaccent` extension (already
-- enabled by migration 20260508120000_products_augmentation_assistant.sql)
-- and on the helper `_policy_substitute()` defined below.
-- =========================================================================

-- ---- Helper: accent-tolerant token substitution -------------------------
CREATE OR REPLACE FUNCTION public._policy_substitute(
  field_value TEXT,
  old_value   TEXT,
  new_value   TEXT
) RETURNS TEXT AS $body$
DECLARE
  v_normalized_field TEXT;
  v_normalized_old   TEXT;
  v_pos              INT;
  v_len              INT;
  v_before_ok        BOOL := TRUE;
  v_after_ok         BOOL := TRUE;
BEGIN
  IF field_value IS NULL OR field_value = '' THEN RETURN field_value; END IF;
  v_normalized_field := lower(unaccent(field_value));
  v_normalized_old   := lower(unaccent(old_value));
  IF v_normalized_old = '' THEN RETURN field_value; END IF;

  v_pos := position(v_normalized_old IN v_normalized_field);
  IF v_pos = 0 THEN RETURN field_value; END IF;

  v_len := length(v_normalized_old);

  IF v_pos > 1 THEN
    v_before_ok := substring(v_normalized_field FROM v_pos - 1 FOR 1) !~ '[a-z0-9]';
  END IF;

  IF v_pos + v_len - 1 < length(v_normalized_field) THEN
    v_after_ok := substring(v_normalized_field FROM v_pos + v_len FOR 1) !~ '[a-z0-9]';
  END IF;

  IF NOT (v_before_ok AND v_after_ok) THEN RETURN field_value; END IF;

  -- Length-preserving normalization (unaccent maps é→e, 1:1 chars in our
  -- French dataset) lets us splice the raw text by position.
  RETURN substring(field_value FROM 1 FOR v_pos - 1)
       || new_value
       || substring(field_value FROM v_pos + v_len);
END;
$body$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public._policy_substitute(TEXT, TEXT, TEXT) IS
  'PRP-239 — accent + case insensitive token substitution. Returns field_value unchanged if old_value is not a bounded token.';

-- ---- Apply the v1 manifest ----------------------------------------------
DO $migration$
DECLARE
  v_manifest        JSONB := $manifest$
{
  "version": 1,
  "generated_at": "2026-05-21T00:00:00.000Z",
  "changes": [
    {
      "source_file": "supabase/seeds/2026-05-19-add-fried-rice-bowls.sql",
      "recipe_name": "Bulgogi-Style Beef Fried Rice",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-fried-rice-bowls.sql",
      "recipe_name": "Teriyaki Glazed Salmon",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-fried-rice-bowls.sql",
      "recipe_name": "Teriyaki Glazed Salmon",
      "field": "ingredient_notes",
      "old_value": "vin de riz",
      "new_value": "bouillon leger et vinaigre de riz",
      "rule_id": "alcohol.vin_de_riz.to_light_broth_rice_vinegar",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Beef Hor Fun (Black Bean Sauce)",
      "field": "ingredient_name",
      "old_value": "vin de Shaoxing",
      "new_value": "bouillon de poulet et vinaigre de cidre",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Cheung Fun aux Crevettes (Express)",
      "field": "ingredient_name",
      "old_value": "vin de Shaoxing",
      "new_value": "bouillon de poulet et vinaigre de cidre",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Don't Worry Rice Bowl",
      "field": "ingredient_name",
      "old_value": "vin de riz",
      "new_value": "bouillon leger et vinaigre de riz",
      "rule_id": "alcohol.vin_de_riz.to_light_broth_rice_vinegar",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Don't Worry Rice Bowl",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Garlic Steak Fried Rice",
      "field": "ingredient_name",
      "old_value": "vin de Shaoxing",
      "new_value": "bouillon de poulet et vinaigre de cidre",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Bulgogi Grilled Cheese",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Double Bacon Smash Cheeseburger",
      "field": "ingredient_name",
      "old_value": "sherry",
      "new_value": "bouillon et vinaigre de cidre",
      "rule_id": "alcohol.sherry.to_broth_cider",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Double Bacon Smash Cheeseburger",
      "field": "ingredient_name",
      "old_value": "bacon",
      "new_value": "beef bacon",
      "rule_id": "pork.bacon.to_beef_bacon",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Lasagna (Joemustgoon)",
      "field": "ingredient_name",
      "old_value": "vin rouge",
      "new_value": "bouillon corse et vinaigre balsamique",
      "rule_id": "alcohol.vin_rouge.to_strong_broth_balsamic",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "ingredient_name",
      "old_value": "sake",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "ingredient_name",
      "old_value": "SPAM",
      "new_value": "boeuf fume",
      "rule_id": "pork.spam.to_beef_smoked",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Tuscan Chicken Pasta",
      "field": "ingredient_name",
      "old_value": "vin blanc",
      "new_value": "bouillon et jus de citron",
      "rule_id": "alcohol.vin_blanc.to_broth_lemon",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Air Fryer Rice Paper Rolls",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Cheesy Nduja Slider",
      "field": "ingredient_name",
      "old_value": "chorizo",
      "new_value": "chorizo de boeuf",
      "rule_id": "pork.chorizo.to_beef_chorizo",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Cheesy Nduja Slider",
      "field": "ingredient_name",
      "old_value": "nduja",
      "new_value": "saucisse de boeuf epicee",
      "rule_id": "pork.nduja.to_beef_spicy_sausage",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mapo Tofu Udon",
      "field": "ingredient_name",
      "old_value": "vin de Shaoxing",
      "new_value": "bouillon de poulet et vinaigre de cidre",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mapo Tofu Udon",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mexican Pambazo Sandwich",
      "field": "ingredient_name",
      "old_value": "chorizo",
      "new_value": "chorizo de boeuf",
      "rule_id": "pork.chorizo.to_beef_chorizo",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Okonomiyaki Traybake",
      "field": "ingredient_name",
      "old_value": "bacon",
      "new_value": "beef bacon",
      "rule_id": "pork.bacon.to_beef_bacon",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-nguyenfoodstall.sql",
      "recipe_name": "Beef Bulgogi Bibimbap Bowl",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Karaage (Japanese Fried Chicken)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Karaage (Japanese Fried Chicken)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Korokke",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Korokke",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Korokke",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Korokke",
      "field": "ingredient_notes",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Okinawan Taco Rice",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Okinawan Taco Rice",
      "field": "ingredient_notes",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Oyako-don",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Tebasaki (Nagoya Fried Chicken Wings)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Tebasaki (Nagoya Fried Chicken Wings)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Yakitori",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Yakitori",
      "field": "ingredient_name",
      "old_value": "lard",
      "new_value": "graisse de boeuf",
      "rule_id": "pork.lard.to_beef_fat",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Bún Bò Huế (Bunbobae)",
      "field": "ingredient_name",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Xíu Mại (Boulettes Vietnamiennes)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Xôi Mặn (Riz Gluant Salé)",
      "field": "ingredient_name",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Bánh Xèo (Crêpe Vietnamienne)",
      "field": "ingredient_name",
      "old_value": "bière",
      "new_value": "bouillon",
      "rule_id": "alcohol.biere",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Bánh Xèo (Crêpe Vietnamienne)",
      "field": "ingredient_name",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Bún Bò Huế (Cooking Therapy)",
      "field": "ingredient_name",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Vietnamese Pizza (Bánh Tráng Nướng)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-recipetineats-vietnamese.sql",
      "recipe_name": "Red Vietnamese Fried Rice (RecipeTin Eats)",
      "field": "ingredient_name",
      "old_value": "jambon",
      "new_value": "dinde fumee",
      "rule_id": "pork.jambon.to_dinde_fumee",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Panang Curry (Hot Thai Kitchen)",
      "field": "ingredient_name",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Rad Na (Nouilles Sauce Porc)",
      "field": "ingredient_name",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Rad Na (Nouilles Sauce Porc)",
      "field": "ingredient_name",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Yum Woon Sen (Salade de Vermicelles)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Yum Woon Sen (Salade de Vermicelles)",
      "field": "ingredient_notes",
      "old_value": "porc",
      "new_value": "boeuf",
      "rule_id": "pork.porc.to_boeuf",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gapao Rice (Riz au Porc-Basilic Japonais)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gyudon (Bol Riz Bœuf Japonais)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gyudon (Bol Riz Bœuf Japonais)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Mapo Tofu Style Japonais (10 min)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Mapo Tofu Style Japonais (10 min)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Oyakodon (Bol Riz Poulet-Œuf)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Oyakodon (Bol Riz Poulet-Œuf)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Pizza Toast Japonais",
      "field": "ingredient_name",
      "old_value": "jambon",
      "new_value": "dinde fumee",
      "rule_id": "pork.jambon.to_dinde_fumee",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Saumon Teriyaki (Just One Cookbook)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Saumon Teriyaki (Just One Cookbook)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Saumon Teriyaki (Just One Cookbook)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Shrimp Fried Rice (Ebi Chahan)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Soboro Udon (Nouilles Udon Sauce Poulet)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Tori Soboro Donburi",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Tori Soboro Donburi",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Yaki Keema Curry (Curry Japonais Gratiné)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Yakitori Don",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Beoseot Gangjeong (Champignons Croustillants)",
      "field": "ingredient_name",
      "old_value": "vin de riz",
      "new_value": "bouillon leger et vinaigre de riz",
      "rule_id": "alcohol.vin_de_riz.to_light_broth_rice_vinegar",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Beoseot Gangjeong (Champignons Croustillants)",
      "field": "ingredient_notes",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Bibimbap (Korean Bapsang)",
      "field": "ingredient_name",
      "old_value": "vin de cuisine",
      "new_value": "bouillon leger",
      "rule_id": "alcohol.vin_de_cuisine.to_light_broth",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Dakgangjeong (Sweet Crispy Chicken)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Dakgangjeong (Sweet Crispy Chicken)",
      "field": "ingredient_name",
      "old_value": "vin de riz",
      "new_value": "bouillon leger et vinaigre de riz",
      "rule_id": "alcohol.vin_de_riz.to_light_broth_rice_vinegar",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Gamja Jorim (Pommes de Terre Braisées)",
      "field": "ingredient_name",
      "old_value": "vin de riz",
      "new_value": "bouillon leger et vinaigre de riz",
      "rule_id": "alcohol.vin_de_riz.to_light_broth_rice_vinegar",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Gamja Jorim (Pommes de Terre Braisées)",
      "field": "ingredient_notes",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Gungjung Tteokbokki (Royal Court)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Kimchi Jjigae (Ragoût de Kimchi)",
      "field": "ingredient_name",
      "old_value": "porc belly",
      "new_value": "boeuf gras",
      "rule_id": "pork.porc_belly.to_beef_fatty",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Kimchi Jjigae (Ragoût de Kimchi)",
      "field": "ingredient_notes",
      "old_value": "porc gras",
      "new_value": "boeuf gras",
      "rule_id": "pork.porc_gras.to_beef_fatty",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Kimchijeon (Crêpe au Kimchi)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Yangnyeom Chicken (Poulet Frit Coréen)",
      "field": "ingredient_name",
      "old_value": "vin de riz",
      "new_value": "bouillon leger et vinaigre de riz",
      "rule_id": "alcohol.vin_de_riz.to_light_broth_rice_vinegar",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Yangnyeom Chicken (Poulet Frit Coréen)",
      "field": "ingredient_notes",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Air Fryer Lemon Chicken",
      "field": "ingredient_name",
      "old_value": "vin de Shaoxing",
      "new_value": "bouillon de poulet et vinaigre de cidre",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Air Fryer Lemon Chicken",
      "field": "ingredient_notes",
      "old_value": "xérès",
      "new_value": "bouillon et vinaigre de cidre",
      "rule_id": "alcohol.xeres.to_broth_cider",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Cheesy Gochujang Baked Potatoes",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "High-Protein Gyudon Bowl (Rice Cooker)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Pad Krapow Street Food",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Steak Sauce Miso-Champignons Crémeuse",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Steak Sauce Miso-Champignons Crémeuse",
      "field": "ingredient_notes",
      "old_value": "vin blanc",
      "new_value": "bouillon et jus de citron",
      "rule_id": "alcohol.vin_blanc.to_broth_lemon",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-misc-asian.sql",
      "recipe_name": "Oyakodon (Okonomi Kitchen)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-misc-asian.sql",
      "recipe_name": "Oyakodon (Okonomi Kitchen)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-misc-asian.sql",
      "recipe_name": "Oyakodon (Okonomi Kitchen)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mizkanchef.sql",
      "recipe_name": "Cuisse de Poulet Glacée Sésame Noir & Oignons Verts",
      "field": "ingredient_notes",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Easy Kimbap (Yachae Kimbap)",
      "field": "ingredient_name",
      "old_value": "jambon",
      "new_value": "dinde fumee",
      "rule_id": "pork.jambon.to_dinde_fumee",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Gilgeori Toast (My Korean Kitchen)",
      "field": "ingredient_name",
      "old_value": "jambon",
      "new_value": "dinde fumee",
      "rule_id": "pork.jambon.to_dinde_fumee",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Kimchi Bokkeumbap (Kimchi Fried Rice)",
      "field": "ingredient_name",
      "old_value": "bacon",
      "new_value": "beef bacon",
      "rule_id": "pork.bacon.to_beef_bacon",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Korean Curry Rice (Kare Rice)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Korean Mala Fried Chicken",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Tuna Mayo Rice Bowl (Chamchi Deopbap)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Chicken Katsudon (Sudachi)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Mabo Tofu (Sudachi)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Mabo Tofu (Sudachi)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Salmon Sashimi Donburi",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Salmon Sashimi Donburi",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Salmon Sashimi Donburi",
      "field": "ingredient_notes",
      "old_value": "xérès",
      "new_value": "bouillon et vinaigre de cidre",
      "rule_id": "alcohol.xeres.to_broth_cider",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Shio Koji Karaage",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Shio Koji Karaage",
      "field": "ingredient_notes",
      "old_value": "vin blanc",
      "new_value": "bouillon et jus de citron",
      "rule_id": "alcohol.vin_blanc.to_broth_lemon",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Burgers (Sudachi)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Burgers (Sudachi)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Burgers (Sudachi)",
      "field": "ingredient_name",
      "old_value": "porc haché",
      "new_value": "boeuf hache",
      "rule_id": "pork.porc_hache.to_beef_minced",
      "quality_flag": "porc_substituted"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Chicken Croustillant (Sudachi)",
      "field": "ingredient_name",
      "old_value": "mirin",
      "new_value": "vinaigre de riz, sucre et eau (3:1:3)",
      "rule_id": "alcohol.mirin",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Chicken Croustillant (Sudachi)",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Tori Chili",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Tori Chili",
      "field": "ingredient_name",
      "old_value": "saké",
      "new_value": "bouillon dashi",
      "rule_id": "alcohol.sake.to_dashi",
      "quality_flag": "alcohol_removed"
    }
  ],
  "violations_remaining": [
    {
      "source_file": "supabase/seeds/2026-05-19-add-fried-rice-bowls.sql",
      "recipe_name": "Bulgogi-Style Beef Fried Rice",
      "field": "description",
      "location": "description",
      "value": "…: entrecôte mariné poire-mirin-soja blendé, riz jasmin …",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-fried-rice-bowls.sql",
      "recipe_name": "Bulgogi-Style Beef Fried Rice",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…r au blender sauce soja, mirin, poire asiatique, oignon…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-fried-rice-bowls.sql",
      "recipe_name": "Teriyaki Glazed Salmon",
      "field": "description",
      "location": "description",
      "value": "…i maison (soja-cassonade-mirin-sésame), prêt en 20 minu…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-fried-rice-bowls.sql",
      "recipe_name": "Teriyaki Glazed Salmon",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…sonade, huile de sésame, mirin, ail émincé et gingembre…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Beef Hor Fun (Black Bean Sauce)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "… émincé avec sauce soja, vin de Shaoxing et fécule de maïs 15 min…",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Cheung Fun aux Crevettes (Express)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…ariner avec sel, poivre, vin de Shaoxing et huile de sésame. Rése…",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Don't Worry Rice Bowl",
      "field": "description",
      "location": "description",
      "value": "…od, Don't Worry\" (我没事) : porc haché sauté, œufs ajouté…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Don't Worry Rice Bowl",
      "field": "description",
      "location": "description",
      "value": "…od, Don't Worry\" (我没事) : porc haché sauté, œufs ajoutés sur …",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Don't Worry Rice Bowl",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…tion. Verser un trait de vin de riz si utilisé.",
      "rule_id": "alcohol.vin_de_riz.to_light_broth_rice_vinegar"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Don't Worry Rice Bowl",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…ok à feu vif. Ajouter le porc haché (ou poulet) et sau…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Don't Worry Rice Bowl",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…ok à feu vif. Ajouter le porc haché (ou poulet) et sauter en…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Don't Worry Rice Bowl",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "…en mélanger pour enrober porc et œufs.",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-instagram-recipes.sql",
      "recipe_name": "Garlic Steak Fried Rice",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…n cubes avec sauce soja, vin de Shaoxing et fécule de maïs 15 min…",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Bulgogi Grilled Cheese",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…, huile de sésame, miel, mirin, cassonade et poivre jus…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Double Bacon Smash Cheeseburger",
      "field": "description",
      "location": "description",
      "value": "Smash burger double bacon : steak haché 80/20 mari…",
      "rule_id": "pork.bacon.to_beef_bacon"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Double Bacon Smash Cheeseburger",
      "field": "instructions",
      "location": "instructions[10]",
      "value": "…bun bas, sauce, patties, bacon, oignons caramélisés, sa…",
      "rule_id": "pork.bacon.to_beef_bacon"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Double Bacon Smash Cheeseburger",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "Ajouter le sherry et continuer 45-60 min d…",
      "rule_id": "alcohol.sherry.to_broth_cider"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Double Bacon Smash Cheeseburger",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "Cuire le bacon au four à 190°C (375°F) …",
      "rule_id": "pork.bacon.to_beef_bacon"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "description",
      "location": "description",
      "value": "…s teriyaki maison (soja, mirin, sake, bonite, kombu), œ…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "description",
      "location": "description",
      "value": "…aki maison (soja, mirin, sake, bonite, kombu), œuf bro…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "description",
      "location": "description",
      "value": "…t japonais avec cubes de SPAM glacés teriyaki maison (…",
      "rule_id": "pork.spam.to_beef_smoked"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "instructions",
      "location": "instructions[13]",
      "value": "Mélanger le SPAM glacé. Garnir d'oignons …",
      "rule_id": "pork.spam.to_beef_smoked"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "Ajouter sake et réduire de moitié.",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "Verser soja, mirin, sucre, miel et oignons …",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "SPAM : couper en cubes, chauf…",
      "rule_id": "pork.spam.to_beef_smoked"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "Cuire le SPAM jusqu'à doré et croustil…",
      "rule_id": "pork.spam.to_beef_smoked"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "SPAM Teriyaki Fried Rice",
      "field": "instructions",
      "location": "instructions[6]",
      "value": "Glacer le SPAM avec 3 c. à soupe de sau…",
      "rule_id": "pork.spam.to_beef_smoked"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql",
      "recipe_name": "Tuscan Chicken Pasta",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "Déglacer au vin blanc et au bouillon, réduire …",
      "rule_id": "alcohol.vin_blanc.to_broth_lemon"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Air Fryer Rice Paper Rolls",
      "field": "description",
      "location": "description",
      "value": "…à l'air fryer, garnis de porc haché, légumes croquants…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Air Fryer Rice Paper Rolls",
      "field": "description",
      "location": "description",
      "value": "…à l'air fryer, garnis de porc haché, légumes croquants et ch…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Air Fryer Rice Paper Rolls",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "Ajouter le porc haché, l'écraser à la sp…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Air Fryer Rice Paper Rolls",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "Ajouter le porc haché, l'écraser à la spatule …",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Cheesy Nduja Slider",
      "field": "description",
      "location": "description",
      "value": "…mélange oignons confits, chorizo, mozzarella et nduja piq…",
      "rule_id": "pork.chorizo.to_beef_chorizo"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Cheesy Nduja Slider",
      "field": "description",
      "location": "description",
      "value": "…, chorizo, mozzarella et nduja piquante, grillé jusqu'à…",
      "rule_id": "pork.nduja.to_beef_spicy_sausage"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Cheesy Nduja Slider",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…ans un saladier. Ajouter chorizo, persil, mozzarella, pât…",
      "rule_id": "pork.chorizo.to_beef_chorizo"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Cheesy Nduja Slider",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…sil, mozzarella, pâte de nduja, une pincée de sel et le…",
      "rule_id": "pork.nduja.to_beef_spicy_sausage"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mapo Tofu Udon",
      "field": "description",
      "location": "description",
      "value": "…soyeux mixé d'un côté et porc haché épicé Sichuan de l…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mapo Tofu Udon",
      "field": "description",
      "location": "description",
      "value": "…soyeux mixé d'un côté et porc haché épicé Sichuan de l'autre…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mapo Tofu Udon",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "… 30 secondes. Ajouter le porc haché, stir-fry 5 minute…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mapo Tofu Udon",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "… 30 secondes. Ajouter le porc haché, stir-fry 5 minutes.",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mapo Tofu Udon",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "Incorporer le vin de Shaoxing, le vinaigre noir, le ch…",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mapo Tofu Udon",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…de plus jusqu'à dorer le porc.",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mapo Tofu Udon",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "…entre 2 bols. Déposer le porc épicé d'un côté et la cr…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mexican Pambazo Sandwich",
      "field": "description",
      "location": "description",
      "value": "…ments guajillo, garni de chorizo, pommes de terre, laitue…",
      "rule_id": "pork.chorizo.to_beef_chorizo"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mexican Pambazo Sandwich",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…utre moitié d'oignon, le chorizo et les pommes de terre a…",
      "rule_id": "pork.chorizo.to_beef_chorizo"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Mexican Pambazo Sandwich",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "… pain. Tartiner de farce chorizo-pomme de terre, ajouter …",
      "rule_id": "pork.chorizo.to_beef_chorizo"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Okonomiyaki Traybake",
      "field": "description",
      "location": "description",
      "value": "…surmontée de tranches de bacon, nappée d'okonomiyaki sa…",
      "rule_id": "pork.bacon.to_beef_bacon"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Okonomiyaki Traybake",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…iformément, recouvrir de bacon et cuire 20 minutes.",
      "rule_id": "pork.bacon.to_beef_bacon"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-myriadrecipes.sql",
      "recipe_name": "Okonomiyaki Traybake",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "…rtir du four une fois le bacon croustillant. Étaler la …",
      "rule_id": "pork.bacon.to_beef_bacon"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-nguyenfoodstall.sql",
      "recipe_name": "Beef Bulgogi Bibimbap Bowl",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…e : mélanger sauce soja, mirin, huile de sésame, ail ha…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Karaage (Japanese Fried Chicken)",
      "field": "description",
      "location": "description",
      "value": "… : cuisses marinées soja-saké-gingembre, enrobées de f…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Karaage (Japanese Fried Chicken)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…l avec sauce soja, saké, mirin et gingembre râpé (avec …",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Karaage (Japanese Fried Chicken)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "… un bol avec sauce soja, saké, mirin et gingembre râpé…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Korokke",
      "field": "description",
      "location": "description",
      "value": "…gèrement sucré-salé soja-mirin-saké, croûte panko ultra…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Korokke",
      "field": "description",
      "location": "description",
      "value": "…nt sucré-salé soja-mirin-saké, croûte panko ultra-crou…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Korokke",
      "field": "description",
      "location": "description",
      "value": "…e terre + viande hachée (porc ou mix) : intérieur moel…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Korokke",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "…rporer sauce soja, saké, mirin et sucre. Bien mélanger.…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Korokke",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "…. Incorporer sauce soja, saké, mirin et sucre. Bien mé…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "description",
      "location": "description",
      "value": "… teriyaki épaissie (soja-mirin-saké-sucre-gingembre-ail…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "description",
      "location": "description",
      "value": "…aki épaissie (soja-mirin-saké-sucre-gingembre-ail-ketc…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "description",
      "location": "description",
      "value": "…ald's Japon : galette de porc haché (oignon, panko-lai…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "description",
      "location": "description",
      "value": "…ald's Japon : galette de porc haché (oignon, panko-lait, mus…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…ki : verser sauce soja + mirin + saké + sucre + eau dan…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…ser sauce soja + mirin + saké + sucre + eau dans une c…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "Galettes : mélanger porc haché, oignon haché fin,…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "McDonald's Teriyaki Burger (Copycat)",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "Galettes : mélanger porc haché, oignon haché fin, œuf, …",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Okinawan Taco Rice",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "Incorporer saké, sucre, sauce soja, ketc…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Oyako-don",
      "field": "description",
      "location": "description",
      "value": "…ignon mijotés dans dashi-mirin-soja, terminés avec un œ…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Oyako-don",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Mélanger dashi, mirin et sauce soja dans un bo…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Tebasaki (Nagoya Fried Chicken Wings)",
      "field": "description",
      "location": "description",
      "value": "…eonnées d'une sauce soja-mirin-saké-sucre-gingembre-ail…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Tebasaki (Nagoya Fried Chicken Wings)",
      "field": "description",
      "location": "description",
      "value": "…s d'une sauce soja-mirin-saké-sucre-gingembre-ail, fin…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Tebasaki (Nagoya Fried Chicken Wings)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Sauce : porter saké, mirin, sauce soja, ail râpé, g…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Tebasaki (Nagoya Fried Chicken Wings)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Sauce : porter saké, mirin, sauce soja, ail …",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Yakitori",
      "field": "description",
      "location": "description",
      "value": "…. Sauce tare maison soja-mirin-sucre réduite, badigeonn…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Yakitori",
      "field": "description",
      "location": "description",
      "value": "…ukimi (oignon entier) et lard-asperges. Sauce tare mai…",
      "rule_id": "pork.lard.to_beef_fat"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Yakitori",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…re : porter sauce soja + mirin + sucre à ébullition dan…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Yakitori",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "Lard-asperges : blanchir les …",
      "rule_id": "pork.lard.to_beef_fat"
    },
    {
      "source_file": "supabase/seeds/2026-05-19-add-recipetineats-japan.sql",
      "recipe_name": "Yakitori",
      "field": "instructions",
      "location": "instructions[7]",
      "value": "Brochettes lard-asperges : cuire 3 min d…",
      "rule_id": "pork.lard.to_beef_fat"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Bún Bò Huế (Bunbobae)",
      "field": "description",
      "location": "description",
      "value": "…lles au bœuf et pieds de porc épicée originaire de Huế…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Bún Bò Huế (Bunbobae)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Plonger les pieds de porc et le jarret de bœuf dan…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Bún Bò Huế (Bunbobae)",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "…es, retirer les pieds de porc ; quand le jarret est te…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Bún Bò Huế (Bunbobae)",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "Remettre les pieds de porc dans le bouillon, ajoute…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Xíu Mại (Boulettes Vietnamiennes)",
      "field": "description",
      "location": "description",
      "value": "Boulettes tendres porc-crevettes avec une touch…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Xíu Mại (Boulettes Vietnamiennes)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Mélanger délicatement porc haché, crevettes hachées…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Xíu Mại (Boulettes Vietnamiennes)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Mélanger délicatement porc haché, crevettes hachées, jica…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-bunbobae.sql",
      "recipe_name": "Xôi Mặn (Riz Gluant Salé)",
      "field": "instructions",
      "location": "instructions[7]",
      "value": "…ncorporer l'effiloché de porc et la sauce soja restant…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Bánh Xèo (Crêpe Vietnamienne)",
      "field": "description",
      "location": "description",
      "value": "…te au curcuma, garnie de porc, crevettes et germes de …",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Bánh Xèo (Crêpe Vietnamienne)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…, curcuma, lait de coco, bière, œuf, eau et sel ; laiss…",
      "rule_id": "alcohol.biere"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Bánh Xèo (Crêpe Vietnamienne)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…ire bouillir l'épaule de porc 30 minutes, puis tranche…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Bánh Xèo (Crêpe Vietnamienne)",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "Ajouter le porc tranché et 1 c. à soupe …",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Bún Bò Huế (Cooking Therapy)",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "Ajouter jarrets de porc, oignon, daïkon et citro…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Bún Bò Huế (Cooking Therapy)",
      "field": "instructions",
      "location": "instructions[9]",
      "value": "… bœuf tranché, jarret de porc, herbes fraîches puis ve…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Vietnamese Pizza (Bánh Tráng Nướng)",
      "field": "description",
      "location": "description",
      "value": "…guise de sauce, garni de porc haché, mayonnaise Kewpie…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Vietnamese Pizza (Bánh Tráng Nướng)",
      "field": "description",
      "location": "description",
      "value": "…guise de sauce, garni de porc haché, mayonnaise Kewpie, srir…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Vietnamese Pizza (Bánh Tráng Nướng)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Mélanger porc haché, sel, poivre, sucr…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Vietnamese Pizza (Bánh Tráng Nướng)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Mélanger porc haché, sel, poivre, sucre et s…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-cooking-therapy.sql",
      "recipe_name": "Vietnamese Pizza (Bánh Tráng Nướng)",
      "field": "instructions",
      "location": "instructions[8]",
      "value": "Ajouter 2-3 cuillères de porc, retirer du feu, garnir …",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-recipetineats-vietnamese.sql",
      "recipe_name": "Red Vietnamese Fried Rice (RecipeTin Eats)",
      "field": "description",
      "location": "description",
      "value": "…tnamien rouge enrichi de jambon, petits pois et œuf brou…",
      "rule_id": "pork.jambon.to_dinde_fumee"
    },
    {
      "source_file": "supabase/seeds/2026-05-20-add-recipetineats-vietnamese.sql",
      "recipe_name": "Red Vietnamese Fried Rice (RecipeTin Eats)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "Ajouter le jambon haché et remuer 30 secon…",
      "rule_id": "pork.jambon.to_dinde_fumee"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Panang Curry (Hot Thai Kitchen)",
      "field": "description",
      "location": "description",
      "value": "…à séparation de l'huile, porc tranché fin, sucre de pa…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Panang Curry (Hot Thai Kitchen)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Mariner le porc avec sauce de poisson et…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Panang Curry (Hot Thai Kitchen)",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "Ajouter le porc tranché et l'enrober rap…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Panang Curry (Hot Thai Kitchen)",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "… remuer 1 minute jusqu'à porc juste cuit (pas plus).",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Rad Na (Nouilles Sauce Porc)",
      "field": "description",
      "location": "description",
      "value": "…s d'une sauce épaisse au porc mariné, brocoli chinois …",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Rad Na (Nouilles Sauce Porc)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Mariner le porc en lanières avec sauce s…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Rad Na (Nouilles Sauce Porc)",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "…acer avec le bouillon de porc.",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Rad Na (Nouilles Sauce Porc)",
      "field": "instructions",
      "location": "instructions[7]",
      "value": "…ioca dans l'eau, ajouter porc mariné et brocoli chinoi…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Yum Woon Sen (Salade de Vermicelles)",
      "field": "description",
      "location": "description",
      "value": "… de soja avec crevettes, porc haché, tomates, oignon, …",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Yum Woon Sen (Salade de Vermicelles)",
      "field": "description",
      "location": "description",
      "value": "… de soja avec crevettes, porc haché, tomates, oignon, céleri…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-hotthaikitchen.sql",
      "recipe_name": "Yum Woon Sen (Salade de Vermicelles)",
      "field": "instructions",
      "location": "instructions[6]",
      "value": "…l'eau restante, cuire le porc avec 1 c. à café de sauc…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gapao Rice (Riz au Porc-Basilic Japonais)",
      "field": "description",
      "location": "description",
      "value": "…o thaïlandais : sauté de porc au basilic relevé d'ail …",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gapao Rice (Riz au Porc-Basilic Japonais)",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "Incorporer le porc haché et l'émietter à la…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gapao Rice (Riz au Porc-Basilic Japonais)",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "Incorporer le porc haché et l'émietter à la spatu…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gyudon (Bol Riz Bœuf Japonais)",
      "field": "description",
      "location": "description",
      "value": "…-salée au dashi, saké et mirin. Plat fast-food japonais…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gyudon (Bol Riz Bœuf Japonais)",
      "field": "description",
      "location": "description",
      "value": "…e sucrée-salée au dashi, saké et mirin. Plat fast-food…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gyudon (Bol Riz Bœuf Japonais)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…ide, verser dashi, saké, mirin, sauce soja et sucre, mé…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Gyudon (Bol Riz Bœuf Japonais)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…le froide, verser dashi, saké, mirin, sauce soja et su…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Mapo Tofu Style Japonais (10 min)",
      "field": "description",
      "location": "description",
      "value": "… japonais : tofu soyeux, porc haché, doubanjiang, miso…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Mapo Tofu Style Japonais (10 min)",
      "field": "description",
      "location": "description",
      "value": "… japonais : tofu soyeux, porc haché, doubanjiang, miso blanc…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Mapo Tofu Style Japonais (10 min)",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "Ajouter le porc haché et le détacher à l…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Mapo Tofu Style Japonais (10 min)",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "Ajouter le porc haché et le détacher à la spat…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Oyakodon (Bol Riz Poulet-Œuf)",
      "field": "description",
      "location": "description",
      "value": "…ans une sauce dashi-soja-mirin, liés par des œufs marbr…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Oyakodon (Bol Riz Poulet-Œuf)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…anger dashi, sauce soja, mirin et sucre jusqu'à dissolu…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Oyakodon (Bol Riz Poulet-Œuf)",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "… en sogigiri, arroser de saké et reposer 5 minutes.",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Pizza Toast Japonais",
      "field": "description",
      "location": "description",
      "value": "… de sauce tomate maison, jambon, oignons, poivrons, toma…",
      "rule_id": "pork.jambon.to_dinde_fumee"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Pizza Toast Japonais",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "…nons doux, poivron vert, jambon en lanières et tomates c…",
      "rule_id": "pork.jambon.to_dinde_fumee"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Saumon Teriyaki (Just One Cookbook)",
      "field": "description",
      "location": "description",
      "value": "…e teriyaki maison (saké, mirin, sauce soja, sucre). Prê…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Saumon Teriyaki (Just One Cookbook)",
      "field": "description",
      "location": "description",
      "value": "…e sauce teriyaki maison (saké, mirin, sauce soja, sucr…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Saumon Teriyaki (Just One Cookbook)",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "…ner le filet, ajouter le saké, couvrir et baisser le f…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Shrimp Fried Rice (Ebi Chahan)",
      "field": "description",
      "location": "description",
      "value": "…ux, crevettes saisies au saké et sel.",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Shrimp Fried Rice (Ebi Chahan)",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "…outer les crevettes avec saké et sel, cuire jusqu'à co…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Soboro Udon (Nouilles Udon Sauce Poulet)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "Mélanger mirin, sauce soja et sucre dan…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Tori Soboro Donburi",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "… haché, gingembre, saké, mirin, sucre et sauce soja.",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Tori Soboro Donburi",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…poulet haché, gingembre, saké, mirin, sucre et sauce s…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Yakitori Don",
      "field": "description",
      "location": "description",
      "value": "…e yakitori sucrée-salée (mirin, sauce soja, sucre). Cap…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-justonecookbook.sql",
      "recipe_name": "Yakitori Don",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "Mélanger mirin, sauce soja et sucre jus…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Beoseot Gangjeong (Champignons Croustillants)",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…inaigre, sirop de riz et vin de riz ; porter à ébullition pu…",
      "rule_id": "alcohol.vin_de_riz.to_light_broth_rice_vinegar"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Dakgangjeong (Sweet Crispy Chicken)",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…oivre, ail, gingembre et vin de riz 20-30 minutes.",
      "rule_id": "alcohol.vin_de_riz.to_light_broth_rice_vinegar"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Gamja Jorim (Pommes de Terre Braisées)",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…sage (sauce soja, sucre, mirin, sirop, ail, poivre, eau…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Gungjung Tteokbokki (Royal Court)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…ts de sauce (sauce soja, mirin, sucre, huile de sésame,…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Kimchi Jjigae (Ragoût de Kimchi)",
      "field": "description",
      "location": "description",
      "value": "…i fermenté bien aigre et porc gras mijotés dans un bou…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Kimchi Jjigae (Ragoût de Kimchi)",
      "field": "description",
      "location": "description",
      "value": "…i fermenté bien aigre et porc gras mijotés dans un bouillon…",
      "rule_id": "pork.porc_gras.to_beef_fatty"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Kimchi Jjigae (Ragoût de Kimchi)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…kimchi en morceaux et le porc en dés.",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Kimchi Jjigae (Ragoût de Kimchi)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…épaisse, ajouter kimchi, porc, gochugaru et ail.",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Yangnyeom Chicken (Poulet Frit Coréen)",
      "field": "description",
      "location": "description",
      "value": "…ante (ChiMaek = poulet + bière).",
      "rule_id": "alcohol.biere"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Air Fryer Lemon Chicken",
      "field": "description",
      "location": "description",
      "value": "…lante au gingembre, ail, vin de Shaoxing et sauce soja. Classique…",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Air Fryer Lemon Chicken",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…n, jus de citron, sucre, vin de Shaoxing et sauce soja claire ; m…",
      "rule_id": "alcohol.vin_de_shaoxing.to_chicken_broth_cider"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Cheesy Gochujang Baked Potatoes",
      "field": "description",
      "location": "description",
      "value": "…ro-ondes puis garnies de porc haché gochujang-ail-soja…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Cheesy Gochujang Baked Potatoes",
      "field": "description",
      "location": "description",
      "value": "…ro-ondes puis garnies de porc haché gochujang-ail-soja, toma…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Cheesy Gochujang Baked Potatoes",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…wok à feu vif. Étaler le porc haché et le saler. Laiss…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Cheesy Gochujang Baked Potatoes",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…wok à feu vif. Étaler le porc haché et le saler. Laisser sai…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Cheesy Gochujang Baked Potatoes",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "Retourner le porc et le casser à la spatul…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Cheesy Gochujang Baked Potatoes",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "… jusqu'à bien combiné et porc cuit. Hors du feu, incor…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Cheesy Gochujang Baked Potatoes",
      "field": "instructions",
      "location": "instructions[7]",
      "value": "…généreusement de mélange porc gochujang, surmonter de …",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "High-Protein Gyudon Bowl (Rice Cooker)",
      "field": "description",
      "location": "description",
      "value": "…e dans le bouillon dashi-mirin-soja, puis œufs battus c…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "High-Protein Gyudon Bowl (Rice Cooker)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…i en poudre, sauce soja, mirin et sucre. Remuer pour di…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Pad Krapow Street Food",
      "field": "description",
      "location": "description",
      "value": "…que du pad krapow thaï : porc haché sauté avec ail-pim…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Pad Krapow Street Food",
      "field": "description",
      "location": "description",
      "value": "…que du pad krapow thaï : porc haché sauté avec ail-piment pi…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Pad Krapow Street Food",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "Ajouter le porc haché, l'émietter à la s…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Pad Krapow Street Food",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "Ajouter le porc haché, l'émietter à la spatule…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Steak Sauce Miso-Champignons Crémeuse",
      "field": "description",
      "location": "description",
      "value": "…champignons caramélisés, saké et crème. Finition zeste…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-marionskitchen.sql",
      "recipe_name": "Steak Sauce Miso-Champignons Crémeuse",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "Verser le saké et laisser bouillonner 1…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-misc-asian.sql",
      "recipe_name": "Oyakodon (Okonomi Kitchen)",
      "field": "description",
      "location": "description",
      "value": "…biais) mijoté dans dashi-mirin-sauce soja avec oignon, …",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-misc-asian.sql",
      "recipe_name": "Oyakodon (Okonomi Kitchen)",
      "field": "instructions",
      "location": "instructions[3]",
      "value": "…on froide, mettre dashi, mirin, sucre, oignons et poule…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mizkanchef.sql",
      "recipe_name": "Cuisse de Poulet Glacée Sésame Noir & Oignons Verts",
      "field": "description",
      "location": "description",
      "value": "…agiku infusé aux lies de saké, gingembre et Honteri. G…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Easy Kimbap (Yachae Kimbap)",
      "field": "description",
      "location": "description",
      "value": "…elette, imitation crabe, jambon, radis jaune mariné (dan…",
      "rule_id": "pork.jambon.to_dinde_fumee"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Easy Kimbap (Yachae Kimbap)",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…s, bâtonnets de crabe et jambon environ 1 minute chacun …",
      "rule_id": "pork.jambon.to_dinde_fumee"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Easy Kimbap (Yachae Kimbap)",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "…: radis mariné, bardane, jambon, crabe, œuf, carotte, ép…",
      "rule_id": "pork.jambon.to_dinde_fumee"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Gilgeori Toast (My Korean Kitchen)",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "Ajouter fromage, jambon et autres garnitures sel…",
      "rule_id": "pork.jambon.to_dinde_fumee"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Kimchi Bokkeumbap (Kimchi Fried Rice)",
      "field": "description",
      "location": "description",
      "value": "…mchi fermenté sauté avec bacon et jus de kimchi, mélang…",
      "rule_id": "pork.bacon.to_beef_bacon"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Kimchi Bokkeumbap (Kimchi Fried Rice)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "…econdes, puis ajouter le bacon et remuer jusqu'à semi-c…",
      "rule_id": "pork.bacon.to_beef_bacon"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Korean Curry Rice (Kare Rice)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…r le bœuf en dés avec le mirin 5 minutes.",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Korean Mala Fried Chicken",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…bouchées, les arroser de mirin et réserver pendant la p…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Tuna Mayo Rice Bowl (Chamchi Deopbap)",
      "field": "description",
      "location": "description",
      "value": "…s caramélisés sauce soja-mirin sur riz vapeur. Repas ét…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-mykoreankitchen.sql",
      "recipe_name": "Tuna Mayo Rice Bowl (Chamchi Deopbap)",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…ter sauce soja, sucre et mirin ; mijoter jusqu'à caramé…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Chicken Katsudon (Sudachi)",
      "field": "description",
      "location": "description",
      "value": "…tée dans une sauce dashi-mirin-soja avec oignon, lié pa…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Chicken Katsudon (Sudachi)",
      "field": "instructions",
      "location": "instructions[6]",
      "value": "…ne poêle : verser dashi, mirin, sucre, poudre de bouill…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Mabo Tofu (Sudachi)",
      "field": "description",
      "location": "description",
      "value": "…u mapo tofu du Sichuan : porc haché, tofu ferme et oig…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Mabo Tofu (Sudachi)",
      "field": "description",
      "location": "description",
      "value": "…u mapo tofu du Sichuan : porc haché, tofu ferme et oignon da…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Mabo Tofu (Sudachi)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Saisir le porc haché à feu moyen-vif 30…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Mabo Tofu (Sudachi)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Saisir le porc haché à feu moyen-vif 30 secon…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Mabo Tofu (Sudachi)",
      "field": "instructions",
      "location": "instructions[2]",
      "value": "…rporer 0,5 c. à soupe de saké, 0,5 c. à soupe de sauce…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Mabo Tofu (Sudachi)",
      "field": "instructions",
      "location": "instructions[5]",
      "value": "Incorporer le reste du saké, sauce soja, sauce huîtr…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Salmon Sashimi Donburi",
      "field": "description",
      "location": "description",
      "value": "…inés dans une sauce soja-mirin-saké infusée au kombu. A…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Salmon Sashimi Donburi",
      "field": "description",
      "location": "description",
      "value": "…ans une sauce soja-mirin-saké infusée au kombu. Avocat…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Salmon Sashimi Donburi",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Verser sauce soja, mirin et saké dans une cassero…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Salmon Sashimi Donburi",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…ser sauce soja, mirin et saké dans une casserole et po…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Shio Koji Karaage",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "Ajouter shio koji, saké, sauce soja claire, ging…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Burgers (Sudachi)",
      "field": "description",
      "location": "description",
      "value": "… au panko trempé dans le saké, malaxage activé pour co…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Burgers (Sudachi)",
      "field": "description",
      "location": "description",
      "value": "…japonais à la galette de porc-miso glacée à la sauce t…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Burgers (Sudachi)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…langer sauce soja, saké, mirin et miel pour la sauce te…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Burgers (Sudachi)",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "Tremper le panko dans le saké quelques minutes ; mélan…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Burgers (Sudachi)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "Malaxer le porc haché avec sel et miso b…",
      "rule_id": "pork.porc.to_boeuf"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Burgers (Sudachi)",
      "field": "instructions",
      "location": "instructions[1]",
      "value": "Malaxer le porc haché avec sel et miso blanc j…",
      "rule_id": "pork.porc_hache.to_beef_minced"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Chicken Croustillant (Sudachi)",
      "field": "description",
      "location": "description",
      "value": "…e teriyaki maison (saké, mirin, sauce soja, sucre, dash…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Chicken Croustillant (Sudachi)",
      "field": "description",
      "location": "description",
      "value": "…a sauce teriyaki maison (saké, mirin, sauce soja, sucr…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Chicken Croustillant (Sudachi)",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "Mélanger sauce soja, mirin, saké, sucre, dashi et m…",
      "rule_id": "alcohol.mirin"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Teriyaki Chicken Croustillant (Sudachi)",
      "field": "instructions",
      "location": "instructions[4]",
      "value": "…anger sauce soja, mirin, saké, sucre, dashi et miel ju…",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Tori Chili",
      "field": "instructions",
      "location": "instructions[0]",
      "value": "…poivre blanc, ajouter le saké et mélanger.",
      "rule_id": "alcohol.sake.to_dashi"
    },
    {
      "source_file": "supabase/seeds/2026-05-21-add-sudachirecipes.sql",
      "recipe_name": "Tori Chili",
      "field": "instructions",
      "location": "instructions[7]",
      "value": "…e sauce (ketchup, sucre, saké, eau, bouillon, dashi) e…",
      "rule_id": "alcohol.sake.to_dashi"
    }
  ]
}
$manifest$;
  v_change          JSONB;
  v_manifest_version INT;
  v_rule_id          TEXT;
  v_domain           TEXT;
  v_version_key      TEXT;
  v_recipe_name      TEXT;
  v_field            TEXT;
  v_old_value        TEXT;
  v_new_value        TEXT;
  v_quality_flag     TEXT;
  v_source_file      TEXT;

  v_recipe_id        UUID;
  v_recipe_user      UUID;
  v_match_count      INT;
  v_existing_value   TEXT;
  v_normalized_name  TEXT;
  v_already_done     BOOL;

  v_ingredient_id    UUID;
  v_ingredient_value TEXT;
  v_new_field_value  TEXT;
  v_applied_at       TIMESTAMPTZ := now();
BEGIN
  v_manifest_version := (v_manifest ->> 'version')::INT;

  FOR v_change IN SELECT * FROM jsonb_array_elements(v_manifest -> 'changes')
  LOOP
    v_source_file  := v_change ->> 'source_file';
    v_recipe_name  := v_change ->> 'recipe_name';
    v_field        := v_change ->> 'field';
    v_old_value    := v_change ->> 'old_value';
    v_new_value    := v_change ->> 'new_value';
    v_rule_id      := v_change ->> 'rule_id';
    v_quality_flag := v_change ->> 'quality_flag';
    v_domain       := split_part(v_rule_id, '.', 1);
    v_version_key  := v_domain || '.v' || v_manifest_version::TEXT;

    -- 1. Resolve recipe by normalized(name). The v1 manifest carries no
    -- recipe_id or source_url; if duplicate names exist for different
    -- users we refuse to apply blindly.
    v_normalized_name := lower(unaccent(trim(regexp_replace(v_recipe_name, '\s+', ' ', 'g'))));

    SELECT r.id, r.user_id
      INTO v_recipe_id, v_recipe_user
      FROM public.recipes r
     WHERE lower(unaccent(trim(regexp_replace(r.name, '\s+', ' ', 'g')))) = v_normalized_name
     LIMIT 2;

    GET DIAGNOSTICS v_match_count = ROW_COUNT;

    IF v_match_count = 0 THEN
      INSERT INTO public.recipe_policy_skipped_log
        (manifest_version, recipe_name, field, expected_old_value, actual_value,
         rule_id, reason_skip, source_url)
      VALUES (v_manifest_version, v_recipe_name, v_field, v_old_value, NULL,
              v_rule_id, 'recipe_not_found', NULL);
      CONTINUE;
    ELSIF v_match_count > 1 THEN
      INSERT INTO public.recipe_policy_skipped_log
        (manifest_version, recipe_name, field, expected_old_value, actual_value,
         rule_id, reason_skip, source_url)
      VALUES (v_manifest_version, v_recipe_name, v_field, v_old_value, NULL,
              v_rule_id, 'recipe_match_ambiguous', NULL);
      CONTINUE;
    END IF;

    -- 2. Idempotency: already applied?
    SELECT (sanitization_versions ? v_version_key)
      INTO v_already_done
      FROM public.recipes
     WHERE id = v_recipe_id;

    IF COALESCE(v_already_done, FALSE) THEN
      -- Don't pollute skipped_log for the expected re-run case; emit a
      -- NOTICE instead so the dev sees the count when running migrations.
      RAISE NOTICE 'skip already_applied: recipe=% rule=%', v_recipe_name, v_rule_id;
      CONTINUE;
    END IF;

    -- 3. Find the ingredient row whose target field contains old_value
    -- as a bounded, accent-tolerant token.
    IF v_field = 'ingredient_name' THEN
      SELECT ri.id, ri.ingredient_name
        INTO v_ingredient_id, v_ingredient_value
        FROM public.recipe_ingredients ri
       WHERE ri.recipe_id = v_recipe_id
         AND public._policy_substitute(ri.ingredient_name, v_old_value, v_new_value) <> ri.ingredient_name
       LIMIT 1;
    ELSIF v_field = 'ingredient_notes' THEN
      SELECT ri.id, ri.notes
        INTO v_ingredient_id, v_ingredient_value
        FROM public.recipe_ingredients ri
       WHERE ri.recipe_id = v_recipe_id
         AND ri.notes IS NOT NULL
         AND public._policy_substitute(ri.notes, v_old_value, v_new_value) <> ri.notes
       LIMIT 1;
    ELSE
      INSERT INTO public.recipe_policy_skipped_log
        (manifest_version, recipe_id, recipe_name, field, expected_old_value,
         actual_value, rule_id, reason_skip)
      VALUES (v_manifest_version, v_recipe_id, v_recipe_name, v_field,
              v_old_value, NULL, v_rule_id, 'field_not_supported');
      CONTINUE;
    END IF;

    IF v_ingredient_id IS NULL THEN
      INSERT INTO public.recipe_policy_skipped_log
        (manifest_version, recipe_id, recipe_name, field, expected_old_value,
         actual_value, rule_id, reason_skip)
      VALUES (v_manifest_version, v_recipe_id, v_recipe_name, v_field,
              v_old_value, NULL, v_rule_id, 'old_value_not_found');
      CONTINUE;
    END IF;

    -- 4. Apply substitution on the matched field.
    IF v_field = 'ingredient_name' THEN
      v_new_field_value := public._policy_substitute(v_ingredient_value, v_old_value, v_new_value);
      UPDATE public.recipe_ingredients
         SET ingredient_name = v_new_field_value
       WHERE id = v_ingredient_id;
    ELSE -- ingredient_notes
      v_new_field_value := public._policy_substitute(v_ingredient_value, v_old_value, v_new_value);
      UPDATE public.recipe_ingredients
         SET notes = v_new_field_value
       WHERE id = v_ingredient_id;
    END IF;

    -- 5. Log correction (unique constraint catches re-runs naturally).
    INSERT INTO public.recipe_corrections_log
      (recipe_id, field, old_value, new_value, rule_id, quality_flag,
       manifest_version, applied_by)
    VALUES
      (v_recipe_id, v_field, v_ingredient_value, v_new_field_value, v_rule_id,
       v_quality_flag, v_manifest_version, 'prp-239-pr1b')
    ON CONFLICT DO NOTHING;

    -- 6. Update recipe-level provenance (sanitization_versions + quality_flags).
    UPDATE public.recipes
       SET recipe_facets = jsonb_set(
             recipe_facets,
             '{quality_flags}',
             COALESCE(
               (
                 SELECT jsonb_agg(DISTINCT flag)
                   FROM jsonb_array_elements_text(
                     COALESCE(recipe_facets -> 'quality_flags', '[]'::jsonb)
                     || to_jsonb(v_quality_flag)
                   ) AS t(flag)
               ),
               '[]'::jsonb
             ),
             TRUE
           ),
           sanitization_versions = sanitization_versions
             || jsonb_build_object(v_version_key, v_applied_at::TEXT),
           sanitized_at = v_applied_at
     WHERE id = v_recipe_id;
  END LOOP;

  RAISE NOTICE 'PRP-239 PR1b manifest application complete. Manifest version: %', v_manifest_version;
END;
$migration$;
