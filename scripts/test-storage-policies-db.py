#!/usr/bin/env python3
"""V11-06 S1: the product-images and temp-ocr policies on real local PostgreSQL, storage schema stubbed.

Same disposable database and local socket as test-v10-stock-db.py. The stub starts from the broad
policies the 2025 migrations created, so the test fails until the S1 migration replaces them.
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("stock_tests", Path(__file__).with_name("test-v10-stock-db.py"))
stock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stock)
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
MIGRATION = ROOT / "supabase/migrations/20261127120000_v11_06_storage_policies.sql"
STORAGE_STUB = """CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO authenticated,anon;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,anon;
INSERT INTO storage.buckets(id,name,public) VALUES('product-images','product-images',true),('temp-ocr','temp-ocr',false);
-- The broad policies of 20250105000005 and 20250803074432 (product-images) and 20250804120000 (temp-ocr).
CREATE POLICY "Give users access to upload product images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Give users access to view product images" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
CREATE POLICY "Give users access to delete their product images" ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Give users access to update their product images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL) WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Product images are publicly accessible" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
CREATE POLICY "Users can upload product images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update product images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete product images" ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage their temp OCR files" ON storage.objects FOR ALL
  USING (bucket_id = 'temp-ocr' AND auth.uid() IS NOT NULL);
-- A policy added by hand under another name, as the dashboard may have done.
CREATE POLICY "Allow all product photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');"""
BROAD = ("'Give users access to upload product images','Give users access to view product images',"
         "'Give users access to delete their product images','Give users access to update their product images',"
         "'Product images are publicly accessible','Users can upload product images','Users can update product images',"
         "'Users can delete product images','Users can manage their temp OCR files','Allow all product photos'")


def upload(owner, name, bucket="product-images"):
    """Inserts as the signed-in owner (no RETURNING: a read policy may refuse it), returns the id."""
    run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES(" + literal(bucket) + "," + literal(name) + "," + literal(owner) + ");", owner=owner)
    return run("SELECT id FROM storage.objects WHERE name=" + literal(name) + ";")


def affected(statement, owner):
    return run("WITH x AS (" + statement + " RETURNING 1) SELECT count(*) FROM x;", owner=owner)


def tests():
    def broad_policies_gone():
        equal(run("SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND policyname IN (" + BROAD + ");"), "0")
        equal(run("SELECT string_agg(policyname,' ' ORDER BY policyname) FROM pg_policies WHERE schemaname='storage';"),
              "product_images_delete_own product_images_insert product_images_select_own product_images_update_own")
        equal(run("SELECT public::text||' '||file_size_limit||' '||array_to_string(allowed_mime_types,',') FROM storage.buckets WHERE id='product-images';"),
              "true 10485760 image/jpeg,image/png,image/webp,image/heic,image/heif")
    check("every policy naming either bucket is gone, renamed ones included; the bucket stays public, with limits", broad_policies_gone)

    def bucketless_policy_stops():
        run("CREATE POLICY \"Authenticated read all\" ON storage.objects FOR SELECT TO authenticated USING (true);")
        run(file=MIGRATION, error="names no bucket")
        run("DROP POLICY \"Authenticated read all\" ON storage.objects;")
        run(file=MIGRATION)
    check("a permissive policy naming no bucket stops the migration until it is reviewed", bucketless_policy_stops)

    def owner_only():
        mine = upload(A, "product-a.webp")
        where = " WHERE id=" + literal(mine)
        equal(run("SELECT count(*) FROM storage.objects" + where + ";", owner=B), "0")
        equal(affected("UPDATE storage.objects SET name='replaced.webp'" + where, B), "0")
        equal(affected("DELETE FROM storage.objects" + where, B), "0")
        equal(run("SELECT name FROM storage.objects" + where + ";"), "product-a.webp")
        equal(run("SELECT count(*) FROM storage.objects" + where + ";", owner=A), "1")
        equal(affected("UPDATE storage.objects SET name='product-a2.webp'" + where, A), "1")
        equal(affected("DELETE FROM storage.objects" + where, A), "1")
    check("a signed-in user uploads a product photo; only its owner reads, replaces or deletes it", owner_only)

    def no_upload_without_session():
        run("INSERT INTO storage.objects(bucket_id,name) VALUES('product-images','anon.webp');", role="anon", error="row-level security")
        run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('other-bucket','a.webp'," + literal(A) + ");", owner=A, error="row-level security")
    check("no upload without a session, none outside the bucket", no_upload_without_session)

    def temp_ocr_closed():
        run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('temp-ocr','left.png'," + literal(A) + ");")
        run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('temp-ocr','new.png'," + literal(A) + ");", owner=A, error="row-level security")
        equal(run("SELECT count(*) FROM storage.objects WHERE bucket_id='temp-ocr';", owner=A), "0")
        equal(affected("DELETE FROM storage.objects WHERE bucket_id='temp-ocr'", A), "0")
        equal(affected("DELETE FROM storage.objects WHERE bucket_id='temp-ocr'", B), "0")
    check("temp-ocr, unused, is closed to every signed-in user, its owner included", temp_ocr_closed)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-schema.sql")
        run(STORAGE_STUB)
        run(file=MIGRATION)
        run(file=MIGRATION)
        tests()
        print(f"{stock.checks} groups passed on real local PostgreSQL (storage policies).")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
