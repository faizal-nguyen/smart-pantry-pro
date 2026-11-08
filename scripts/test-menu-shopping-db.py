#!/usr/bin/env python3
"""Menu and shopping commands on real local PostgreSQL (20261108120000_menu_shopping_commands.sql).

Same disposable database and local socket as test-v10-stock-db.py. Replays every stock,
personalization, pantry and unit scenario on the replaced command function, then checks
that « Ajouter les manquants » counts the shopping list and that a planned meal is undone.
"""
import importlib.util
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("units_tests", Path(__file__).with_name("test-stock-units-db.py"))
units = importlib.util.module_from_spec(spec)
spec.loader.exec_module(units)
stock, profile, pantry = units.stock, units.profile, units.pantry
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
MIGRATIONS = units.MIGRATIONS + ["20261108120000_menu_shopping_commands.sql"]


def missing(recipe, allocations, servings=4, error=None):
    return stock.execute(stock.command("recipe_add_missing", {"recipe": {"id": recipe, "source": "auto"}, "servings": servings}), allocations, error=error)


def listed(name):
    return run("SELECT string_agg(s.quantity::text||' '||s.unit,', ' ORDER BY s.unit) FROM shopping_list s JOIN products p ON p.id=s.product_id"
               " WHERE s.user_id=" + literal(A) + " AND p.name=" + literal(name) + " AND NOT s.is_purchased;")


def plan(recipe, date="2026-11-09", servings=4, meal="dinner"):
    return stock.execute(stock.command("plan_recipe", {"recipe": {"id": recipe, "source": "auto"}, "servings": servings, "date": date, "meal_type": meal}))


def undo(result, error=None):
    return stock.execute(stock.command("undo_stock", {"original_command_id": result["command_id"]}), error=error)


def slot(date="2026-11-09", meal="dinner"):
    return run("SELECT coalesce(string_agg(e.recipe_name||' x'||e.servings,', '),'vide') FROM meal_plan_entries e JOIN weekly_meal_plans w ON w.id=e.meal_plan_id"
               " WHERE w.user_id=" + literal(A) + " AND w.week_start_date=" + literal(date) + "::date-(extract(isodow FROM " + literal(date)
               + "::date)::integer-1) AND e.day_of_week=extract(isodow FROM " + literal(date) + "::date)::integer-1 AND e.meal_type=" + literal(meal) + ";")


def tests():
    def add_missing_twice():
        # Audit 2026-11-07: a second « Ajouter les manquants » added the same ingredients again.
        rice = units.recipe(4, [("riz rond", 300, "g"), ("lait entier", 1, "l")])
        first = missing(rice, [{"ingredient_index": 0, "quantity": 300, "unit": "g"}, {"ingredient_index": 1, "quantity": 1, "unit": "l"}])
        equal(len(first["shopping_ids"]), 2)
        second = missing(rice, [{"ingredient_index": 0, "quantity": 300, "unit": "g"}, {"ingredient_index": 1, "quantity": 1, "unit": "l"}])
        equal(second.get("shopping_ids", []), [])
        equal(listed("riz rond"), "300 g")
    check("« Ajouter les manquants » twice adds nothing the second time", add_missing_twice)

    def tops_up_the_listed_row():
        # 0.5 kg already listed, the recipe needs 800 g: one row of 0.8 kg, no second row in g.
        risotto = units.recipe(4, [("riz arborio", 800, "g")])
        missing(units.recipe(4, [("riz arborio", .5, "kg")]), [{"ingredient_index": 0, "quantity": .5, "unit": "kg"}])
        result = missing(risotto, [{"ingredient_index": 0, "quantity": 800, "unit": "g"}])
        equal(len(result["shopping_ids"]), 1)
        equal(listed("riz arborio"), "0.8 kg")
        # Bought rows do not count: the list is for what is still to buy.
        run("UPDATE shopping_list s SET is_purchased=true FROM products p WHERE p.id=s.product_id AND p.name='riz arborio';")
        missing(risotto, [{"ingredient_index": 0, "quantity": 800, "unit": "g"}])
        equal(listed("riz arborio"), "800 g")
    check("what the list holds counts, and its row is topped up in its unit", tops_up_the_listed_row)

    def other_unit_is_another_row():
        # 2 lemons do not say how many grams: the 50 g of zest go on their own row.
        missing(units.recipe(4, [("citron jaune", 2, "unité(s)")]), [{"ingredient_index": 0, "quantity": 2, "unit": "unité(s)"}])
        missing(units.recipe(4, [("citron jaune", 50, "g")]), [{"ingredient_index": 0, "quantity": 50, "unit": "g"}])
        equal(listed("citron jaune"), "50 g, 2 unité(s)")
    check("a row in a unit that does not convert is not counted", other_unit_is_another_row)

    def plan_and_undo():
        curry, dhal = units.recipe(4, [("riz", 200, "g")]), units.recipe(4, [("lentilles", 200, "g")])
        run("UPDATE recipes SET name='Curry' WHERE id=" + literal(curry) + "; UPDATE recipes SET name='Dhal' WHERE id=" + literal(dhal) + ";")
        first = plan(curry)
        equal("replaced_entry" in first, False)
        equal(slot(), "Curry x4")
        replacing = plan(dhal, servings=2)
        equal(replacing["replaced_entry"]["recipe_name"], "Curry")
        equal(slot(), "Dhal x2")
        undo(replacing)
        equal(slot(), "Curry x4")
        undo(replacing, error="ALREADY_UNDONE")
        undo(first)
        equal(slot(), "vide")
    check("a planned meal is undone: the slot gets back what it held, or is emptied", plan_and_undo)

    def plan_changed_since():
        soup = units.recipe(4, [("poireau", 2, "unité(s)")])
        result = plan(soup, date="2026-11-10")
        run("UPDATE meal_plan_entries SET servings=6 WHERE id=" + literal(result["meal_plan_entry_id"]) + ";")
        undo(result, error="MENU_CHANGED")
        equal(slot("2026-11-10"), "Pâte x6")
        stock.execute(stock.command("undo_stock", {"original_command_id": result["command_id"]}), owner=B, error="COMMAND_NOT_FOUND")
    check("an edited slot is not undone, and another account cannot undo it", plan_changed_since)


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
        units.tests()
        tests()
        print(f"{stock.checks} groups passed with menu and shopping commands on real local PostgreSQL.")
    finally:
        run("DROP DATABASE " + stock.DATABASE + " WITH (FORCE);", database="postgres")
