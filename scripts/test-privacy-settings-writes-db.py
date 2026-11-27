#!/usr/bin/env python3
"""V11-06 S1: privacy settings are written only through patch_assistant_privacy_settings, on real local PostgreSQL.

Same disposable database and local socket as test-v10-stock-db.py, same schema as test-v10-memory-db.py.
The former owner policies of 20250105000009 are recreated first, as production may still hold them, so
the test fails until the S1 migration closes direct writes.
"""
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("stock_tests", Path(__file__).with_name("test-v10-stock-db.py"))
stock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stock)
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
MIGRATION = ROOT / "supabase/migrations/20261127120100_v11_06_privacy_settings_writes.sql"
SCHEMA_MIGRATIONS = ["20261008151704_v10_reliability_commands.sql", "20261008210917_v10_mobile_routine.sql",
                     "20261009095426_v10_personalization.sql", "20261011184535_v10_assistant_memory.sql"]
FORMER_POLICIES = """CREATE POLICY "Users can view own privacy settings" ON public.user_privacy_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own privacy settings" ON public.user_privacy_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own privacy settings" ON public.user_privacy_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
GRANT DELETE ON public.user_privacy_settings TO authenticated,anon;"""


def patch(owner, **changes):
    return json.loads(run("SELECT patch_assistant_privacy_settings(" + literal(json.dumps(changes)) + "::jsonb);", owner=owner))


def tests():
    def write_rights_gone():
        run("GRANT ALL ON public.user_privacy_settings TO anon;")
        run(file=MIGRATION)
        for privilege in ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "TRIGGER", "REFERENCES"]:
            for role in ["authenticated", "anon"]:
                equal(run("SELECT has_table_privilege(" + literal(role) + ",'public.user_privacy_settings'," + literal(privilege) + ")::text;"), "false")
        equal(run("SELECT has_table_privilege('authenticated','public.user_privacy_settings','SELECT')::text;"), "true")
        equal(run("SELECT has_table_privilege('anon','public.user_privacy_settings','SELECT')::text;"), "false")
        equal(run("SELECT string_agg(policyname,' ' ORDER BY policyname) FROM pg_policies WHERE schemaname='public' AND tablename='user_privacy_settings';"),
              "Users can view own privacy settings user_privacy_settings_select_own")
    check("signed-in users keep reading only; the anonymous role keeps nothing, whatever it had", write_rights_gone)

    def direct_writes_refused():
        run("INSERT INTO public.user_privacy_settings(user_id,settings) VALUES(" + literal(A) + ",'{\"allowAnalytics\":true}');", owner=A, error="permission denied")
        patch(A, saveHistory=True)
        run("UPDATE public.user_privacy_settings SET settings=settings||'{\"productMeasureConsent\":{\"version\":1}}' WHERE user_id=" + literal(A) + ";", owner=A, error="permission denied")
        run("DELETE FROM public.user_privacy_settings WHERE user_id=" + literal(A) + ";", owner=A, error="permission denied")
        equal(run("SELECT settings ? 'productMeasureConsent' FROM public.user_privacy_settings WHERE user_id=" + literal(A) + ";"), "f")
    check("a browser session cannot insert, rewrite or delete its settings row directly", direct_writes_refused)

    def patch_still_works():
        merged = patch(A, assistantMemoryEnabled=True, dataRetention="minimal")
        equal((merged["saveHistory"], merged["assistantMemoryEnabled"], merged["dataRetention"]), (True, True, "minimal"))
        run("SELECT patch_assistant_privacy_settings('{\"productMeasureConsent\":true}'::jsonb);", owner=A, error="INVALID_PRIVACY")
        equal(run("SELECT settings->>'dataRetention' FROM public.user_privacy_settings WHERE user_id=" + literal(A) + ";", owner=A), "minimal")
        equal(run("SELECT count(*) FROM public.user_privacy_settings WHERE user_id=" + literal(A) + ";", owner=B), "0")
    check("the checked function still writes, refuses unknown keys, and each owner reads only their row", patch_still_works)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-memory-schema.sql")
        for name in SCHEMA_MIGRATIONS:
            run(file=ROOT / "supabase/migrations" / name)
        run(FORMER_POLICIES)
        run(file=MIGRATION)
        run(file=MIGRATION)
        tests()
        print(f"{stock.checks} groups passed on real local PostgreSQL (privacy settings writes).")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
