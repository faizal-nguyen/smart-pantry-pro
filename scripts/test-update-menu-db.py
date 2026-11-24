#!/usr/bin/env python3
"""Editable menu on real local PostgreSQL (20261126090000_v11_update_menu.sql).

Same disposable database as test-ingredient-links-db.py: replays every earlier stock, menu, shopping
and link scenario on the replaced command function, then checks V11-01 E3: update_menu (set,
servings, move with swap, remove, leftover), leftovers bounded and ordered and left out of the
week's shopping, plan_recipe removing the leftovers of the meal it replaces, undo all or nothing,
and the resumption of duplicate weekly plans before their unique index.
"""
import datetime
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("links_tests", Path(__file__).with_name("test-ingredient-links-db.py"))
links = importlib.util.module_from_spec(spec)
spec.loader.exec_module(links)
week, shop, stock = links.week, links.shop, links.stock
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
RECIPE = links.DISH  # earlier suites use or remove the shared recipe fixture
MIGRATIONS = links.MIGRATIONS + ["20261126090000_v11_update_menu.sql"]


def edit(*operations: dict, owner: str = A, identity: str | None = None, error: str | None = None):
    return stock.execute(stock.command("update_menu", {"operations": list(operations)}, identity), owner=owner, error=error)


def undo(result: dict, owner: str = A, error: str | None = None):
    return week.undo(result, owner=owner, error=error)


def at(day: datetime.date, meal: str, owner: str = A) -> dict | None:
    """The meal in a slot of the week's plan, or None."""
    sql = ("SELECT coalesce((SELECT to_jsonb(e) FROM meal_plan_entries e JOIN weekly_meal_plans w ON w.id=e.meal_plan_id"
           " WHERE w.user_id=" + literal(owner) + " AND w.week_start_date=" + literal(week.monday(day).isoformat())
           + " AND e.day_of_week=" + str(day.weekday()) + " AND e.meal_type=" + literal(meal) + "),'null'::jsonb);")
    return json.loads(run(sql))


def put(day: datetime.date, meal: str = "dinner", servings: int = 4, expected: int | None = None, owner: str = A,
        recipe: str = RECIPE) -> dict:
    """A recipe placed by update_menu set; returns the new meal."""
    edit({"op": "set", "date": day.isoformat(), "meal_type": meal, "recipe": {"id": recipe, "source": "auto"},
          "servings": servings, "expected_version": expected}, owner=owner)
    return at(day, meal, owner)


def tests() -> None:
    base = week.monday(week.today()) + datetime.timedelta(days=21)  # a week no earlier scenario used
    mon, tue, wed, thu = (base + datetime.timedelta(days=offset) for offset in range(4))

    def set_places_replaces_and_undoes():
        first = put(mon)
        assert first["recipe_reference"]["id"] == RECIPE and first["leftover_of"] is None
        edit({"op": "set", "date": mon.isoformat(), "meal_type": "dinner", "recipe": {"id": RECIPE, "source": "auto"},
              "servings": 2, "expected_version": None}, error="MENU_CHANGED")
        replaced = edit({"op": "set", "date": mon.isoformat(), "meal_type": "dinner", "recipe": {"id": RECIPE, "source": "auto"},
                         "servings": 2, "expected_version": first["version"]})
        second = at(mon, "dinner")
        assert second["id"] != first["id"] and second["servings"] == 2
        equal([row["id"] for row in replaced["menu_edit"]["removed"]], [first["id"]])
        undo(replaced)
        restored = at(mon, "dinner")
        equal([restored["id"], restored["version"], restored["servings"]], [first["id"], first["version"], 4])
    check("set places a recipe, replaces a meal at its version by a new row, and is undone", set_places_replaces_and_undoes)

    def servings_are_bounded_by_leftovers():
        meal = at(mon, "dinner")
        edit({"op": "servings", "entry_id": meal["id"], "expected_version": meal["version"], "servings": 6})
        meal = at(mon, "dinner")
        equal(meal["servings"], 6)
        edit({"op": "servings", "entry_id": meal["id"], "expected_version": meal["version"] - 1, "servings": 5}, error="MENU_CHANGED")
        edit({"op": "leftover", "entry_id": meal["id"], "expected_version": meal["version"], "date": tue.isoformat(),
              "meal_type": "lunch", "servings": 4})
        edit({"op": "servings", "entry_id": meal["id"], "expected_version": meal["version"], "servings": 3}, error="LEFTOVER_CAPACITY")
        rest = at(tue, "lunch")
        edit({"op": "servings", "entry_id": rest["id"], "expected_version": rest["version"], "servings": 7}, error="LEFTOVER_CAPACITY")
    check("servings change at the meal's version, never below its leftovers", servings_are_bounded_by_leftovers)

    def leftovers_are_bounded_ordered_and_not_shopped():
        meal, rest = at(mon, "dinner"), at(tue, "lunch")
        equal([rest["leftover_of"], rest["recipe_reference"], rest["servings"]], [meal["id"], None, 4])
        assert rest["recipe_name"].startswith("Reste : ")
        edit({"op": "leftover", "entry_id": meal["id"], "expected_version": meal["version"], "date": wed.isoformat(),
              "meal_type": "lunch", "servings": 3}, error="LEFTOVER_CAPACITY")
        edit({"op": "leftover", "entry_id": meal["id"], "expected_version": meal["version"], "date": mon.isoformat(),
              "meal_type": "lunch", "servings": 1}, error="LEFTOVER_ORDER")
        edit({"op": "leftover", "entry_id": rest["id"], "expected_version": rest["version"], "date": wed.isoformat(),
              "meal_type": "lunch", "servings": 1}, error="INVALID_COMMAND")
        ids = [item["id"] for item in week.basis(base)["meals"]]
        assert meal["id"] in ids and rest["id"] not in ids, "a leftover adds nothing to the week's shopping"
        # A direct delete of a meal with leftovers is refused: the command removes them together.
        run("DELETE FROM meal_plan_entries WHERE id=" + literal(meal["id"]) + ";", error="foreign key")
    check("a leftover follows its meal within its servings and is left out of the shopping", leftovers_are_bounded_ordered_and_not_shopped)

    def move_keeps_identity_and_swaps():
        meal, rest = at(mon, "dinner"), at(tue, "lunch")
        edit({"op": "move", "entry_id": meal["id"], "expected_version": meal["version"], "date": wed.isoformat(),
              "meal_type": "dinner", "target_version": None}, error="LEFTOVER_ORDER")
        edit({"op": "move", "entry_id": rest["id"], "expected_version": rest["version"], "date": mon.isoformat(),
              "meal_type": "lunch", "target_version": None}, error="LEFTOVER_ORDER")
        moved = edit({"op": "move", "entry_id": meal["id"], "expected_version": meal["version"], "date": mon.isoformat(),
                      "meal_type": "lunch", "target_version": None})
        now = at(mon, "lunch")
        equal([now["id"], now["version"], at(mon, "dinner")], [meal["id"], meal["version"] + 1, None])
        undo(moved)
        equal(at(mon, "dinner")["id"], meal["id"])
        # An occupied slot swaps, both versions checked; across weeks too.
        other, meal, rest = put(thu), at(mon, "dinner"), at(tue, "lunch")
        edit({"op": "move", "entry_id": other["id"], "expected_version": other["version"], "date": tue.isoformat(),
              "meal_type": "lunch", "target_version": None}, error="MENU_CHANGED")
        swap = edit({"op": "move", "entry_id": other["id"], "expected_version": other["version"], "date": tue.isoformat(),
                     "meal_type": "lunch", "target_version": rest["version"]})
        equal([at(tue, "lunch")["id"], at(thu, "dinner")["id"]], [other["id"], rest["id"]])
        equal(at(thu, "dinner")["leftover_of"], meal["id"])
        undo(swap)
        equal([at(tue, "lunch")["id"], at(thu, "dinner")["id"]], [rest["id"], other["id"]])
        # A swap that would put a meal after its own leftover is refused.
        edit({"op": "move", "entry_id": meal["id"], "expected_version": meal["version"], "date": thu.isoformat(),
              "meal_type": "dinner", "target_version": other["version"]}, error="LEFTOVER_ORDER")
        later = base + datetime.timedelta(days=7)
        across = edit({"op": "move", "entry_id": other["id"], "expected_version": at(thu, "dinner")["version"],
                       "date": later.isoformat(), "meal_type": "dinner", "target_version": None})
        equal(at(later, "dinner")["id"], other["id"])
        undo(across)
    check("move keeps a meal's identity, swaps an occupied slot and keeps leftovers after their meal", move_keeps_identity_and_swaps)

    def remove_takes_leftovers_and_undo_is_all_or_nothing():
        meal, rest = at(mon, "dinner"), at(tue, "lunch")
        removed = edit({"op": "remove", "entry_id": meal["id"], "expected_version": meal["version"]})
        equal(sorted(row["id"] for row in removed["menu_edit"]["removed"]), sorted([meal["id"], rest["id"]]))
        equal([at(mon, "dinner"), at(tue, "lunch")], [None, None])
        undo(removed)
        equal([at(mon, "dinner")["id"], at(tue, "lunch")["id"]], [meal["id"], rest["id"]])
        # Two operations, then one meal changed elsewhere: the undo refuses and changes nothing.
        both = edit({"op": "servings", "entry_id": meal["id"], "expected_version": meal["version"], "servings": 5},
                    {"op": "move", "entry_id": rest["id"], "expected_version": rest["version"], "date": wed.isoformat(),
                     "meal_type": "lunch", "target_version": None})
        moved_rest = at(wed, "lunch")
        edit({"op": "servings", "entry_id": moved_rest["id"], "expected_version": moved_rest["version"], "servings": 2})
        undo(both, error="MENU_CHANGED")
        equal([at(mon, "dinner")["servings"], at(wed, "lunch")["servings"]], [5, 2])
    check("remove takes the leftovers with the meal; an undo is all or nothing", remove_takes_leftovers_and_undo_is_all_or_nothing)

    def plan_recipe_removes_the_replaced_meals_leftovers():
        meal, rest = at(mon, "dinner"), at(wed, "lunch")
        planned = week.plan(RECIPE, mon, servings=3)
        equal([row["id"] for row in planned["replaced_leftovers"]], [rest["id"]])
        equal(at(wed, "lunch"), None)
        # A leftover planned since from the new meal keeps the planning in place.
        new = at(mon, "dinner")
        since = edit({"op": "leftover", "entry_id": new["id"], "expected_version": new["version"], "date": thu.isoformat(),
                      "meal_type": "lunch", "servings": 1})
        undo(planned, error="MENU_CHANGED")
        undo(since)
        undo(planned)
        equal([at(mon, "dinner")["id"], at(wed, "lunch")["id"]], [meal["id"], rest["id"]])
        # The same for an edit: a meal it placed that has a leftover since stays.
        placed = edit({"op": "set", "date": thu.isoformat(), "meal_type": "breakfast", "recipe": {"id": RECIPE, "source": "auto"},
                       "servings": 2, "expected_version": None})
        breakfast = at(thu, "breakfast")
        later = edit({"op": "leftover", "entry_id": breakfast["id"], "expected_version": breakfast["version"], "date": thu.isoformat(),
                      "meal_type": "snack", "servings": 1})
        undo(placed, error="MENU_CHANGED")
        undo(later)
        undo(placed)
        equal(at(thu, "breakfast"), None)
    check("plan_recipe removes and names the leftovers of the meal it replaces; undo restores them", plan_recipe_removes_the_replaced_meals_leftovers)

    def a_cooking_since_blocks_the_undo():
        meal = at(mon, "dinner")
        changed = edit({"op": "servings", "entry_id": meal["id"], "expected_version": meal["version"], "servings": 4})
        run("UPDATE meal_plan_entries SET cooked_command_id=gen_random_uuid() WHERE id=" + literal(meal["id"]) + ";")
        undo(changed, error="MEAL_COOKED")
        run("UPDATE meal_plan_entries SET cooked_command_id=NULL WHERE id=" + literal(meal["id"]) + ";")
        replay = edit({"op": "remove", "entry_id": meal["id"], "expected_version": at(mon, "dinner")["version"]}, identity=changed["command_id"],
                      error="IDEMPOTENCY_CONFLICT")
        assert replay
    check("a meal cooked since its edit keeps the edit; a reused identity is refused", a_cooking_since_blocks_the_undo)

    # Review 2026-11-25: an undo checks the leftovers again (capacity and order), not only versions.
    def an_undo_keeps_the_leftover_rules():
        day = base + datetime.timedelta(days=14)
        meal = put(day, servings=2)
        more = edit({"op": "servings", "entry_id": meal["id"], "expected_version": meal["version"], "servings": 4})
        meal = at(day, "dinner")
        edit({"op": "leftover", "entry_id": meal["id"], "expected_version": meal["version"], "date": (day + datetime.timedelta(days=1)).isoformat(),
              "meal_type": "lunch", "servings": 3})
        undo(more, error="MENU_CHANGED")
        equal(at(day, "dinner")["servings"], 4)
        # Moved to breakfast, then a leftover at lunch: undoing the move would put the meal after it.
        moved = edit({"op": "move", "entry_id": meal["id"], "expected_version": meal["version"], "date": day.isoformat(),
                      "meal_type": "breakfast", "target_version": None})
        meal = at(day, "breakfast")
        edit({"op": "leftover", "entry_id": meal["id"], "expected_version": meal["version"], "date": day.isoformat(),
              "meal_type": "lunch", "servings": 1})
        undo(moved, error="MENU_CHANGED")
        equal(at(day, "breakfast")["id"], meal["id"])
    check("an undo that would break a leftover's servings or order is refused", an_undo_keeps_the_leftover_rules)

    # Review 2026-11-25: a leftover names a meal of its own account, never a leftover; malformed input is refused.
    def leftovers_stay_within_the_account_and_input_is_checked():
        day = base + datetime.timedelta(days=15)
        theirs = put(day + datetime.timedelta(days=28), owner=B, recipe=links.B_DISH)
        mine = put(day)
        # A direct write (the legacy policy allows the account to write its meals): the trigger refuses it.
        run("UPDATE meal_plan_entries SET leftover_of=" + literal(theirs["id"]) + " WHERE id=" + literal(mine["id"]) + ";", error="INVALID_COMMAND")
        rest_day = day + datetime.timedelta(days=1)
        edit({"op": "leftover", "entry_id": mine["id"], "expected_version": mine["version"], "date": rest_day.isoformat(), "meal_type": "lunch", "servings": 1})
        rest = at(rest_day, "lunch")
        run("UPDATE meal_plan_entries SET leftover_of=" + literal(rest["id"]) + " WHERE id=" + literal(at(day, "dinner")["id"]) + ";", error="INVALID_COMMAND")
        raw = lambda operation: run("SELECT public.execute_stock_command(" + literal(json.dumps(stock.command("update_menu", {"operations": [operation]})))
                                    + "::jsonb,'[]'::jsonb);", owner=A, error="INVALID_COMMAND")
        raw({"op": "servings", "entry_id": mine["id"], "expected_version": mine["version"], "servings": 2.5})
        raw({"op": "remove", "entry_id": "not-a-uuid", "expected_version": 0})
        raw({"op": "remove", "entry_id": mine["id"]})
        raw({"op": "set", "date": "1/12/2026", "meal_type": "dinner", "recipe": {"id": RECIPE, "source": "auto"}, "servings": 2, "expected_version": None})
        # A long recipe name still makes a leftover.
        run("UPDATE meal_plan_entries SET recipe_name=" + literal("R" * 255) + " WHERE id=" + literal(mine["id"]) + ";")
        mine = at(day, "dinner")
        edit({"op": "leftover", "entry_id": mine["id"], "expected_version": mine["version"], "date": rest_day.isoformat(), "meal_type": "dinner", "servings": 1})
        assert at(rest_day, "dinner")["recipe_name"].startswith("Reste : R")
    check("a leftover stays within its account and names a meal; malformed operations are refused", leftovers_stay_within_the_account_and_input_is_checked)

    def duplicate_plans_are_resumed_once():
        # The migration found duplicates once; drop the index and recreate some to replay it.
        run("DROP INDEX IF EXISTS weekly_meal_plans_user_week_key;")
        old = base + datetime.timedelta(days=35)
        plans = []
        for minutes in (30, 20, 10):  # created 30, 20 and 10 minutes ago: the first is the oldest
            plans.append(run("INSERT INTO weekly_meal_plans(user_id,week_start_date,created_at) VALUES(" + literal(B) + ","
                             + literal(old.isoformat()) + ",now()-interval '" + str(minutes) + " minutes') RETURNING id;"))
        def entry_in(plan: str, day: int, meal: str, minutes: int, cooked: bool = False) -> str:
            return run("INSERT INTO meal_plan_entries(meal_plan_id,day_of_week,meal_type,recipe_name,servings,created_at,cooked_command_id) VALUES("
                       + literal(plan) + "," + str(day) + "," + literal(meal) + ",'Ancien',2,now()-interval '" + str(minutes) + " minutes',"
                       + ("gen_random_uuid()" if cooked else "NULL") + ") RETURNING id;")
        entry_in(plans[0], 0, "lunch", 30)
        newest = entry_in(plans[1], 0, "lunch", 5)
        cooked = entry_in(plans[2], 1, "dinner", 25, cooked=True)
        entry_in(plans[0], 1, "dinner", 1)
        only = entry_in(plans[2], 2, "dinner", 15)
        # Another table naming a duplicate plan (production: contextual_planning_data, context_adaptations_log).
        run("CREATE TABLE IF NOT EXISTS public.plan_notes(id serial PRIMARY KEY,meal_plan_id uuid REFERENCES public.weekly_meal_plans(id));")
        note = run("INSERT INTO plan_notes(meal_plan_id) VALUES(" + literal(plans[2]) + ") RETURNING id;")
        run(file=ROOT / "supabase/migrations" / MIGRATIONS[-1])
        equal(run("SELECT meal_plan_id FROM plan_notes WHERE id=" + note + ";"), plans[0])
        equal(run("SELECT string_agg(id::text,',') FROM weekly_meal_plans WHERE user_id=" + literal(B) + " AND week_start_date=" + literal(old.isoformat()) + ";"), plans[0])
        kept = run("SELECT string_agg(id::text,',' ORDER BY day_of_week) FROM meal_plan_entries WHERE meal_plan_id=" + literal(plans[0]) + ";")
        equal(kept, ",".join([newest, cooked, only]))
        run("INSERT INTO weekly_meal_plans(user_id,week_start_date) VALUES(" + literal(B) + "," + literal(old.isoformat()) + ");", error="weekly_meal_plans_user_week_key")
        # A command for a new week creates its plan once.
        fresh = base + datetime.timedelta(days=49)
        put(fresh, owner=B, recipe=links.B_DISH)
        put(fresh + datetime.timedelta(days=1), owner=B, recipe=links.B_DISH)
        equal(run("SELECT count(*) FROM weekly_meal_plans WHERE user_id=" + literal(B) + " AND week_start_date=" + literal(fresh.isoformat()) + ";"), "1")
    check("duplicate plans resume to the oldest, keeping a cooked then the newest meal per slot", duplicate_plans_are_resumed_once)


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
        stock.routine_tests(capability=6)
        week.profile.tests()
        week.pantry.tests()
        week.units.tests()
        week.menu.tests()
        run(shop.UNIQUE_CATALOGUE)
        shop.tests()
        week.tests()
        links.tests()
        tests()
        print(f"{stock.checks} groups passed with the editable menu on real local PostgreSQL.")
    finally:
        run("DROP DATABASE " + stock.DATABASE + " WITH (FORCE);", database="postgres")
