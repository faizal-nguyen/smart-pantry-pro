#!/usr/bin/env python3
"""The grocery-photos migration on real local PostgreSQL, storage schema stubbed.

Same disposable database and local socket as test-v10-stock-db.py.
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("stock_tests", Path(__file__).with_name("test-v10-stock-db.py"))
stock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stock)
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
MIGRATION = ROOT / "supabase/migrations/20261107210000_grocery_photos.sql"
STORAGE_STUB = """CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO authenticated,anon;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,anon;"""


def folder(user, file="req-1.jpg"):
    return "users/" + user + "/groceries/" + file


def upload(owner, name):
    run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('grocery-photos'," + literal(name) + "," + literal(owner) + ");", owner=owner)


def tests():
    product = run("INSERT INTO public.products(name,category,unit_type) VALUES('Mayonnaise Kewpie','epicerie','unit') RETURNING id;")

    def private_bucket():
        equal(run("SELECT public||' '||file_size_limit||' '||array_to_string(allowed_mime_types,',') FROM storage.buckets WHERE id='grocery-photos';"), "false 2097152 image/jpeg")
    check("creates one private bucket for JPEG photos", private_bucket)

    def own_folder_files():
        upload(A, folder(A))
        equal(run("SELECT count(*) FROM storage.objects WHERE bucket_id='grocery-photos';", owner=B), "0")
        equal(run("SELECT count(*) FROM storage.objects WHERE bucket_id='grocery-photos';", owner=A), "1")
        equal(run("WITH u AS (UPDATE storage.objects SET name=" + literal(folder(A, "req-2.jpg")) + " WHERE bucket_id='grocery-photos' RETURNING 1) SELECT count(*) FROM u;", owner=B), "0")
        equal(run("WITH d AS (DELETE FROM storage.objects WHERE bucket_id='grocery-photos' RETURNING 1) SELECT count(*) FROM d;", owner=B), "0")
        equal(run("WITH d AS (DELETE FROM storage.objects WHERE bucket_id='grocery-photos' RETURNING 1) SELECT count(*) FROM d;", owner=A), "1")
    check("only the owner reads, replaces or deletes a photo", own_folder_files)

    def refused_uploads():
        run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('grocery-photos'," + literal(folder(B)) + "," + literal(A) + ");", owner=A, error="row-level security")
        run("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('grocery-photos','users/" + A + "/other/x.jpg'," + literal(A) + ");", owner=A, error="row-level security")
        run("INSERT INTO storage.objects(bucket_id,name) VALUES('grocery-photos'," + literal(folder(A)) + ");", role="anon", error="row-level security")
    check("no upload into another user's folder, outside groceries/, or without a session", refused_uploads)

    def one_photo_per_product():
        sql = ("INSERT INTO public.user_product_photos(user_id,product_id,photo_path) VALUES(" + literal(A) + "," + literal(product) + ",{path}) "
               "ON CONFLICT (user_id,product_id) DO UPDATE SET photo_path=EXCLUDED.photo_path, updated_at=now();")
        run(sql.format(path=literal(folder(A, "req-1-1.jpg"))), owner=A)
        run(sql.format(path=literal(folder(A, "req-2-1.jpg"))), owner=A)
        equal(run("SELECT photo_path FROM public.user_product_photos;", owner=A), folder(A, "req-2-1.jpg"))
        equal(run("SELECT count(*) FROM public.user_product_photos;", owner=B), "0")
    check("keeps the latest photo of a product, visible to its owner only", one_photo_per_product)

    def guarded_rows():
        run("INSERT INTO public.user_product_photos(user_id,product_id,photo_path) VALUES(" + literal(A) + "," + literal(product) + "," + literal(folder(B)) + ") "
            "ON CONFLICT (user_id,product_id) DO UPDATE SET photo_path=EXCLUDED.photo_path;", owner=A, error="user_product_photos_own_folder")
        run("INSERT INTO public.user_product_photos(user_id,product_id,photo_path) VALUES(" + literal(B) + "," + literal(product) + "," + literal(folder(B)) + ");", owner=A, error="row-level security")
        run("DELETE FROM public.products WHERE id=" + literal(product) + ";")
        equal(run("SELECT count(*) FROM public.user_product_photos;"), "0")
    check("a row never points outside its owner's folder nor belongs to someone else; it goes with its product", guarded_rows)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-schema.sql")
        run(STORAGE_STUB)
        run(file=MIGRATION)
        run(file=MIGRATION)
        tests()
        print(f"{stock.checks} groups passed on real local PostgreSQL (grocery photos).")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
