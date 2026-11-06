#!/usr/bin/env python3
"""Data deletion requests on real local PostgreSQL: the hourly job erases every row the user owns,
and list_user_storage_objects lists the files the API erases through the Storage API.

Same disposable database and local socket as test-v10-stock-db.py, on the
memory schema (the widest fixture). pg_cron and storage.objects are stubbed.
"""
import importlib.util
import json
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("stock_tests", Path(__file__).with_name("test-v10-stock-db.py"))
stock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stock)
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, PRODUCT, ROOT = stock.A, stock.B, stock.PRODUCT, stock.ROOT
MIGRATION = ROOT / "supabase/migrations/20261106140000_process_deletion_requests_hourly.sql"
FILES_MIGRATION = ROOT / "supabase/migrations/20261106160000_list_user_storage_objects.sql"
STORAGE_STUB = """CREATE SCHEMA storage;
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text);"""
CRON_STUB = """CREATE SCHEMA cron;
CREATE TABLE cron.job(jobname text PRIMARY KEY,schedule text NOT NULL,command text NOT NULL);
CREATE FUNCTION cron.schedule(job_name text,schedule text,command text) RETURNS bigint LANGUAGE sql AS $$
  INSERT INTO cron.job VALUES(job_name,schedule,command)
  ON CONFLICT(jobname) DO UPDATE SET schedule=EXCLUDED.schedule,command=EXCLUDED.command RETURNING 1::bigint $$;"""


def owned(user):
    """'table=count' for every public table holding rows of `user` in its user_id column."""
    return run("SELECT coalesce(string_agg(relname||'='||n,',' ORDER BY relname),'') FROM (SELECT c.relname,"
               " (xpath('/row/n/text()',query_to_xml(format('SELECT count(*) AS n FROM public.%I WHERE user_id::text=%L',c.relname,"
               + literal(user) + "),false,true,'')))[1]::text::int AS n"
               " FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid"
               " WHERE s.nspname='public' AND c.relkind IN ('r','p') AND a.attname='user_id' AND NOT a.attisdropped"
               " AND c.relname<>'data_deletion_requests') t WHERE n>0;")


def seed(user):
    """Rows in tables the former function erased and in tables it missed; returns the recipe id."""
    lot, recipe, plan, conversation = (str(uuid.uuid4()) for _ in range(4))
    u = literal(user)
    run("INSERT INTO inventory(id,user_id,product_id,quantity,unit) VALUES(" + literal(lot) + "," + u + "," + literal(PRODUCT) + ",2,'kg');")
    stock.execute(stock.consume(.5, "kg", lot=lot), owner=user)
    run("INSERT INTO recipes(id,user_id,name,instructions) VALUES(" + literal(recipe) + "," + u + ",'Soupe','Cuire.');"
        "INSERT INTO recipe_ingredients(recipe_id,ingredient_name) VALUES(" + literal(recipe) + ",'Oignon');"
        "INSERT INTO shopping_list(user_id,product_id) VALUES(" + u + "," + literal(PRODUCT) + ");"
        "INSERT INTO user_recipes(user_id) VALUES(" + u + ");"
        "INSERT INTO mobile_routine_preferences(user_id) VALUES(" + u + ") ON CONFLICT DO NOTHING;"
        "INSERT INTO recipe_inventory_cache(user_id,recipe_id) VALUES(" + u + "," + literal(recipe) + ");"
        "INSERT INTO weekly_meal_plans(id,user_id) VALUES(" + literal(plan) + "," + u + ");"
        "INSERT INTO meal_plan_entries(meal_plan_id,day_of_week,meal_type) VALUES(" + literal(plan) + ",0,'dinner');"
        "INSERT INTO assistant_conversations(id,user_id) VALUES(" + literal(conversation) + "," + u + ");"
        "INSERT INTO assistant_messages(conversation_id,user_id,role,content) VALUES(" + literal(conversation) + "," + u + ",'user','Bonjour');"
        "INSERT INTO cooking_journal_entries(user_id,recipe_title) VALUES(" + u + ",'Soupe');")
    return recipe


def request(user):
    identity = str(uuid.uuid4())
    run("INSERT INTO data_deletion_requests(id,user_id) VALUES(" + literal(identity) + "," + literal(user) + ");", owner=user)
    return identity


def process():
    return json.loads(run("SELECT public.process_pending_deletion_requests(10);", role="service_role"))


def status(identity):
    return run("SELECT status||'|'||(completed_at IS NOT NULL)||'|'||coalesce(error,'') FROM data_deletion_requests WHERE id=" + literal(identity) + ";")


def tests():
    def guard_then_schedule():
        pending = request(A)
        run(file=MIGRATION, error="Pending deletion requests exist")
        equal(run("SELECT count(*) FROM cron.job;"), "0")
        run("DELETE FROM data_deletion_requests WHERE id=" + literal(pending) + ";")
        run(file=MIGRATION)
        run(file=MIGRATION)
        equal(run("SELECT string_agg(jobname||' '||schedule||' '||command,';') FROM cron.job;"),
              "process-deletion-requests 17 * * * * SELECT public.process_pending_deletion_requests(10)")
    check("a pending request blocks the migration; once reviewed it schedules one hourly job", guard_then_schedule)

    def erases_every_owned_row():
        seed(A)
        seed(B)
        before_b = owned(B)
        for table in ("stock_commands", "stock_movements", "user_recipes", "mobile_routine_preferences", "recipe_inventory_cache"):
            assert table + "=" in owned(A), (table, owned(A))
        identity = request(A)
        equal(process(), {"processed": 1, "failed": 0, "errors": []})
        equal(owned(A), "")
        equal(run("SELECT count(*) FROM meal_plan_entries e JOIN weekly_meal_plans p ON p.id=e.meal_plan_id;"), "1")
        equal(owned(B), before_b)
        equal(status(identity), "completed|true|")
        equal(run("SELECT count(*) FROM auth.users WHERE id=" + literal(A) + ";"), "1")
    check("a request erases every row the user owns, the former missed tables included, and only theirs", erases_every_owned_row)

    def blocked_is_failed_not_completed():
        recipe = seed(A)
        before = owned(A)
        run("CREATE TABLE public.zz_external_ref(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),recipe_id uuid REFERENCES public.recipes(id));"
            "INSERT INTO public.zz_external_ref(recipe_id) VALUES(" + literal(recipe) + ");")
        identity = request(A)
        result = process()
        equal((result["processed"], result["failed"]), (0, 1))
        assert status(identity).startswith("failed|true|DELETION_BLOCKED"), status(identity)
        equal(owned(A), before)
        run("DROP TABLE public.zz_external_ref;UPDATE data_deletion_requests SET status='pending',completed_at=NULL WHERE id=" + literal(identity) + ";")
        equal(process(), {"processed": 1, "failed": 0, "errors": []})
        equal(owned(A), "")
    check("a request a reference blocks is marked failed with nothing erased, and succeeds once unblocked", blocked_is_failed_not_completed)

    def only_the_service_role():
        for role in ("authenticated", "anon"):
            run("SELECT public.process_pending_deletion_requests(1);", role=role, error="permission denied")
            run("SELECT private.delete_user_rows(" + literal(A) + ");", role=role, error="permission denied")
    check("only the service role and the job run the deletion", only_the_service_role)

    def lists_the_user_files_only():
        run("INSERT INTO storage.objects(bucket_id,name,owner,owner_id) VALUES"
            "('recipe-images','recipe-1.jpg',NULL," + literal(A) + "),"
            "('product-images','0.42.jpg'," + literal(A) + ",NULL),"
            "('recipe-media','users/" + A + "/image/2026/11/a.webp',NULL,NULL),"
            "('recipe-images','recipe-2.jpg',NULL," + literal(B) + "),"
            "('recipe-media','users/" + B + "/thumbnail/2026/11/b.jpg',NULL,NULL),"
            "('recipe-media','shared/users/" + A + "/c.jpg',NULL,NULL);")
        listed = "SELECT string_agg(bucket_id||':'||name,',') FROM public.list_user_storage_objects(" + literal(A) + ",1000);"
        equal(run(listed, role="service_role"),
              "product-images:0.42.jpg,recipe-images:recipe-1.jpg,recipe-media:users/" + A + "/image/2026/11/a.webp")
        equal(run("SELECT count(*) FROM public.list_user_storage_objects(" + literal(A) + ",2);", role="service_role"), "2")
        for role in ("authenticated", "anon"):
            run("SELECT * FROM public.list_user_storage_objects(" + literal(A) + ");", role=role, error="permission denied")
    check("the files listed for erasure are the user's uploads and their users/<id>/ folder, for the service role only", lists_the_user_files_only)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-memory-schema.sql")
        for name in ["20261008151704_v10_reliability_commands.sql", "20261008210917_v10_mobile_routine.sql",
                     "20261009095426_v10_personalization.sql", "20261011184535_v10_assistant_memory.sql"]:
            run(file=ROOT / "supabase/migrations" / name)
        run(CRON_STUB)
        run(STORAGE_STUB)
        run(file=FILES_MIGRATION)
        run(file=FILES_MIGRATION)
        tests()
        print(f"{stock.checks} groups passed on real local PostgreSQL (deletion requests).")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
