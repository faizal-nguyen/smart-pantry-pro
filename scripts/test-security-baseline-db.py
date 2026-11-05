#!/usr/bin/env python3
"""Real PostgreSQL test of 20261105090000_security_baseline.sql and of
supabase/checks/security-drift.sql, in a disposable local database.

Starts from the production state observed on 2026-11-05 (fixture), applies the
migration twice and checks what anon, two signed-in users and service_role can
do. Uses the local test server described in docs/implementations/V10-01.md
(Unix socket only, never TCP, never an existing database).
"""
import json
import os
from pathlib import Path
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[1]
PSQL = os.environ.get("V10_TEST_PSQL", "/opt/homebrew/opt/postgresql@16/bin/psql")
SOCKET = "/private/tmp/smart-grocery-v10-pg"
PORT = "55438"
DATABASE = "security_test_" + uuid.uuid4().hex[:12]
MIGRATION = ROOT / "supabase/migrations/20261105090000_security_baseline.sql"
DRIFT = ROOT / "supabase/checks/security-drift.sql"
A = "00000000-0000-4000-8000-00000000000a"
B = "00000000-0000-4000-8000-00000000000b"
PLAN_A = "10000000-0000-4000-8000-00000000000a"
PLAN_B = "10000000-0000-4000-8000-00000000000b"
RECIPE_A = "20000000-0000-4000-8000-00000000000a"
RECIPE_B = "20000000-0000-4000-8000-00000000000b"
checks = 0


def run(sql=None, *, role=None, user=None, file=None, database=DATABASE, error=None):
    command = [PSQL, "-X", "-q", "-A", "-t", "-h", SOCKET, "-p", PORT, "-d", database, "-v", "ON_ERROR_STOP=1"]
    if file:
        result = subprocess.run(command + ["-f", str(file)], text=True, capture_output=True)
    else:
        prefix = ""
        if role:
            prefix = f"SET ROLE {role};"
        if user:
            prefix += f"SELECT set_config('request.jwt.claim.sub', '{user}', false);"
        result = subprocess.run(command, input=prefix + sql, text=True, capture_output=True)
    if error:
        assert result.returncode != 0 and error in result.stderr, result.stderr or result.stdout
        return result.stderr
    assert result.returncode == 0, result.stderr
    lines = [line for line in result.stdout.strip().splitlines() if line]
    return lines[-1] if lines else ""


def check(label, condition):
    global checks
    assert condition, label
    checks += 1


def drift():
    return json.loads(run(file=DRIFT))


def policies(table):
    return run(f"SELECT string_agg(policyname, ',' ORDER BY policyname) FROM pg_policies "
               f"WHERE schemaname = 'public' AND tablename = '{table}';")


def seed():
    run(f"""
      INSERT INTO auth.users (id, email) VALUES ('{A}', 'a@example.test'), ('{B}', 'b@example.test');
      INSERT INTO public.products (name) VALUES ('Lait');
      INSERT INTO public.recipes (id, user_id, name) VALUES ('{RECIPE_A}', '{A}', 'Gratin'), ('{RECIPE_B}', '{B}', 'Curry');
      INSERT INTO public.weekly_meal_plans (id, user_id, week_start_date)
        VALUES ('{PLAN_A}', '{A}', '2026-11-02'), ('{PLAN_B}', '{B}', '2026-11-02');
      INSERT INTO public.meal_plan_entries (meal_plan_id, recipe_name) VALUES ('{PLAN_A}', 'Gratin'), ('{PLAN_B}', 'Curry');
      INSERT INTO public.user_meal_preferences (user_id, allergies) VALUES ('{A}', '{{arachide}}'), ('{B}', '{{gluten}}');
      INSERT INTO public.seasonal_products (is_active) VALUES (true);
      INSERT INTO public.recipes_catalog (title, is_verified, is_premium) VALUES ('Verified', true, false), ('Premium', false, true);
    """)


def before_migration():
    report = drift()
    check("the fixture starts unhealthy", report["ok"] is False)
    check("anon can call execute_raw_sql", "execute_raw_sql(text,text[])" in report["definer_callable_by_anon"])
    check("meal plans have no RLS", "weekly_meal_plans" in report["tables_without_rls"])
    check("anon reads auth.users through execute_raw_sql",
          "a@example.test" in run("SELECT public.execute_raw_sql('SELECT email FROM auth.users');", role="anon"))
    check("anon reads every meal plan", run("SELECT count(*) FROM public.weekly_meal_plans;", role="anon") == "2")


def after_migration():
    report = drift()
    check("drift check is clean: " + json.dumps(report), report["ok"] is True and all(
        value is None for key, value in report.items() if key != "ok"))
    check("execute_raw_sql is gone", run("SELECT count(*) FROM pg_proc WHERE proname = 'execute_raw_sql';") == "0")

    # anon: no personal data, no writes, catalogue of products still readable.
    for table in ("weekly_meal_plans", "meal_plan_entries", "user_meal_preferences", "recipes", "recipe_ingredients"):
        check(f"anon reads no {table}", run(f"SELECT count(*) FROM public.{table};", role="anon") == "0")
    check("anon still reads products", run("SELECT count(*) FROM public.products;", role="anon") == "1")
    run("INSERT INTO public.products (name) VALUES ('x');", role="anon", error="row-level security")
    run("INSERT INTO public.seasonal_products (is_active) VALUES (true);", role="anon", error="row-level security")
    for call in (f"public.assistant_merge_product_into('{A}', '{B}')", "public.cleanup_old_data()",
                 f"public.delete_user_data('{A}')", f"public.export_user_data('{A}')",
                 f"public.upsert_recipe_inventory_cache('{RECIPE_A}', '{A}', '{{}}')"):
        run(f"SELECT {call};", role="anon", error="permission denied")

    # Signed-in user A: own rows only.
    check("A sees only their plan", run("SELECT string_agg(id::text, ',') FROM public.weekly_meal_plans;",
                                        role="authenticated", user=A) == PLAN_A)
    check("A sees only their entries", run("SELECT count(*) FROM public.meal_plan_entries;",
                                           role="authenticated", user=A) == "1")
    check("A sees only their preferences", run("SELECT count(*) FROM public.user_meal_preferences;",
                                               role="authenticated", user=A) == "1")
    check("A cannot delete B's entries", run(f"WITH d AS (DELETE FROM public.meal_plan_entries WHERE meal_plan_id = '{PLAN_B}' RETURNING 1) SELECT count(*) FROM d;",
                                             role="authenticated", user=A) == "0")
    run(f"INSERT INTO public.weekly_meal_plans (user_id, week_start_date) VALUES ('{B}', '2026-11-09');",
        role="authenticated", user=A, error="row-level security")
    run(f"INSERT INTO public.meal_plan_entries (meal_plan_id, recipe_name) VALUES ('{PLAN_B}', 'x');",
        role="authenticated", user=A, error="row-level security")
    check("A still deletes their own entry", run(f"WITH d AS (DELETE FROM public.meal_plan_entries WHERE meal_plan_id = '{PLAN_A}' RETURNING 1) SELECT count(*) FROM d;",
                                                 role="authenticated", user=A) == "1")

    # Recipes: everyone signed in reads the catalogue, only the owner writes.
    check("A reads every recipe", run("SELECT count(*) FROM public.recipes;", role="authenticated", user=A) == "2")
    check("A updates their recipe", run(f"WITH u AS (UPDATE public.recipes SET name = 'Gratin 2' WHERE id = '{RECIPE_A}' RETURNING 1) SELECT count(*) FROM u;",
                                        role="authenticated", user=A) == "1")
    check("A cannot update B's recipe", run(f"WITH u AS (UPDATE public.recipes SET name = 'pwned' WHERE id = '{RECIPE_B}' RETURNING 1) SELECT count(*) FROM u;",
                                            role="authenticated", user=A) == "0")
    run(f"UPDATE public.recipes SET user_id = '{B}' WHERE id = '{RECIPE_A}';", role="authenticated", user=A,
        error="row-level security")
    run(f"INSERT INTO public.recipes (user_id, name) VALUES ('{B}', 'spoof');", role="authenticated", user=A,
        error="row-level security")
    run(f"INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name) VALUES ('{RECIPE_B}', 'sel');",
        role="authenticated", user=A, error="row-level security")
    run(f"INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name) VALUES ('{RECIPE_A}', 'sel');",
        role="authenticated", user=A)
    check("ingredients are readable when signed in", run("SELECT count(*) FROM public.recipe_ingredients;",
                                                         role="authenticated", user=B) == "1")

    # Products and reference data.
    run("INSERT INTO public.products (name) VALUES ('Beurre');", role="authenticated", user=A)
    check("signed-in users update products", run("WITH u AS (UPDATE public.products SET name = name RETURNING 1) SELECT count(*) FROM u;",
                                                 role="authenticated", user=A) == "2")
    check("reference data is readable", run("SELECT count(*) FROM public.seasonal_products;", role="anon") == "1")
    run("INSERT INTO public.emergency_meal_templates (name) VALUES ('x');", role="authenticated", user=A,
        error="row-level security")
    check("premium visibility no longer reads user_metadata",
          "Premium users" not in policies("recipes_catalog") and "Anyone can view verified recipes" in policies("recipes_catalog"))

    # Functions.
    check("A exports their own data", A in run(f"SELECT public.export_user_data('{A}');", role="authenticated", user=A))
    run(f"SELECT public.export_user_data('{B}');", role="authenticated", user=A, error="forbidden")
    run(f"SELECT public.delete_user_data('{B}');", role="authenticated", user=A, error="permission denied")
    run(f"SELECT public.delete_user_data('{B}');", role="service_role")
    run(f"SELECT public.assistant_merge_product_into('{A}', '{B}');", role="service_role")

    # Exactly the intended policies remain.
    check("meal plan policies", policies("weekly_meal_plans") == "own_meal_plans")
    check("preference policies", policies("user_meal_preferences") == "own_meal_preferences")
    check("emergency template policies", policies("emergency_meal_templates") == "read_reference")
    check("recipe policies", policies("recipes") ==
          "recipes_delete_own,recipes_insert_own,recipes_read_authenticated,recipes_update_own")
    check("product policies", policies("products") ==
          "Products are viewable by everyone,products_insert_authenticated,products_update_authenticated")


def main():
    run(f"CREATE DATABASE {DATABASE};", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/security-baseline-schema.sql")
        seed()
        before_migration()
        run(file=MIGRATION)
        after_migration()
        run(file=MIGRATION)
        check("second run changes nothing", drift()["ok"] is True and policies("recipes") ==
              "recipes_delete_own,recipes_insert_own,recipes_read_authenticated,recipes_update_own")
    finally:
        run(f"DROP DATABASE IF EXISTS {DATABASE} WITH (FORCE);", database="postgres")
    print(f"security baseline DB checks passed: {checks}")


if __name__ == "__main__":
    main()
