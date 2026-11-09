#!/usr/bin/env python3
"""Stock units on real local PostgreSQL (20261105100000_stock_units.sql).

Same disposable database and local socket as test-v10-stock-db.py. Replays the
stock, personalization and pantry scenarios on the replaced command function,
then checks lots in units without conversion and cooking with rescaled servings.
"""
import importlib.util
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("pantry_tests", Path(__file__).with_name("test-v10-pantry-db.py"))
pantry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pantry)
profile, stock = pantry.profile, pantry.stock
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, ROOT = stock.A, stock.ROOT

MIGRATIONS = ["20261008151704_v10_reliability_commands.sql", "20261008210917_v10_mobile_routine.sql",
              "20261009095426_v10_personalization.sql", "20261031100000_v10_pantry_matching.sql",
              "20261105100000_stock_units.sql", "20261109190000_stock_culinary_synonyms.sql"]


def in_unit(quantity, source, target):
    return run(f"SELECT public.stock_quantity_in_unit({quantity},{literal(source)},{literal(target)});")


def lot(name, quantity, unit):
    """A product and one lot of it; returns the lot id."""
    product, row = str(uuid.uuid4()), str(uuid.uuid4())
    run("INSERT INTO products(id,name,category,unit_type) VALUES(" + literal(product) + "," + literal(name) + ",'Épicerie'," + literal(unit) + ");")
    run("INSERT INTO inventory(id,user_id,product_id,quantity,unit) VALUES(" + literal(row) + "," + literal(A) + ","
        + literal(product) + "," + str(quantity) + "," + literal(unit) + ");")
    return row


def recipe(servings, ingredients):
    identity = str(uuid.uuid4())
    run("INSERT INTO recipes(id,user_id,name,instructions,servings) VALUES(" + literal(identity) + "," + literal(A) + ",'Pâte','Mélanger.'," + str(servings) + ");")
    for index, (name, quantity, unit) in enumerate(ingredients):
        run("INSERT INTO recipe_ingredients(recipe_id,ingredient_name,quantity,unit,order_index) VALUES("
            + literal(identity) + "," + literal(name) + "," + str(quantity) + "," + literal(unit) + "," + str(index + 1) + ");")
    return identity


def take(row, quantity, unit, ingredient=0):
    return {"ingredient_index": ingredient, "inventory_id": row, "quantity": quantity, "unit": unit, "expected_version": stock.version(row)}


def items(kind, row, quantity, unit):
    return stock.command(kind, {"items": [{"id": row, "quantity": quantity, "unit": unit, "expected_version": stock.version(row)}]})


def tests():
    def same_rule_as_the_api():
        # Same cases as "a unit without conversion still counts in itself" in quantities.test.ts.
        for quantity, source, target, expected in [(3, "unité(s)", "pièce", "3.000000000"), (2, "sachet(s)", "sachets", "2.000000000"),
                                                   (1, "Boîte(s)", "boite", "1.000000000"), (4, "paquet (s)", "Paquets", "4.000000000"),
                                                   (2, "tasse", "tasses", "2.000000000"), (.5, "kg(s)", "g", "500.000000000")]:
            equal(in_unit(quantity, source, target), expected)
        for source, target in [("sachet", "unité"), ("boîte(s)", "g"), ("sachet", "paquet"), ("", "")]:
            run(f"SELECT public.stock_quantity_in_unit(1,{literal(source)},{literal(target)});", error="UNIT_UNKNOWN")
        run("SELECT public.stock_quantity_in_unit(1,NULL,NULL);", error="UNIT_UNKNOWN")
        run("SELECT public.stock_unit_key('sachets');", role="anon", error="permission denied")
    check("units without conversion follow the shared TypeScript rule", same_rule_as_the_api)

    def frozen_lot_is_usable():
        # Audit 2026-11-04: "Levure, 3 sachet(s)" could not be corrected, used up or reported lost.
        row = lot("Levure", 3, "sachet(s)")
        stock.execute(items("consume_inventory", row, 1, "sachet"))
        equal(stock.qty(row), 2)
        adjusted = stock.execute(items("adjust_inventory", row, 5, "sachet(s)"))
        equal(stock.qty(row), 5)
        stock.execute(stock.command("undo_stock", {"original_command_id": adjusted["command_id"]}))
        equal(stock.qty(row), 2)
        stock.execute(items("consume_inventory", row, 1, "unité"), error="UNIT_UNKNOWN")
        stock.execute(items("consume_inventory", lot("Pois chiches", 2, "boîte(s)"), 2, "boîtes"))
        stock.execute(items("adjust_inventory", lot("Pain", 4, "unité(s)"), 6, "pièces"))
    check("a lot in sachet(s), boîte(s) or unité(s) is consumed, corrected and undone", frozen_lot_is_usable)

    def rescaled_cooking():
        # 200 g of flour for 3, cooked for 2, from a 5 kg lot: TS sends 0.133333333 kg.
        flour = lot("Farine", 5, "kg")
        dough = recipe(3, [("farine", 200, "g")])
        stock.execute(stock.recipe_command(recipe=dough, servings=2), [take(flour, .133333333, "kg")])
        equal(stock.qty(flour), 4.866666667)
        stock.execute(stock.recipe_command(recipe=dough, servings=2), [take(flour, .13, "kg")], error="INSUFFICIENT_QUANTITY")
        salt = lot("Sel", 1, "kg")
        pinch = recipe(3, [("sel", 1, "g")])
        stock.execute(stock.recipe_command(recipe=pinch, servings=2), [take(salt, .000666667, "kg")])
        milk = lot("Lait", 1, "l")
        cream = recipe(6, [("lait", 500, "ml")])
        stock.execute(stock.recipe_command(recipe=cream, servings=4), [take(milk, .333333333, "l")])
        equal(stock.qty(milk), .666666667)
    check("cooking rescaled servings from a lot in kg or L is not refused for rounding", rescaled_cooking)

    def sachet_recipe():
        yeast = lot("Levure chimique", 3, "sachet(s)")
        cake = recipe(4, [("levure chimique", 1, "sachet")])
        stock.execute(stock.recipe_command(recipe=cake, servings=4), [take(yeast, 1, "sachet(s)")])
        equal(stock.qty(yeast), 2)
    check("a recipe takes its sachet from a lot in sachet(s)", sachet_recipe)

    def measurable_shopping():
        herbs = recipe(4, [("coriandre", 1, "botte"), ("oeufs", 2, "unité(s)")])
        add = stock.command("recipe_add_missing", {"recipe": {"id": herbs, "source": "auto"}, "servings": 4})
        stock.execute(add, [{"ingredient_index": 0, "quantity": 1, "unit": "botte"}], error="UNIT_UNKNOWN")
        stock.execute(stock.command("recipe_add_missing", {"recipe": {"id": herbs, "source": "auto"}, "servings": 4}),
                      [{"ingredient_index": 1, "quantity": 2, "unit": "unité(s)"}])
        equal(run("SELECT count(*) FROM shopping_list WHERE user_id=" + literal(A) + " AND unit='unité(s)';"), "1")
    check("the shopping list still only takes measurable units", measurable_shopping)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-personalization-schema.sql")
        for name in MIGRATIONS:
            run(file=ROOT / "supabase/migrations" / name)
        run(file=ROOT / "supabase/migrations" / MIGRATIONS[-1])  # idempotent
        stock.tests(cache_table_is_complete=True)
        stock.routine_tests(capability=3)
        profile.tests()
        pantry.tests()
        tests()
        print(f"{stock.checks} groups passed with stock units on real local PostgreSQL.")
    finally:
        run("DROP DATABASE " + stock.DATABASE + " WITH (FORCE);", database="postgres")
