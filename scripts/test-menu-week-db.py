#!/usr/bin/env python3
"""Week shopping from the menu on real local PostgreSQL (20261124090000_v11_menu_week_shopping.sql).

Same disposable database and local socket as test-v10-stock-db.py. Mirrors the deployed meal plan
columns and totals trigger (docs/implementations/V11-01-E0.md), replays every earlier stock, menu and
shopping scenario on the replaced command function, then checks V11-01 E1: the shared menu basis and
its tokens, menu_add_missing (bounded adds, contributions, reductions, undo), plan_recipe aligned on
versions, and consume_recipe linked to a meal. Dates follow the current day in Europe/Paris.
"""
import concurrent.futures
import contextlib
import datetime
import importlib.util
import json
from pathlib import Path
import subprocess
import time
import uuid

spec = importlib.util.spec_from_file_location("shopping_tests", Path(__file__).with_name("test-shopping-commands-db.py"))
shop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shop)
menu, units, stock, profile, pantry = shop.menu, shop.units, shop.stock, shop.profile, shop.pantry
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
MIGRATIONS = shop.MIGRATIONS + ["20261124090000_v11_menu_week_shopping.sql"]

# Deployed meal plan columns and totals trigger absent from the reconstructed test schema.
MENU_MIRROR = """
ALTER TABLE public.weekly_meal_plans ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(), ADD COLUMN IF NOT EXISTS total_estimated_cost numeric;
ALTER TABLE public.meal_plan_entries ADD COLUMN IF NOT EXISTS estimated_cost numeric,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
CREATE OR REPLACE FUNCTION public.calculate_meal_plan_totals() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.weekly_meal_plans SET total_estimated_cost=(SELECT COALESCE(SUM(estimated_cost),0) FROM public.meal_plan_entries
    WHERE meal_plan_id=COALESCE(NEW.meal_plan_id,OLD.meal_plan_id)), updated_at=NOW() WHERE id=COALESCE(NEW.meal_plan_id,OLD.meal_plan_id);
  RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER calculate_meal_plan_totals_trigger AFTER INSERT OR UPDATE OR DELETE ON public.meal_plan_entries
  FOR EACH ROW EXECUTE FUNCTION public.calculate_meal_plan_totals();
"""


def today():
    return datetime.date.fromisoformat(run("SELECT (now() AT TIME ZONE 'Europe/Paris')::date;"))


def monday(day):
    return day - datetime.timedelta(days=day.weekday())


def plan(recipe, date, servings=4, meal="dinner", owner=A, error=None):
    return stock.execute(stock.command("plan_recipe", {"recipe": {"id": recipe, "source": "auto"}, "servings": servings,
                                                       "date": date.isoformat(), "meal_type": meal}), owner=owner, error=error)


def basis(week, owner=A):
    return json.loads(run("SELECT public.menu_shopping_basis(" + literal(week.isoformat()) + "::date);", owner=owner))


def add_missing(week, adds=(), reductions=(), owner=A, identity=None, error=None, tokens=None):
    current = tokens or basis(week, owner)
    payload = {"week_start": week.isoformat(), "as_of": current["as_of"], "menu_version": current["menu_version"],
               "context_revision": current["context_revision"], "adds": list(adds), "reductions": list(reductions)}
    return stock.execute(stock.command("menu_add_missing", payload, identity), owner=owner, error=error)


def undo(result, owner=A, error=None):
    return stock.execute(stock.command("undo_stock", {"original_command_id": result["command_id"]}), owner=owner, error=error)


def entry(result):
    return json.loads(run("SELECT to_jsonb(e) FROM meal_plan_entries e WHERE id=" + literal(result["meal_plan_entry_id"]) + ";"))


def contributions(command_id=None, owner=A):
    where = "user_id=" + literal(owner) + ("" if command_id is None else " AND command_id=" + literal(command_id))
    return run("SELECT coalesce(string_agg(trim_scale(quantity)::text||' '||unit,', ' ORDER BY id),'') FROM menu_shopping_contributions WHERE " + where + ";")


def wait_until(sql: str, seconds: float = 10) -> None:
    """Polls a count until it is not zero."""
    deadline = time.monotonic() + seconds
    while run(sql) == "0":
        assert time.monotonic() < deadline, "timed out: " + sql
        time.sleep(0.05)


@contextlib.contextmanager
def row_lock(table: str, identity: str):
    """Holds a row lock in another session, as a direct write in progress does, until the block ends."""
    holder = subprocess.Popen([stock.PSQL, "-X", "-q", "-h", stock.SOCKET, "-p", stock.PORT, "-d", stock.DATABASE],
                              stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    try:
        holder.stdin.write("BEGIN; SELECT 1 FROM " + table + " WHERE id=" + literal(identity) + " FOR UPDATE;\n")
        holder.stdin.flush()
        wait_until("SELECT count(*) FROM pg_stat_activity WHERE state='idle in transaction' AND datname=current_database();")
        yield
    finally:
        holder.communicate("COMMIT;\n", timeout=10)


def tests():
    day = today()
    this_week, next_week = monday(day), monday(day) + datetime.timedelta(days=7)

    def basis_window_and_tokens():
        soup = units.recipe(4, [("poireaux E1", 2, "unité(s)")])
        tonight = plan(soup, day)
        target = plan(soup, next_week + datetime.timedelta(days=1), meal="lunch")
        plan(soup, day - datetime.timedelta(days=1), meal="lunch")  # past: never counted
        week = basis(next_week)
        roles = {meal["id"]: meal["role"] for meal in week["meals"]}
        equal([roles.get(tonight["meal_plan_entry_id"]), roles.get(target["meal_plan_entry_id"])], ["reserve", "target"])
        equal(len(roles), 2)
        equal(week["as_of"], day.isoformat())
        equal(basis(next_week)["menu_version"], week["menu_version"])
        run("UPDATE meal_plan_entries SET servings=6 WHERE id=" + literal(target["meal_plan_entry_id"]) + ";")
        equal(basis(next_week)["menu_version"] != week["menu_version"], True)
        run("UPDATE meal_plan_entries SET cooked_command_id=" + literal(str(uuid.uuid4())) + " WHERE id=" + literal(target["meal_plan_entry_id"]) + ";")
        equal(target["meal_plan_entry_id"] in {meal["id"] for meal in basis(next_week)["meals"]}, False)
        equal(basis(next_week, owner=B)["meals"], [])
        run("SELECT public.menu_shopping_basis(" + literal(next_week.isoformat()) + "::date);", role="anon", error="permission denied")
        run("SELECT public.menu_shopping_basis(" + literal((next_week + datetime.timedelta(days=1)).isoformat()) + "::date);", owner=A, error="INVALID_COMMAND")
    check("the menu basis keeps today to Sunday, earlier meals reserve, and its version follows the meals", basis_window_and_tokens)

    def tokens_are_checked():
        rice = units.recipe(4, [("riz basmati E1", 500, "g")])
        plan(rice, next_week + datetime.timedelta(days=2))
        current = basis(next_week)
        line = [{"name": "riz basmati E1", "quantity": 100, "unit": "g"}]
        add_missing(next_week, line, tokens={**current, "context_revision": current["context_revision"] + 1}, error="STOCK_CHANGED")
        add_missing(next_week, line, tokens={**current, "as_of": (day - datetime.timedelta(days=1)).isoformat()}, error="MENU_CHANGED")
        add_missing(next_week, line, tokens={**current, "menu_version": "0" * 32}, error="MENU_CHANGED")
        units.lot("riz basmati E1 en stock", 1, "kg")  # any stock write moves the revision
        add_missing(next_week, line, tokens=current, error="STOCK_CHANGED")
        equal(shop.lines("riz basmati E1"), "")
    check("a stale day, stock revision or menu version refuses the command before any write", tokens_are_checked)

    def bounded_adds_and_contributions():
        lentils = units.recipe(4, [("lentilles corail E1", 500, "g")])
        plan(lentils, next_week + datetime.timedelta(days=3), servings=4)
        older = shop.seed("lentilles corail E1", 1, "kg", created="2026-01-01")
        identity = str(uuid.uuid4())
        added = add_missing(next_week, [{"name": "lentilles corail E1", "quantity": 300, "unit": "g"}], identity=identity)
        equal(shop.lines("lentilles corail E1"), "1.3 kg")
        equal([added["shopping_changes"][0]["id"], added["shopping_changes"][0]["outcome"]], [older, "merged"])
        equal(contributions(added["command_id"]), "0.3 kg")
        equal(stock.execute(stock.command("menu_add_missing", json.loads(run("SELECT payload FROM stock_commands WHERE command_id=" + literal(identity) + ";")), identity)), added)
        equal(shop.lines("lentilles corail E1"), "1.3 kg")
        add_missing(next_week, [{"name": "lentilles corail E1", "quantity": 600, "unit": "g"}], error="INVALID_QUANTITY")
        # The bound holds over the whole command: two adds of one product together stay within the need.
        add_missing(next_week, [{"name": "lentilles corail E1", "quantity": 300, "unit": "g"},
                                {"name": "lentilles corail E1", "quantity": 0.3, "unit": "kg"}], error="INVALID_QUANTITY")
        equal(shop.lines("lentilles corail E1"), "1.3 kg")
        add_missing(next_week, [{"name": "produit absent E1", "quantity": 1, "unit": "kg"}], error="INVALID_QUANTITY")
        add_missing(next_week, [{"name": "lentilles corail E1", "quantity": 1, "unit": "g", "user_id": B}], error="INVALID_COMMAND")
        # A meal without servings counts the recipe's own, as the preview does.
        cashews = units.recipe(4, [("noix de cajou E1", 100, "g")])
        unsized = plan(cashews, next_week + datetime.timedelta(days=2), meal="breakfast")
        run("UPDATE meal_plan_entries SET servings=NULL WHERE id=" + literal(unsized["meal_plan_entry_id"]) + ";")
        add_missing(next_week, [{"name": "noix de cajou E1", "quantity": 100, "unit": "g"}])
        equal(shop.lines("noix de cajou E1"), "100 g")
    check("an add is bounded by what the week's meals need, tops up the oldest row and is recorded", bounded_adds_and_contributions)

    def duplicate_plans_count_once():
        # Several plans for one week (production, E0): only the oldest one, which plan_recipe writes, counts.
        # V11-01 E3 resumes them and makes a plan unique per week (test-update-menu-db.py checks it).
        if run("SELECT to_regclass('public.weekly_meal_plans_user_week_key') IS NOT NULL;") == "t":
            return
        week = next_week + datetime.timedelta(days=21)
        older, newer, copy = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
        run("INSERT INTO weekly_meal_plans(id,user_id,week_start_date,created_at) VALUES(" + literal(older) + "," + literal(A) + ","
            + literal(week.isoformat()) + ",'2025-01-01'),(" + literal(newer) + "," + literal(A) + "," + literal(week.isoformat()) + ",'2025-06-01');")
        parsnips = units.recipe(4, [("panais E1", 300, "g")])
        kept = plan(parsnips, week + datetime.timedelta(days=1))
        run("INSERT INTO meal_plan_entries(id,meal_plan_id,day_of_week,meal_type,recipe_reference,recipe_name,servings) VALUES("
            + literal(copy) + "," + literal(newer) + ",1,'dinner'," + literal(json.dumps({"id": parsnips, "source": "auto"})) + "::jsonb,'Panais',4);")
        meals = {meal["id"] for meal in basis(week)["meals"]}
        equal([kept["meal_plan_entry_id"] in meals, copy in meals], [True, False])
        add_missing(week, [{"name": "panais E1", "quantity": 400, "unit": "g"}], error="INVALID_QUANTITY")
        add_missing(week, [{"name": "panais E1", "quantity": 300, "unit": "g"}])
        equal(shop.lines("panais E1"), "300 g")
    check("the meals of a week's duplicate plans are counted once", duplicate_plans_count_once)

    def direct_writes_wait_for_the_command():
        # A direct write locks its row, then the stock revision: the command locks the rows first, so
        # waiting on a row it does not hold the revision a direct write would need (no deadlock).
        chickpeas = units.recipe(4, [("pois chiches E1", 400, "g")])
        plan(chickpeas, next_week + datetime.timedelta(days=5), meal="lunch")
        row = shop.seed("pois chiches E1", 100, "g")
        current = basis(next_week)
        line = [{"name": "pois chiches E1", "quantity": 300, "unit": "g"}]
        with concurrent.futures.ThreadPoolExecutor(1) as pool:
            with row_lock("shopping_list", row):
                pending = pool.submit(add_missing, next_week, line, tokens=current)
                wait_until("SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%menu_add_missing%';")
                run("SELECT 1 FROM stock_context_versions WHERE user_id=" + literal(A) + " FOR UPDATE NOWAIT;")
            pending.result(timeout=30)
        equal(shop.lines("pois chiches E1"), "400 g")
    check("a direct write in progress makes the command wait without holding the stock revision", direct_writes_wait_for_the_command)

    def reductions_follow_contributions():
        beans = units.recipe(4, [("haricots blancs E1", 800, "g")])
        plan(beans, next_week + datetime.timedelta(days=4), servings=4)
        added = add_missing(next_week, [{"name": "haricots blancs E1", "quantity": 600, "unit": "g"}])
        line = added["shopping_changes"][0]["id"]
        reduce = lambda quantity, error=None: add_missing(next_week, reductions=[shop.at(line, quantity=quantity, unit="g")], error=error)
        reduce(700, error="INVALID_QUANTITY")
        reduced = reduce(200)
        equal([shop.lines("haricots blancs E1"), reduced["shopping_changes"][0]["outcome"]], ["400 g", "reduced"])
        equal(contributions(added["command_id"]) + " / " + contributions(reduced["command_id"]), "600 g / -200 g")
        equal(run("SELECT count(*) FROM menu_shopping_contributions;", owner=B), "0")
        run("INSERT INTO menu_shopping_contributions(user_id,command_id,week_start_date,shopping_id,product_id,quantity,unit) SELECT user_id,command_id,"
            "week_start_date,shopping_id,product_id,1,unit FROM menu_shopping_contributions LIMIT 1;", owner=A, error="permission denied")
        shop.execute("shopping_update", [shop.at(line, quantity=450)])
        reduce(50, error="CONFLICT")
        equal(shop.lines("haricots blancs E1"), "450 g")
    check("a reduction stays within the menu's share of an unchanged row", reductions_follow_contributions)

    def undo_removes_contributions():
        flour = units.recipe(4, [("farine de sarrasin E1", 250, "g")])
        plan(flour, next_week + datetime.timedelta(days=5), servings=4)
        added = add_missing(next_week, [{"name": "farine de sarrasin E1", "quantity": 250, "unit": "g"}])
        undo(added)
        equal([shop.lines("farine de sarrasin E1"), contributions(added["command_id"])], ["", ""])
        undo(added, error="ALREADY_UNDONE")
        undo(added, owner=B, error="COMMAND_NOT_FOUND")
    check("menu_add_missing is undone all or nothing, with its contributions", undo_removes_contributions)

    def concurrent_commands():
        oats = units.recipe(4, [("flocons d'avoine E1", 400, "g")])
        plan(oats, next_week + datetime.timedelta(days=6), servings=4)
        current = basis(next_week)
        line = [{"name": "flocons d'avoine E1", "quantity": 200, "unit": "g"}]

        def attempt():
            try:
                return ("ok", add_missing(next_week, line, tokens=current))
            except AssertionError as failure:
                return ("refused", str(failure))
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results = [future.result() for future in [pool.submit(attempt) for _ in range(2)]]
        equal(sorted(kind for kind, _ in results), ["ok", "refused"])
        equal("STOCK_CHANGED" in next(detail for kind, detail in results if kind == "refused"), True)
        equal(shop.lines("flocons d'avoine E1"), "200 g")
    check("two commands prepared on the same preview: one applies, the other is refused", concurrent_commands)

    def plan_recipe_replaces_by_identity():
        curry, dhal = units.recipe(4, [("riz E1", 200, "g")]), units.recipe(4, [("lentilles E1", 200, "g")])
        slot = next_week + datetime.timedelta(days=2)
        first = plan(curry, slot, meal="lunch")
        equal(first["entry_version"], 0)
        second = plan(dhal, slot, meal="lunch", servings=2)
        equal([second["meal_plan_entry_id"] != first["meal_plan_entry_id"], second["replaced_entry"]["id"]], [True, first["meal_plan_entry_id"]])
        undo(second)
        equal(run("SELECT count(*) FROM meal_plan_entries WHERE id=" + literal(first["meal_plan_entry_id"]) + ";"), "1")
        third = plan(dhal, slot, meal="lunch")
        run("UPDATE meal_plan_entries SET day_of_week=(day_of_week+1)%7 WHERE id=" + literal(third["meal_plan_entry_id"]) + ";")
        undo(third, error="MENU_CHANGED")
        cooked = plan(curry, slot, meal="dinner")
        run("UPDATE meal_plan_entries SET cooked_command_id=" + literal(str(uuid.uuid4())) + " WHERE id=" + literal(cooked["meal_plan_entry_id"]) + ";")
        plan(dhal, slot, meal="dinner", error="MEAL_COOKED")
        # Duplicate plans of one week (production, E0): the oldest one is written, every time.
        # V11-01 E3 resumes them and makes a plan unique per week (test-update-menu-db.py checks it).
        if run("SELECT to_regclass('public.weekly_meal_plans_user_week_key') IS NULL;") == "t":
            week = next_week + datetime.timedelta(days=14)
            older = str(uuid.uuid4())
            run("INSERT INTO weekly_meal_plans(id,user_id,week_start_date,created_at) VALUES(" + literal(older) + "," + literal(A) + ","
                + literal(week.isoformat()) + ",'2025-01-01'),(gen_random_uuid()," + literal(A) + "," + literal(week.isoformat()) + ",'2025-06-01');")
            equal(plan(curry, week, meal="lunch")["meal_plan_id"], older)
            equal(plan(dhal, week + datetime.timedelta(days=1), meal="lunch")["meal_plan_id"], older)
    check("plan_recipe replaces a meal by a new row, refuses a cooked one and writes the oldest plan", plan_recipe_replaces_by_identity)

    def cooking_links_the_meal():
        # A recipe and a lot of its own: earlier suites use or remove the shared fixtures.
        bread = units.recipe(4, [("farine de blé E1", 200, "g")])
        flour = units.lot("farine de blé E1", 1, "kg")
        take = lambda: [stock.allocation(.2, lot=flour)]
        cook = lambda version: {**stock.recipe_command(recipe=bread), "command_id": str(uuid.uuid4())} | {
            "payload": {**stock.recipe_command(recipe=bread)["payload"], "meal_plan_entry_id": meal["meal_plan_entry_id"], "entry_version": version}}
        meal = plan(bread, next_week + datetime.timedelta(days=3), meal="breakfast")
        cooked = stock.execute(cook(entry(meal)["version"]), take())
        equal(entry(meal)["cooked_command_id"], cooked["command_id"])
        equal(cooked["meal_plan_entry_id"], meal["meal_plan_entry_id"])
        stock.execute(cook(entry(meal)["version"]), take(), error="ALREADY_COOKED")
        undo(cooked)
        equal(entry(meal)["cooked_command_id"], None)
        stock.execute(cook(entry(meal)["version"] + 1), take(), error="MENU_CHANGED")
        # Another account cannot link its cooking to this meal, even with a recipe of its own.
        own = str(uuid.uuid4())
        run("INSERT INTO recipes(id,user_id,name,instructions,servings) VALUES(" + literal(own) + "," + literal(B) + ",'Pain de B','Cuire',4);"
            "INSERT INTO recipe_ingredients(recipe_id,ingredient_name,quantity,unit,order_index) VALUES(" + literal(own) + ",'sel',1,'g',1);")
        version = json.loads(run("SELECT resolve_stock_recipe(" + literal(own) + ",'auto');", owner=B))["version"]
        foreign = stock.command("consume_recipe", {"recipe": {"id": own, "source": "auto"}, "servings": 4, "recipe_version": version,
                                                   "outside_inventory": [0], "meal_plan_entry_id": meal["meal_plan_entry_id"], "entry_version": entry(meal)["version"]})
        stock.execute(foreign, owner=B, error="ITEM_NOT_FOUND")
        # Cooking leaves the version (and an update never sets it): cooked then uncooked, the planning
        # is still undoable; a cooked meal is not unplanned.
        equal(entry(meal)["version"], meal["entry_version"])
        run("UPDATE meal_plan_entries SET version=42 WHERE id=" + literal(meal["meal_plan_entry_id"]) + ";")
        equal(entry(meal)["version"], meal["entry_version"])
        again = stock.execute(cook(entry(meal)["version"]), take())
        undo(meal, error="MEAL_COOKED")
        undo(again)
        undo(meal)
        equal(run("SELECT count(*) FROM meal_plan_entries WHERE id=" + literal(meal["meal_plan_entry_id"]) + ";"), "0")
    check("cooking a planned meal links it once; undo unlinks it", cooking_links_the_meal)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-personalization-schema.sql")
        run(shop.PRODUCTION_MIRROR)
        run(MENU_MIRROR)
        for name in MIGRATIONS:
            run(file=ROOT / "supabase/migrations" / name)
        run(file=ROOT / "supabase/migrations" / MIGRATIONS[-1])  # idempotent
        stock.tests(cache_table_is_complete=True)
        stock.routine_tests(capability=5)
        profile.tests()
        pantry.tests()
        units.tests()
        menu.tests()
        run(shop.UNIQUE_CATALOGUE)
        shop.tests()
        tests()
        print(f"{stock.checks} groups passed with week shopping from the menu on real local PostgreSQL.")
    finally:
        run("DROP DATABASE " + stock.DATABASE + " WITH (FORCE);", database="postgres")
