#!/usr/bin/env python3
"""Pantry name matching, spoon units and tap water on real local PostgreSQL.

Same disposable database and local socket as test-v10-stock-db.py. Replays the
stock and personalization scenarios on the replaced command function.
"""
import importlib.util
import json
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("profile_tests", Path(__file__).with_name("test-v10-personalization-db.py"))
profile = importlib.util.module_from_spec(spec)
spec.loader.exec_module(profile)
stock = profile.stock
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, ROOT = stock.A, stock.ROOT

# Same cases as apps/api/src/services/stock/__tests__/quantities.test.ts.
SAME = [("échalotes", "Échalote", 1), ("œufs", "Oeufs", 1), ("lait de coco", "Lait de coco bio", 2), ("oignon", "Oignons rouges", 2),
        ("味噌", "味噌", 1), ("đường", "Đường", 1), ("sel", "Sel de Guérande", 2), ("poivre", "Poivre en grains", 2),
        ("cuisses de poulet", "Cuisses de poulet fermier Label Rouge", 2), ("sel", "Sel fin de Guérande", 2),
        ("huile d'olive", "Huile d’olive vierge extra", 2), ("sucre", "Sucre en poudre", 2), ("sel", "Sel de mer", 2),
        ("oignons verts", "Oignons nouveaux", 1), ("oignons nouveaux", "Spring onions", 1), ("spring onion", "Oignon vert bio", 2),
        ("oignon vert", "Oignons nouveaux (spring onions)", 2), ("ail semoule", "Ail semoule bio", 2)]
DIFFERENT = [("lait", "Lait de coco"), ("poulet", "Bouillon de poulet"), ("huile", "Huile d'olive"), ("coriandre", "Coriandre en poudre"),
             ("lait", "Lait concentré sucré"), ("sauce soja", "Sauce soja sucrée"), ("saumon", "Saumon fumé"), ("riz", "Farine de riz"), ("", "Riz"),
             ("citron vert", "Citron"), ("sucre glace", "Sucre"), ("sucre", "Sucre de coco"), ("sel", "Sel de céleri"), ("poivre", "Poivre de Sichuan"), ("味噌", "味噌 blanc"),
             ("oignon vert", "Oignon"), ("oignon nouveau", "Oignon rouge"), ("spring onion", "Oignons nouveaux séchés"),
             ("oignons verts", "Oignons nouveaux en poudre"), ("ail", "Ail semoule"), ("ail", "ail caramélisé"), ("gingembre", "Gingembre moulu")]
TAP_WATER = [("eau", "t"), ("Eau chaude", "t"), ("eau du robinet", "t"), ("eau de coco", "f"), ("eau gazeuse", "f"), ("", "f")]


def rank(ingredient, product):
    return run("SELECT public.stock_ingredient_match_rank(" + literal(ingredient) + "," + literal(product) + ");")


def soup(ingredients):
    """A recipe without product links, plus one lot of onions; returns (recipe, lot)."""
    product, lot, recipe = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    run("INSERT INTO products(id,name,category,unit_type) VALUES(" + literal(product) + ",'Oignons','Légumes','unité');")
    run("INSERT INTO inventory(id,user_id,product_id,quantity,unit) VALUES(" + literal(lot) + "," + literal(A) + "," + literal(product) + ",5,'unité');")
    run("INSERT INTO recipes(id,user_id,name,instructions,servings) VALUES(" + literal(recipe) + "," + literal(A) + ",'Soupe','Cuire.',2);")
    for index, (name, quantity, unit) in enumerate(ingredients):
        run("INSERT INTO recipe_ingredients(recipe_id,ingredient_name,quantity,unit,order_index) VALUES("
            + literal(recipe) + "," + literal(name) + "," + str(quantity) + "," + literal(unit) + "," + str(index + 1) + ");")
    return recipe, lot


def onions(lot, amount=2, ingredient=0):
    return {"ingredient_index": ingredient, "inventory_id": lot, "quantity": amount, "unit": "unité", "expected_version": stock.version(lot)}


def tests():
    def same_rule_as_the_api():
        for ingredient, product, expected in SAME:
            equal(rank(ingredient, product), str(expected))
        for ingredient, product in DIFFERENT:
            equal(rank(ingredient, product), "0")
        for name, expected in TAP_WATER:
            equal(run("SELECT public.stock_is_tap_water(" + literal(name) + ");"), expected)
        equal(run("SELECT public.stock_quantity_in_unit(2,'c. à soupe','ml');"), "30.000000000")
        equal(run("SELECT public.stock_quantity_in_unit(10,'C. à café','cl');"), "5.000000000")
        run("SELECT public.stock_quantity_in_unit(1,'tasse','ml');", error="UNIT_UNKNOWN")
    check("names, spoons and unconverted cups follow the shared TypeScript rule", same_rule_as_the_api)

    def plural_name_and_water():
        recipe, lot = soup([("oignon", 2, "unité"), ("eau chaude", 500, "ml")])
        cook = stock.recipe_command(recipe=recipe, servings=2)
        stock.execute(cook, [onions(lot)])
        equal(stock.qty(lot), 3)
        stock.execute(stock.recipe_command(recipe=recipe, servings=2), [onions(lot), onions(lot, 1, ingredient=1)], error="INVALID_ALLOCATION")
        equal(stock.qty(lot), 3)
    check("a plural pantry name is consumed without a product link and water needs no stock", plural_name_and_water)

    def another_product_is_refused():
        recipe, lot = soup([("lait", 2, "unité")])
        stock.execute(stock.recipe_command(recipe=recipe, servings=2), [onions(lot)], error="INVALID_ALLOCATION")
        equal(stock.qty(lot), 5)
    check("a lot whose product is not the ingredient is still refused", another_product_is_refused)

    def culinary_synonyms_are_consumed():
        recipe, lot = soup([("oignons verts", 2, "unité")])
        run("UPDATE products SET name='Oignons nouveaux' WHERE id=(SELECT product_id FROM inventory WHERE id=" + literal(lot) + ");")
        stock.execute(stock.recipe_command(recipe=recipe, servings=2), [onions(lot)])
        equal(stock.qty(lot), 3)
        run("UPDATE products SET name='Oignons nouveaux séchés' WHERE id=(SELECT product_id FROM inventory WHERE id=" + literal(lot) + ");")
        stock.execute(stock.recipe_command(recipe=recipe, servings=2), [onions(lot)], error="INVALID_ALLOCATION")
        equal(stock.qty(lot), 3)
        equal(run("SELECT prosecdef FROM pg_proc WHERE oid='public.stock_ingredient_match_rank(text,text)'::regprocedure;"), "f")
        run("SELECT public.stock_ingredient_match_rank('oignon vert','Oignons nouveaux');", role="anon", error="permission denied")
    check("synonyms withdraw actual stock but dried forms and anonymous callers are refused", culinary_synonyms_are_consumed)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-personalization-schema.sql")
        for name in ["20261008151704_v10_reliability_commands.sql", "20261008210917_v10_mobile_routine.sql",
                     "20261009095426_v10_personalization.sql", "20261031100000_v10_pantry_matching.sql",
                     "20261109190000_stock_culinary_synonyms.sql"]:
            run(file=ROOT / "supabase/migrations" / name)
        stock.tests(cache_table_is_complete=True)
        stock.routine_tests(capability=3)
        profile.tests()
        tests()
        print(f"{stock.checks} groups passed with pantry matching on real local PostgreSQL.")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
