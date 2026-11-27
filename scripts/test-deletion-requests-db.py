#!/usr/bin/env python3
"""Data deletion requests on real local PostgreSQL: the hourly job erases every row the user owns,
list_user_storage_objects lists the files the API erases through the Storage API, and a request is
completed only once those files are gone too.

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
WAIT_FOR_FILES = ROOT / "supabase/migrations/20261122140000_deletion_requests_wait_for_files.sql"
RECIPE_CONVERSATIONS = ROOT / "supabase/migrations/20250803064737_dc431841-ee01-4240-840d-c491f17bd767.sql"
PROFILES = ROOT / "supabase/migrations/20261127120200_v11_06_delete_user_profiles.sql"
COMPLETENESS = ROOT / "supabase/migrations/20261127160000_v11_06_s2_deletion_completeness.sql"
C = "00000000-0000-4000-8000-000000000003"
# The columns of 20251004000000 that matter here; its sign-up trigger needs auth.users columns the stub lacks.
USER_PROFILES_STUB = """CREATE TABLE public.user_profiles(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,full_name text,allergens text[] DEFAULT ARRAY[]::text[]);"""
# V11-06 S2: the columns that matter of 20260508120000 (products.created_by), 20260516140000 (product_aliases),
# 20261106154633 (the discovery receipts, as is) and 20250818000001 (list sharing, never applied in production).
CATALOG_STUB = """ALTER TABLE public.products ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE TABLE public.product_aliases(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,alias text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now());"""
RECEIPTS_STUB = """CREATE TABLE private.recipe_discovery_receipts(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command_id uuid NOT NULL,command jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,command_id));"""
SHARING_STUB = """CREATE TABLE public.shared_shopping_lists(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,name text NOT NULL DEFAULT 'Ma liste de courses');
CREATE TABLE public.shopping_list_collaborators(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id uuid REFERENCES public.shared_shopping_lists(id) ON DELETE CASCADE,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions text NOT NULL DEFAULT 'edit',UNIQUE(shopping_list_id,shared_with_user_id));"""
STORAGE_STUB = """CREATE SCHEMA storage;
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text,
  created_at timestamptz DEFAULT now());"""
CRON_STUB = """CREATE SCHEMA cron;
CREATE TABLE cron.job(jobname text PRIMARY KEY,schedule text NOT NULL,command text NOT NULL);
CREATE FUNCTION cron.schedule(job_name text,schedule text,command text) RETURNS bigint LANGUAGE sql AS $$
  INSERT INTO cron.job VALUES(job_name,schedule,command)
  ON CONFLICT(jobname) DO UPDATE SET schedule=EXCLUDED.schedule,command=EXCLUDED.command RETURNING 1::bigint $$;"""


def owned(user):
    """'table=count' for every public or private table holding rows of `user` in its user_id column
    (a private table is named private.<table>)."""
    return run("SELECT coalesce(string_agg(label||'='||n,',' ORDER BY label),'') FROM (SELECT"
               " CASE s.nspname WHEN 'public' THEN c.relname::text ELSE s.nspname||'.'||c.relname END AS label,"
               " (xpath('/row/n/text()',query_to_xml(format('SELECT count(*) AS n FROM %I.%I WHERE user_id::text=%L',s.nspname,c.relname,"
               + literal(user) + "),false,true,'')))[1]::text::int AS n"
               " FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid"
               " WHERE s.nspname IN ('public','private') AND c.relkind IN ('r','p') AND a.attname='user_id' AND NOT a.attisdropped"
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
        "INSERT INTO cooking_journal_entries(user_id,recipe_title) VALUES(" + u + ",'Soupe');"
        "INSERT INTO recipe_conversations(user_id,user_message,ai_response) VALUES(" + u + ",'Une idée ?','Une soupe.');")
    return recipe


def discovery_receipt(user, place):
    """A recipe discovery command as the private receipt keeps it: names, addresses and descriptions in clear."""
    command = json.dumps({"type": "save_creator", "command_id": str(uuid.uuid4()), "name": place, "address": "12 rue des Lilas"})
    run("INSERT INTO private.recipe_discovery_receipts(user_id,command_id,command,result) VALUES(" + literal(user) + ","
        + literal(json.loads(command)["command_id"]) + "," + literal(command) + "::jsonb,'{\"ok\":true}'::jsonb);")


def contribute(user, name):
    """A product and an alias the user added to the common catalogue; returns the product id."""
    product = str(uuid.uuid4())
    run("INSERT INTO public.products(id,name,category,unit_type,created_by) VALUES(" + literal(product) + "," + literal(name)
        + ",'Epicerie','g'," + literal(user) + ");"
        "INSERT INTO public.product_aliases(product_id,alias,created_by) VALUES(" + literal(product) + "," + literal(name.lower()) + ","
        + literal(user) + ");")
    return product


def request(user):
    identity = str(uuid.uuid4())
    run("INSERT INTO data_deletion_requests(id,user_id) VALUES(" + literal(identity) + "," + literal(user) + ");", owner=user)
    return identity


def process():
    return json.loads(run("SELECT public.process_pending_deletion_requests(10);", role="service_role"))


def upload(user, name):
    """A file of `user` in Storage, as the app uploads it (owner_id)."""
    run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('recipe-images'," + literal(name) + "," + literal(user) + ");")


def erase_files(user):
    """What deleteUserFiles achieves through the Storage API."""
    run("DELETE FROM storage.objects WHERE owner_id=" + literal(user) + ";")


DONE = {"processed": 1, "waiting_for_files": 0, "failed": 0, "errors": []}


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
        run(file=WAIT_FOR_FILES)
        run(file=WAIT_FOR_FILES)
        run(file=PROFILES)
        run(file=PROFILES)
        run(file=COMPLETENESS)
        run(file=COMPLETENESS)
        equal(run("SELECT count(*) FROM pg_trigger WHERE tgname='v10_product_cache' AND pg_get_triggerdef(oid) LIKE '%WHEN%';"), "1")
        equal(run("SELECT string_agg(jobname||' '||schedule||' '||command,';') FROM cron.job;"),
              "process-deletion-requests 17 * * * * SELECT public.process_pending_deletion_requests(10)")
    check("a pending request blocks the migration; once reviewed it schedules one hourly job", guard_then_schedule)

    def erases_every_owned_row():
        seed(A)
        seed(B)
        before_b = owned(B)
        for table in ("stock_commands", "stock_movements", "user_recipes", "mobile_routine_preferences", "recipe_inventory_cache",
                      "recipe_conversations"):
            assert table + "=" in owned(A), (table, owned(A))
        identity = request(A)
        equal(process(), DONE)
        equal(owned(A), "")
        equal(run("SELECT count(*) FROM meal_plan_entries e JOIN weekly_meal_plans p ON p.id=e.meal_plan_id;"), "1")
        equal(owned(B), before_b)
        equal(status(identity), "completed|true|")
        equal(run("SELECT count(*) FROM auth.users WHERE id=" + literal(A) + ";"), "1")
    check("a request erases every row the user owns, the former missed tables included, and only theirs", erases_every_owned_row)

    def erases_the_profile():
        for user, name in ((A, "Alice"), (B, "Bruno")):
            run("INSERT INTO public.user_profiles(id,email,full_name,allergens) VALUES(" + literal(user) + ","
                + literal(name.lower() + "@example.test") + "," + literal(name) + ",ARRAY['arachide']) ON CONFLICT(id) DO NOTHING;")
        identity = request(A)
        equal(process(), DONE)
        equal(status(identity), "completed|true|")
        equal(run("SELECT count(*) FROM public.user_profiles WHERE id=" + literal(A) + ";"), "0")
        equal(run("SELECT full_name FROM public.user_profiles WHERE id=" + literal(B) + ";"), "Bruno")
        equal(run("SELECT count(*) FROM auth.users WHERE id=" + literal(A) + ";"), "1")
    check("a request also erases the account's profile (e-mail, name, allergens), and only theirs; sign-in stays", erases_the_profile)

    def erases_discovery_receipts():
        discovery_receipt(A, "Chez Alice")
        discovery_receipt(B, "Chez Bruno")
        assert "private.recipe_discovery_receipts=1" in owned(A), owned(A)
        identity = request(A)
        equal(process(), DONE)
        equal(status(identity), "completed|true|")
        equal(owned(A), "")
        equal(run("SELECT string_agg(command->>'name',',') FROM private.recipe_discovery_receipts WHERE user_id=" + literal(B) + ";"),
              "Chez Bruno")
    check("a request erases the recipe discovery receipts (names, addresses in clear), and only theirs", erases_discovery_receipts)

    def catalogue_keeps_names_not_the_author():
        seed(B)
        run("INSERT INTO public.stock_context_versions(user_id) VALUES(" + literal(B) + ") ON CONFLICT DO NOTHING;")
        sumac, zaatar = contribute(A, "Sumac"), contribute(B, "Zaatar")
        state_b = ("SELECT (SELECT revision FROM public.stock_context_versions WHERE user_id=" + literal(B) + ")||'|'||"
                   "(SELECT count(*) FROM public.recipe_inventory_cache WHERE user_id=" + literal(B) + ");")
        before_b = run(state_b)
        assert not before_b.endswith("|0"), before_b
        identity = request(A)
        equal(process(), DONE)
        equal(status(identity), "completed|true|")
        for table in ("products", "product_aliases"):
            equal(run("SELECT count(*) FROM public." + table + " WHERE created_by=" + literal(A) + ";"), "0")
            equal(run("SELECT count(*) FROM public." + table + " WHERE created_by=" + literal(B) + ";"), "1")
        equal(run("SELECT name||'|'||coalesce(created_by::text,'-') FROM public.products WHERE id=" + literal(sumac) + ";"), "Sumac|-")
        equal(run("SELECT alias||'|'||coalesce(created_by::text,'-') FROM public.product_aliases WHERE product_id=" + literal(sumac) + ";"),
              "sumac|-")
        # Dropping the author changes nothing a cache depends on: other accounts keep their caches.
        equal(run(state_b), before_b)
        # A real catalogue change still invalidates every account's caches.
        run("UPDATE public.products SET name='Zaatar vert' WHERE id=" + literal(zaatar) + ";")
        revision = int(before_b.split("|")[0])
        equal(run(state_b), str(revision + 1) + "|0")
    check("a request keeps the products and aliases it added to the common catalogue, without its id, and leaves other caches alone",
          catalogue_keeps_names_not_the_author)

    def list_sharing():
        run("INSERT INTO auth.users(id) VALUES(" + literal(C) + ") ON CONFLICT DO NOTHING;")
        own, other = str(uuid.uuid4()), str(uuid.uuid4())
        run("INSERT INTO public.shared_shopping_lists(id,user_id) VALUES(" + literal(own) + "," + literal(A) + "),(" + literal(other) + ","
            + literal(B) + ");"
            "INSERT INTO public.shopping_list_collaborators(shopping_list_id,shared_with_user_id,shared_by_user_id) VALUES"
            "(" + literal(own) + "," + literal(B) + "," + literal(A) + "),"
            "(" + literal(other) + "," + literal(A) + "," + literal(B) + "),"
            "(" + literal(other) + "," + literal(C) + "," + literal(A) + ");")
        identity = request(A)
        equal(process(), DONE)
        equal(status(identity), "completed|true|")
        # B's list stays shared with C; who invited C is no longer kept.
        equal(run("SELECT string_agg(shopping_list_id||'|'||shared_with_user_id||'|'||coalesce(shared_by_user_id::text,'-'),',')"
                  " FROM public.shopping_list_collaborators;"), other + "|" + C + "|-")
    check("a request removes the account from shared lists: its own lists, its invitations, its name as inviter", list_sharing)

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
        equal(process(), DONE)
        equal(owned(A), "")
    check("a request a reference blocks is marked failed with nothing erased, and succeeds once unblocked", blocked_is_failed_not_completed)

    def only_the_service_role():
        for role in ("authenticated", "anon"):
            run("SELECT public.process_pending_deletion_requests(1);", role=role, error="permission denied")
            run("SELECT private.delete_user_rows(" + literal(A) + ");", role=role, error="permission denied")
    check("only the service role and the job run the deletion", only_the_service_role)

    def files_left_keep_the_request_open():
        seed(A)
        upload(A, "recipe-left.jpg")
        identity = request(A)
        equal(process(), {"processed": 0, "waiting_for_files": 1, "failed": 0, "errors": []})
        equal(owned(A), "")
        equal(status(identity), "processing|false|FILES_REMAINING")
        equal(process(), {"processed": 0, "waiting_for_files": 1, "failed": 0, "errors": []})
        equal(status(identity), "processing|false|FILES_REMAINING")
        erase_files(A)
        equal(process(), DONE)
        equal(status(identity), "completed|true|")
    check("a request whose files remain is never completed: rows erased, files awaited, completed once they are gone",
          files_left_keep_the_request_open)

    def late_completion_keeps_later_use():
        seed(A)
        upload(A, "recipe-left.jpg")
        identity = request(A)
        process()
        # The account stays open: what the user does afterwards is not part of the request.
        run("INSERT INTO assistant_conversations(user_id) VALUES(" + literal(A) + ");"
            "INSERT INTO cooking_journal_entries(user_id,recipe_title) VALUES(" + literal(A) + ",'Tarte');")
        run("DELETE FROM storage.objects WHERE name='recipe-left.jpg';")
        upload(A, "recipe-after.jpg")
        equal(process(), DONE)
        equal(status(identity), "completed|true|")
        equal(owned(A), "assistant_conversations=1,cooking_journal_entries=1")
        equal(run("SELECT count(*) FROM storage.objects WHERE owner_id=" + literal(A) + ";"), "1")
        run("DELETE FROM assistant_conversations WHERE user_id=" + literal(A) + ";"
            "DELETE FROM cooking_journal_entries WHERE user_id=" + literal(A) + ";")
        erase_files(A)
    check("a request completed after its files keeps what the user created since its rows were erased, later files included",
          late_completion_keeps_later_use)

    def new_requests_before_awaited_files():
        upload(A, "recipe-left.jpg")
        waiting = request(A)
        process()
        fresh = request(B)
        equal(json.loads(run("SELECT public.process_pending_deletion_requests(1);", role="service_role")), DONE)
        equal(status(fresh), "completed|true|")
        equal(status(waiting), "processing|false|FILES_REMAINING")
        erase_files(A)
        process()
    check("a request awaiting its files never delays a new request", new_requests_before_awaited_files)

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
        run(file=RECIPE_CONVERSATIONS)
        run(USER_PROFILES_STUB)
        run(CATALOG_STUB)
        run(RECEIPTS_STUB)
        run(SHARING_STUB)
        run(CRON_STUB)
        run(STORAGE_STUB)
        run(file=FILES_MIGRATION)
        run(file=FILES_MIGRATION)
        tests()
        print(f"{stock.checks} groups passed on real local PostgreSQL (deletion requests).")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
