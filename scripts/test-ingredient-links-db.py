#!/usr/bin/env python3
"""« Je l'ai déjà » on real local PostgreSQL (20261125090000_v11_ingredient_product_links.sql).

Same disposable database as test-menu-week-db.py: replays every earlier stock, menu and shopping
scenario on the replaced resolve_stock_recipe, then checks the ingredient links: private to their
account and normalized, applied only to an ingredient without product, counted by every
computation that reads recipes (version, consume_recipe, rule C), bumping the stock revision,
exported and erased with the account.
"""
import importlib.util
import json
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("week_tests", Path(__file__).with_name("test-menu-week-db.py"))
week = importlib.util.module_from_spec(spec)
spec.loader.exec_module(week)
shop, stock = week.shop, week.stock
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
MIGRATIONS = week.MIGRATIONS + ["20261125090000_v11_ingredient_product_links.sql"]

OIL = "11000000-0000-4000-8000-000000000001"
OIL_LOT = "21000000-0000-4000-8000-000000000001"
DISH = "31000000-0000-4000-8000-000000000001"
OTHER_DISH = "31000000-0000-4000-8000-000000000002"
B_DISH = "31000000-0000-4000-8000-000000000003"


def link(name: str, product: str = OIL, owner: str = A, error: str | None = None) -> str:
    sql = ("INSERT INTO ingredient_product_links(user_id,ingredient_key,product_id) VALUES(" + literal(owner) + ","
           + literal(name) + "," + literal(product) + ") ON CONFLICT (user_id,ingredient_key) DO UPDATE SET product_id=EXCLUDED.product_id;")
    return run(sql, owner=owner, error=error)


def resolve(recipe: str = DISH, owner: str = A) -> dict:
    return json.loads(run("SELECT resolve_stock_recipe(" + literal(recipe) + ",'recipes');", owner=owner))


def revision(owner: str = A) -> int:
    return int(run("SELECT coalesce((SELECT revision FROM stock_context_versions WHERE user_id=" + literal(owner) + "),0);"))


def seed() -> None:
    run("INSERT INTO products(id,name,category,unit_type) VALUES(" + literal(OIL) + ",'Huile de tournesol','Épicerie','l');")
    run("INSERT INTO inventory(id,user_id,product_id,quantity,unit) VALUES(" + literal(OIL_LOT) + "," + literal(A) + "," + literal(OIL) + ",1,'l');")
    for recipe, owner, name in ((DISH, A, "Salade"), (OTHER_DISH, A, "Pain"), (B_DISH, B, "Salade de B")):
        run("INSERT INTO recipes(id,user_id,name,instructions,servings,is_public) VALUES(" + literal(recipe) + "," + literal(owner) + ","
            + literal(name) + ",'',4,false);")
    run("INSERT INTO recipe_ingredients(recipe_id,ingredient_name,quantity,unit,order_index) VALUES(" + literal(DISH) + ",'Huile neutre',10,'ml',1),"
        + "(" + literal(DISH) + ",'Sel',1,'g',2);")
    run("INSERT INTO recipe_ingredients(recipe_id,ingredient_name,quantity,unit,inventory_product_id,order_index) VALUES("
        + literal(OTHER_DISH) + ",'Huile neutre',20,'ml'," + literal(stock.PRODUCT) + ",1);")
    run("INSERT INTO recipe_ingredients(recipe_id,ingredient_name,quantity,unit,order_index) VALUES(" + literal(B_DISH) + ",'Huile neutre',10,'ml',1);")


def tests() -> None:
    seed()

    def links_are_private_and_normalized():
        before = revision()
        link("  Huile   NEUTRE ")
        equal(run("SELECT ingredient_key FROM ingredient_product_links WHERE user_id=" + literal(A) + ";"), "huile neutre")
        assert revision() > before, "a link bumps the stock revision"
        equal(run("SELECT count(*) FROM ingredient_product_links;", owner=B), "0")
        run("INSERT INTO ingredient_product_links(user_id,ingredient_key,product_id) VALUES(" + literal(A) + ",'sel'," + literal(OIL) + ");",
            owner=B, error="row-level security")
        run("UPDATE ingredient_product_links SET product_id=" + literal(stock.PRODUCT) + ";", owner=B)
        equal(run("SELECT product_id FROM ingredient_product_links WHERE user_id=" + literal(A) + ";"), OIL)
        # An update never moves a link to another account: the trigger keeps its owner.
        run("UPDATE ingredient_product_links SET user_id=" + literal(B) + " WHERE user_id=" + literal(A) + ";", owner=A)
        equal(run("SELECT count(*) FROM ingredient_product_links WHERE user_id=" + literal(A) + ";"), "1")
        run("SELECT count(*) FROM ingredient_product_links;", role="anon", error="permission denied")
        link("   ", error="ingredient_product_links_key_length")
        link("x" * 121, error="ingredient_product_links_key_length")
    check("a link is private, normalized, bounded, and bumps the revision", links_are_private_and_normalized)

    def links_apply_only_without_product():
        run("DELETE FROM ingredient_product_links WHERE user_id=" + literal(A) + ";", owner=A)
        plain, other = resolve(), resolve(OTHER_DISH)
        equal(plain["ingredients"][0]["inventory_product_id"], None)
        link("Huile neutre")
        linked, other_after = resolve(), resolve(OTHER_DISH)
        equal([i["inventory_product_id"] for i in linked["ingredients"]], [OIL, None])
        assert linked["version"] != plain["version"], "the link enters the version"
        # A recipe whose ingredient already names a product keeps it, and its version.
        equal(other_after["ingredients"][0]["inventory_product_id"], stock.PRODUCT)
        equal(other_after["version"], other["version"])
        # Another account's recipe of the same ingredient is untouched.
        equal(resolve(B_DISH, owner=B)["ingredients"][0]["inventory_product_id"], None)
    check("a link fills only an ingredient without product, for its account", links_apply_only_without_product)

    def cooking_deducts_the_linked_product():
        resolved = resolve()
        cook = stock.command("consume_recipe", {"recipe": {"id": DISH, "source": "recipes"}, "servings": 4,
                                                "recipe_version": resolved["version"], "outside_inventory": [1]})
        allocation = {"ingredient_index": 0, "inventory_id": OIL_LOT, "quantity": 0.01, "unit": "l",
                      "expected_version": int(run("SELECT stock_version FROM inventory WHERE id=" + literal(OIL_LOT) + ";"))}
        stock.execute(cook, [allocation])
        equal(run("SELECT quantity FROM inventory WHERE id=" + literal(OIL_LOT) + ";"), "0.99")
        run("DELETE FROM ingredient_product_links WHERE user_id=" + literal(A) + ";", owner=A)
        unlinked = resolve()
        again = stock.command("consume_recipe", {"recipe": {"id": DISH, "source": "recipes"}, "servings": 4,
                                                 "recipe_version": unlinked["version"], "outside_inventory": [1]})
        allocation["expected_version"] = int(run("SELECT stock_version FROM inventory WHERE id=" + literal(OIL_LOT) + ";"))
        stock.execute(again, [allocation], error="INVALID_ALLOCATION")
        link("Huile neutre")
    check("cooking deducts the linked product, and only while linked", cooking_deducts_the_linked_product)

    def rule_c_counts_the_link():
        day = week.today()
        week.plan(DISH, day, meal="snack")
        tokens = week.basis(week.monday(day))
        add = {"product_id": OIL, "quantity": 10, "unit": "ml"}
        week.add_missing(week.monday(day), adds=[add])
        run("DELETE FROM ingredient_product_links WHERE user_id=" + literal(A) + ";", owner=A)
        week.add_missing(week.monday(day), adds=[add], error="INVALID_QUANTITY")
        link("Huile neutre")
        assert tokens["context_revision"] < week.basis(week.monday(day))["context_revision"]
    check("rule C bounds an add by the need of the linked product", rule_c_counts_the_link)

    def exported_and_erased_with_the_account():
        exported = json.loads(run("SELECT export_user_data(" + literal(A) + ");", owner=A))
        equal([row["ingredient_key"] for row in exported["ingredient_product_links"]], ["huile neutre"])
        # private.delete_user_rows erases every public table with a user_id column (its own selection):
        equal(run("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid"
                  " WHERE n.nspname='public' AND c.relname='ingredient_product_links' AND c.relkind IN ('r','p') AND NOT c.relispartition"
                  " AND a.attname='user_id' AND NOT a.attisdropped;"), "1")
        # and the account's own deletion cascades.
        equal(run("SELECT confdeltype FROM pg_constraint WHERE conrelid='public.ingredient_product_links'::regclass"
                  " AND confrelid='auth.users'::regclass;"), "c")
    check("a link is exported, and covered by the account's deletion", exported_and_erased_with_the_account)

    # Review 2026-11-24: stock_normalize_name keeps a non-breaking space the app turns into a space.
    # The app sends the name as the recipe writes it, so the stored key is the one resolve looks up.
    def a_link_matches_the_name_as_the_recipe_writes_it():
        written = "Sel\u00a0fin"
        run("UPDATE recipe_ingredients SET ingredient_name=" + literal(written) + " WHERE recipe_id=" + literal(DISH) + " AND order_index=2;")
        link(written)
        equal(resolve()["ingredients"][1]["inventory_product_id"], OIL)
        equal(run("SELECT count(*) FROM ingredient_product_links WHERE user_id=" + literal(A) + " AND ingredient_key=public.stock_normalize_name(" + literal(written) + ");"), "1")
    check("a link matches the ingredient name exactly as the recipe writes it", a_link_matches_the_name_as_the_recipe_writes_it)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-personalization-schema.sql")
        run(shop.PRODUCTION_MIRROR)
        run(week.MENU_MIRROR)
        for name in MIGRATIONS:
            run(file=ROOT / "supabase/migrations" / name)
        run(file=ROOT / "supabase/migrations" / MIGRATIONS[-1])  # idempotent
        stock.tests(cache_table_is_complete=True)
        stock.routine_tests(capability=5)
        week.profile.tests()
        week.pantry.tests()
        week.units.tests()
        week.menu.tests()
        run(shop.UNIQUE_CATALOGUE)
        shop.tests()
        week.tests()
        tests()
        print(f"{stock.checks} groups passed with ingredient links on real local PostgreSQL.")
    finally:
        run("DROP DATABASE " + stock.DATABASE + " WITH (FORCE);", database="postgres")
