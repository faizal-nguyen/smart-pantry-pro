#!/usr/bin/env python3
"""The recipe-images bucket migration on real local PostgreSQL, storage schema stubbed.

Same disposable database and local socket as test-v10-stock-db.py.
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("stock_tests", Path(__file__).with_name("test-v10-stock-db.py"))
stock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stock)
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
MIGRATION = ROOT / "supabase/migrations/20261107090000_recipe_images_bucket.sql"
STORAGE_STUB = """CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO authenticated,anon;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,anon;
-- A former broad policy, as 20250105000005 created it.
CREATE POLICY "Give users access to delete their recipe images" ON storage.objects FOR DELETE
  USING (bucket_id = 'recipe-images' AND auth.uid() IS NOT NULL);"""


def upload(owner, name="recipe-1.jpg"):
    """Inserts as the signed-in owner (no RETURNING: no read policy, as on Supabase), returns the id."""
    run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('recipe-images'," + literal(name) + "," + literal(owner) + ");", owner=owner)
    return run("SELECT id FROM storage.objects WHERE name=" + literal(name) + ";")


def tests():
    def public_bucket():
        equal(run("SELECT public||' '||file_size_limit||' '||array_length(allowed_mime_types,1) FROM storage.buckets WHERE id='recipe-images';"), "true 10485760 5")
        equal(run("SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND policyname LIKE 'Give users%';"), "0")
    check("creates the public bucket once and drops the former broad policies", public_bucket)

    def owner_only():
        mine = upload(A)
        equal(run("SELECT count(*) FROM storage.objects WHERE id=" + literal(mine) + ";", owner=B), "0")
        equal(run("SELECT count(*) FROM storage.objects WHERE id=" + literal(mine) + ";", owner=A), "1")
        equal(run("WITH d AS (DELETE FROM storage.objects WHERE id=" + literal(mine) + " RETURNING 1) SELECT count(*) FROM d;", owner=B), "0")
        equal(run("WITH u AS (UPDATE storage.objects SET name='x.jpg' WHERE id=" + literal(mine) + " RETURNING 1) SELECT count(*) FROM u;", owner=B), "0")
        equal(run("WITH d AS (DELETE FROM storage.objects WHERE id=" + literal(mine) + " RETURNING 1) SELECT count(*) FROM d;", owner=A), "1")
    check("a signed-in user uploads; only the owner sees, updates or deletes the file row", owner_only)

    def refused():
        run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('other-bucket','a.jpg'," + literal(A) + ");", owner=A, error="row-level security")
        run("INSERT INTO storage.objects(bucket_id,name) VALUES('recipe-images','a.jpg');", role="anon", error="row-level security")
    check("no upload outside the bucket, none without a session", refused)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-schema.sql")
        run(STORAGE_STUB)
        run(file=MIGRATION)
        run(file=MIGRATION)
        tests()
        print(f"{stock.checks} groups passed on real local PostgreSQL (recipe-images bucket).")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
