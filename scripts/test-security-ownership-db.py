#!/usr/bin/env python3
"""Real PostgreSQL test of 20261108160000_security_ownership.sql and of
supabase/checks/security-ownership.sql, in a disposable local database.

Starts from the security baseline fixture (prod state of 2026-11-05) with
20261105090000_security_baseline.sql applied, as prod was on 2026-11-07, then
applies the migration twice. Same local test server as test-security-baseline-db.py.
"""
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("baseline", Path(__file__).with_name("test-security-baseline-db.py"))
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)
run, check, ROOT = baseline.run, baseline.check, baseline.ROOT
A, B, RECIPE_A, RECIPE_B = baseline.A, baseline.B, baseline.RECIPE_A, baseline.RECIPE_B
MIGRATION = ROOT / "supabase/migrations/20261108160000_security_ownership.sql"
CHECK = ROOT / "supabase/checks/security-ownership.sql"
PUBLIC = "20000000-0000-4000-8000-0000000000cc"


def ownership():
    return json.loads(run(file=CHECK))


def as_user(sql, user):
    return run(sql, role="authenticated", user=user)


def prod_state():
    # What prod held on 2026-11-07 on top of the fixture: a public recipe, ingredients,
    # and the three old inventory functions (SECURITY INVOKER since 20261008151704).
    run(f"""
      INSERT INTO public.recipes (id, user_id, name, is_public) VALUES ('{PUBLIC}', '{B}', 'Soupe partagée', true);
      INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name)
        VALUES ('{RECIPE_A}', 'Gruyère'), ('{RECIPE_B}', 'Curcuma'), ('{PUBLIC}', 'Poireau');
      CREATE FUNCTION public.consume_inventory_item(p_item_id uuid, p_user_id uuid, p_amount numeric) RETURNS jsonb
        LANGUAGE sql SECURITY INVOKER AS $$ SELECT '{{}}'::jsonb $$;
      CREATE FUNCTION public.transfer_inventory(p_from uuid, p_to uuid, p_user_id uuid, p_amount numeric) RETURNS jsonb
        LANGUAGE sql SECURITY INVOKER AS $$ SELECT '{{}}'::jsonb $$;
      CREATE FUNCTION public.create_shopping_from_recipe(p_recipe_id uuid, p_user_id uuid) RETURNS jsonb
        LANGUAGE sql SECURITY INVOKER AS $$ SELECT '{{}}'::jsonb $$;
    """)


def before_migration():
    report = ownership()
    check("the prod state is reported", report["ok"] is False)
    check("recipes are read by everyone signed in", report["open_recipe_reads"] ==
          ["recipe_ingredients.recipe_ingredients_read_authenticated", "recipes.recipes_read_authenticated"])
    check("users can change products", report["product_changes_by_users"] == ["anon:DELETE", "anon:UPDATE", "authenticated:DELETE", "authenticated:UPDATE"])
    check("the old functions exist", len(report["old_inventory_functions"]) == 3)
    check("anon may write the meal plans", "weekly_meal_plans:INSERT" in report["anon_grants"])
    check("authenticated may truncate", "authenticated:recipes:TRUNCATE" in report["dangerous_grants"])
    check("A reads B's private recipe", as_user(f"SELECT count(*) FROM public.recipes WHERE id = '{RECIPE_B}';", A) == "1")


def after_migration():
    report = ownership()
    check("the check is clean: " + json.dumps(report), report["ok"] is True and all(
        value is None for key, value in report.items() if key != "ok"))
    check("A reads their recipe and the public one, not B's private one",
          as_user("SELECT string_agg(name, ',' ORDER BY name) FROM public.recipes;", A) == "Gratin,Soupe partagée")
    check("A reads the ingredients of those two only",
          as_user("SELECT string_agg(ingredient_name, ',' ORDER BY ingredient_name) FROM public.recipe_ingredients;", A) == "Gruyère,Poireau")
    check("B still reads and edits their own recipe", as_user(
        f"WITH u AS (UPDATE public.recipes SET name = 'Curry 2' WHERE id = '{RECIPE_B}' RETURNING 1) SELECT count(*) FROM u;", B) == "1")
    check("A cannot change a product", "permission denied" in run(
        "UPDATE public.products SET name = 'pwned';", role="authenticated", user=A, error="permission denied"))
    check("A can still add a product", as_user(
        "WITH i AS (INSERT INTO public.products (name) VALUES ('Sumac') RETURNING 1) SELECT count(*) FROM i;", A) == "1")
    check("service_role still changes products", run(
        "WITH u AS (UPDATE public.products SET name = name RETURNING 1) SELECT count(*) FROM u;", role="service_role") == "2")
    check("the old functions are gone", run(
        "SELECT count(*) FROM pg_proc WHERE proname IN ('consume_inventory_item', 'transfer_inventory', 'create_shopping_from_recipe');") == "0")
    check("anon still reads the catalogue and reference data",
          run("SELECT count(*) FROM public.products;", role="anon") == "2"
          and run("SELECT count(*) FROM public.seasonal_products;", role="anon") == "1")
    for table in ["weekly_meal_plans", "recipes", "user_meal_preferences"]:
        check(f"anon has no access to {table}", "permission denied" in run(
            f"SELECT count(*) FROM public.{table};", role="anon", error="permission denied"))
    check("authenticated cannot truncate", "permission denied" in run(
        "TRUNCATE public.recipes CASCADE;", role="authenticated", user=A, error="permission denied"))
    run("CREATE TABLE public.later_table (id int); ALTER TABLE public.later_table ENABLE ROW LEVEL SECURITY;")
    check("a table created later gives anon nothing and nobody TRUNCATE", ownership()["ok"] is True)
    run("DROP TABLE public.later_table;")


def main():
    run(f"CREATE DATABASE {baseline.DATABASE};", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/security-baseline-schema.sql")
        baseline.seed()
        run(file=baseline.MIGRATION)
        prod_state()
        before_migration()
        run(file=MIGRATION)
        after_migration()
        run(file=MIGRATION)
        check("second run changes nothing", ownership()["ok"] is True and baseline.policies("recipes") ==
              "recipes_delete_own,recipes_insert_own,recipes_read_own_or_public,recipes_update_own")
        check("the baseline check stays clean", baseline.drift()["ok"] is True)
    finally:
        run(f"DROP DATABASE IF EXISTS {baseline.DATABASE} WITH (FORCE);", database="postgres")
    print(f"security ownership DB checks passed: {baseline.checks}")


if __name__ == "__main__":
    main()
