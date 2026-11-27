#!/usr/bin/env python3
"""V11-06 S1: the GDPR export covers every table that holds an account's rows, on real local PostgreSQL.

Reuses the widest fixture and the seed of test-deletion-requests-db.py (same disposable database and
local socket as test-v10-stock-db.py). Starts from the export of 20260517071100, which lists four
tables by hand, so the test fails until the S1 migration replaces it.
"""
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("deletion_tests", Path(__file__).with_name("test-deletion-requests-db.py"))
deletion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deletion)
stock = deletion.stock
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
FORMER_EXPORT = ROOT / "supabase/migrations/20260517071100_harden_privacy_rpcs.sql"
MIGRATION = ROOT / "supabase/migrations/20261127120300_v11_06_export_user_data.sql"
COMPLETENESS = deletion.COMPLETENESS
# Exported by export_assistant_memory or export_nutrition_personalization in the same /settings/export
# call, or recomputed caches; user_privacy_settings keeps its former key, privacy_settings.
ELSEWHERE = {"assistant_memory_items", "assistant_conversations", "assistant_messages", "assistant_conversation_summaries",
             "assistant_session_context", "assistant_memory_state", "assistant_memory_commands", "assistant_memory_tombstones",
             "assistant_summary_claims", "cooking_journal_entries", "nutrition_profiles", "recipe_interactions",
             "recommendation_events", "recipe_recommendation_cache", "recipe_inventory_cache", "user_privacy_settings"}


def tables_with_user_id():
    names = run("SELECT string_agg(c.relname,' ' ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace"
                " JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition"
                " AND a.attname='user_id' AND NOT a.attisdropped;")
    return set(names.split())


def export(owner):
    return json.loads(run("SELECT export_user_data(" + literal(owner) + ");", owner=owner))


def tests():
    deletion.seed(A)
    deletion.seed(B)
    for user, name in ((A, "Alice"), (B, "Bruno")):
        run("INSERT INTO public.user_profiles(id,email,full_name,allergens) VALUES(" + literal(user) + ","
            + literal(name.lower() + "@example.test") + "," + literal(name) + ",ARRAY['arachide']);")
        run("SELECT patch_assistant_privacy_settings('{\"saveHistory\":true}'::jsonb);", owner=user)
        deletion.discovery_receipt(user, "Chez " + name)
        deletion.contribute(user, "Épice de " + name)
    # A table holding a secret beside the account's own data, as 20250830000002's calendar tokens.
    run("CREATE TABLE public.zz_calendar_links(user_id uuid,label text,google_calendar_token text,refresh_token text,tokens_used integer);"
        "INSERT INTO public.zz_calendar_links VALUES(" + literal(A) + ",'Agenda','ya29.secret','1//refresh',12);")
    data = export(A)

    def every_table():
        missing = tables_with_user_id() - ELSEWHERE - set(data)
        equal(sorted(missing), [])
        assert "user_privacy_settings" not in data and data["privacy_settings"]["user_id"] == A, data.get("privacy_settings")
        for table in ("stock_commands", "stock_movements", "weekly_meal_plans", "shopping_list", "recipe_conversations"):
            assert data[table], table
    check("every public table with an account's rows is exported, apart from those exported alongside", every_table)

    def only_the_caller():
        for table, rows in data.items():
            if isinstance(rows, list):
                assert all(row.get("user_id") in (None, A) for row in rows), table
        owned = dict(item.split("=") for item in deletion.owned(A).split(","))
        for table, count in owned.items():
            if table not in ELSEWHERE:
                key = table.removeprefix("private.")
                equal((table, len(data[key])), (table, int(count)))
        equal(data["user_id"], A)
    check("each exported table holds all of the caller's rows and only theirs", only_the_caller)

    def profile_and_menu():
        equal((data["user_profile"]["id"], data["user_profile"]["email"], data["user_profile"]["allergens"]),
              (A, "alice@example.test", ["arachide"]))
        plans = {row["id"] for row in data["weekly_meal_plans"]}
        assert data["meal_plan_entries"] and all(row["meal_plan_id"] in plans for row in data["meal_plan_entries"]), data["meal_plan_entries"]
        equal(len(data["meal_plan_entries"]), int(run("SELECT count(*) FROM meal_plan_entries e JOIN weekly_meal_plans p ON p.id=e.meal_plan_id"
                                                         " WHERE p.user_id=" + literal(A) + ";")))
    check("the profile row (keyed by id) and the menu entries (keyed by their plan) are exported", profile_and_menu)

    def discovery_and_catalogue():
        equal([row["command"]["name"] for row in data["recipe_discovery_receipts"]], ["Chez Alice"])
        contributions = data["catalog_contributions"]
        equal([row["name"] for row in contributions["products"]], ["Épice de Alice"])
        equal([row["alias"] for row in contributions["product_aliases"]], ["épice de alice"])
        assert "Bruno" not in json.dumps(data), "another account's rows leaked"
        assert set(contributions["products"][0]) == {"id", "name", "created_at"}, contributions["products"][0]
    check("the discovery receipts and the products and aliases the account added to the catalogue are exported, only theirs",
          discovery_and_catalogue)

    def no_secret_column():
        equal(data["zz_calendar_links"], [{"user_id": A, "label": "Agenda", "tokens_used": 12}])
        assert "ya29.secret" not in json.dumps(data) and "1//refresh" not in json.dumps(data)
    check("columns named like a secret leave no row; a count such as tokens_used stays", no_secret_column)

    def refused():
        run("SELECT export_user_data(" + literal(B) + ");", owner=A, error="forbidden")
        run("SELECT export_user_data(" + literal(A) + ");", role="anon", error="permission denied")
        equal(run("SELECT position('auth.uid()' IN prosrc)>0 FROM pg_proc WHERE proname='export_user_data' AND pronargs=1"
                  " AND proargtypes[0]='uuid'::regtype;"), "t")
    check("another account's export and an anonymous call are refused; the auth.uid() guard stays", refused)

    def older_overload_closed():
        run("CREATE FUNCTION public.export_user_data(p_user_id text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;"
            "GRANT EXECUTE ON FUNCTION public.export_user_data(text) TO PUBLIC, anon, authenticated;")
        run(file=MIGRATION)
        for role in ("anon", "authenticated"):
            equal(run("SELECT has_function_privilege(" + literal(role) + ",'public.export_user_data(text)','EXECUTE')::text;"), "false")
        equal(run("SELECT has_function_privilege('authenticated','public.export_user_data(uuid)','EXECUTE')::text;"), "true")
    check("another overload, possibly unguarded, can no longer be called by the app's roles", older_overload_closed)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-memory-schema.sql")
        for name in ["20261008151704_v10_reliability_commands.sql", "20261008210917_v10_mobile_routine.sql",
                     "20261009095426_v10_personalization.sql", "20261011184535_v10_assistant_memory.sql"]:
            run(file=ROOT / "supabase/migrations" / name)
        run(file=deletion.RECIPE_CONVERSATIONS)
        run(deletion.USER_PROFILES_STUB)
        run(deletion.CATALOG_STUB)
        run(deletion.RECEIPTS_STUB)
        run(file=FORMER_EXPORT)
        run(file=MIGRATION)
        run(file=MIGRATION)
        run(file=COMPLETENESS)
        run(file=COMPLETENESS)
        tests()
        print(f"{stock.checks} groups passed on real local PostgreSQL (GDPR export).")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
