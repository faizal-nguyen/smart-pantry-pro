#!/usr/bin/env python3
"""Real PostgreSQL transaction/RLS tests in a newly created disposable local database.

Requires the local PostgreSQL test server described in docs/implementations/V10-01.md.
Never connects over TCP and never loads fixtures into an existing database.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[1]
PSQL = os.environ.get("V10_TEST_PSQL", "/opt/homebrew/opt/postgresql@16/bin/psql")
SOCKET = "/private/tmp/smart-grocery-v10-pg"
PORT = "55438"
DATABASE = "v10_test_" + uuid.uuid4().hex[:12]
A = "00000000-0000-4000-8000-000000000001"
B = "00000000-0000-4000-8000-000000000002"
PRODUCT = "10000000-0000-4000-8000-000000000001"
LOT = "20000000-0000-4000-8000-000000000001"
OTHER_LOT = "20000000-0000-4000-8000-000000000002"
RECIPE = "30000000-0000-4000-8000-000000000001"
checks = 0


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def run(sql=None, *, owner=None, role=None, database=DATABASE, file=None, error=None):
    command = [PSQL, "-X", "-q", "-A", "-t", "-h", SOCKET, "-p", PORT,
               "-d", database, "-v", "ON_ERROR_STOP=1"]
    if file:
        command += ["-f", str(file)]
        result = subprocess.run(command, text=True, capture_output=True)
    else:
        prefix = ""
        if role or owner:
            prefix = "SET ROLE " + (role or "authenticated") + ";"
        if owner:
            prefix += "SELECT set_config('request.jwt.claim.sub'," + literal(owner) + ",false);"
        result = subprocess.run(command, input=prefix + sql, text=True, capture_output=True)
    if error:
        assert result.returncode != 0 and error in result.stderr, result.stderr or result.stdout
        return result.stderr
    assert result.returncode == 0, result.stderr
    lines = result.stdout.strip().splitlines()
    return lines[-1] if lines else ""


def command(kind, payload, identity=None):
    return {"command_id": identity or str(uuid.uuid4()), "command_type": kind,
            "payload_version": 1, "payload": payload}


def execute(operation, allocations=None, owner=A, error=None):
    sql = "SELECT public.execute_stock_command(" + literal(json.dumps(operation)) + "::jsonb,"
    sql += literal(json.dumps(allocations or [])) + "::jsonb);"
    output = run(sql, owner=owner, error=error)
    return json.loads(output) if not error else output


def qty(lot=LOT):
    return float(run("SELECT quantity FROM inventory WHERE id=" + literal(lot) + ";"))


def version(lot=LOT):
    return int(run("SELECT stock_version FROM inventory WHERE id=" + literal(lot) + ";"))


def reset_stock(amount=1):
    run("UPDATE inventory SET quantity=" + str(amount) + " WHERE id=" + literal(LOT) + ";")


def consume(amount, unit="g", identity=None, lot=LOT, expected=None):
    return command("consume_inventory", {"items": [{"id": lot, "quantity": amount,
        "unit": unit, "expected_version": version(lot) if expected is None else expected}]}, identity)


def recipe_command(recipe=RECIPE, servings=4, outside=None, source="auto"):
    resolved = json.loads(run("SELECT resolve_stock_recipe(" + literal(recipe) + "," + literal(source) + ");", owner=A))
    return command("consume_recipe", {"recipe": {"id": recipe, "source": source},
        "servings": servings, "recipe_version": resolved["version"], "outside_inventory": outside or []})


def allocation(amount, ingredient=0, lot=LOT):
    return {"ingredient_index": ingredient, "inventory_id": lot, "quantity": amount,
            "unit": "kg", "expected_version": version(lot)}


def check(label, fn):
    global checks
    fn()
    checks += 1
    print("PASS " + label, flush=True)


def assert_equal(actual, expected):
    assert actual == expected, (actual, expected)


def tests(cache_table_is_complete=False):
    def units_and_servings():
        assert_equal(run("SELECT public.stock_normalize_name(" + literal("\tJalapeño  café\t") + ");"), "jalapeno cafe")
        assert_equal(run("SELECT public.stock_normalize_name('ŒUF');"), "œuf")
        assert_equal(run("SELECT public.stock_quantity_in_unit(2,'PIÈCES','unit');"), "2.000000000")
        reset_stock()
        result = execute(recipe_command(), [allocation(.2)])
        assert_equal(qty(), .8)
        assert_equal(len(result["changes"]), 1)
        execute(command("undo_stock", {"original_command_id": result["command_id"]}))
        assert_equal(qty(), 1)
        execute(recipe_command(servings=2), [allocation(.1)])
        assert_equal(qty(), .9)
    check("1 kg - 200 g, portions and inverse movement", units_and_servings)

    def invalid_units():
        reset_stock()
        execute(consume(200, "ml"), error="UNIT_INCOMPATIBLE")
        execute(consume(1, "tasse"), error="UNIT_UNKNOWN")
        execute(consume(-1), error="INVALID_QUANTITY")
        execute(consume(0), error="INVALID_QUANTITY")
        execute(consume(2000), error="INSUFFICIENT_QUANTITY")
        assert_equal(qty(), 1)
    check("incompatible/unknown units, null or negative amounts and deficits rejected", invalid_units)

    def replay():
        reset_stock()
        operation = consume(200)
        first = execute(operation)
        assert_equal(execute(operation), first)
        assert_equal(qty(), .8)
        operation["payload"]["items"][0]["quantity"] = 100
        execute(operation, error="IDEMPOTENCY_CONFLICT")
        assert_equal(qty(), .8)
    check("lost response replay is exact; another payload with same identity rejected", replay)

    def simultaneous_same_identity():
        reset_stock()
        operation = consume(200)
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results = list(pool.map(lambda _: execute(operation), range(2)))
        assert_equal(results[0], results[1])
        assert_equal(qty(), .8)
    check("two simultaneous requests with the same command apply once", simultaneous_same_identity)

    def two_devices():
        reset_stock(.3)
        operations = [consume(200), consume(200)]
        def attempt(operation):
            try:
                return execute(operation)["status"]
            except AssertionError as error:
                assert "CONFLICT" in str(error) or "INSUFFICIENT_QUANTITY" in str(error), error
                return "conflict"
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            statuses = list(pool.map(attempt, operations))
        assert_equal(sorted(statuses), ["confirmed", "conflict"])
        assert_equal(qty(), .1)
    check("two devices cannot consume the last stock twice", two_devices)

    def journal_failure():
        reset_stock()
        operation = recipe_command()
        run("CREATE FUNCTION public.v10_test_refuse_journal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_JOURNAL_REFUSED'; END $$; CREATE TRIGGER v10_test_journal BEFORE INSERT ON cooking_journal_entries FOR EACH ROW EXECUTE FUNCTION v10_test_refuse_journal();")
        execute(operation, [allocation(.2)], error="TEST_JOURNAL_REFUSED")
        assert_equal(qty(), 1)
        assert_equal(run("SELECT count(*) FROM stock_commands WHERE command_id=" + literal(operation["command_id"]) + ";"), "0")
        assert_equal(run("SELECT count(*) FROM stock_movements WHERE command_id=" + literal(operation["command_id"]) + ";"), "0")
        run("DROP TRIGGER v10_test_journal ON cooking_journal_entries; DROP FUNCTION v10_test_refuse_journal();")
    check("injected journal refusal rolls back stock, receipt and movements", journal_failure)

    def undo_conflict():
        reset_stock()
        operation = consume(200)
        execute(operation)
        execute(command("adjust_inventory", {"items": [{"id": LOT, "quantity": .65, "unit": "kg", "expected_version": version()}]}))
        execute(command("undo_stock", {"original_command_id": operation["command_id"]}), error="UNDO_CONFLICT")
        assert_equal(qty(), .65)
        original = consume(100)
        execute(original)
        inverse = command("undo_stock", {"original_command_id": original["command_id"]})
        execute(inverse)
        execute(inverse)
        execute(command("undo_stock", {"original_command_id": original["command_id"]}), error="ALREADY_UNDONE")
        assert_equal(qty(), .65)
    check("undo never overwrites a later correction; inverse is unique and replayable", undo_conflict)

    def private_boundaries():
        execute(consume(1, lot=OTHER_LOT), error="ITEM_NOT_FOUND")
        run("SELECT resolve_stock_recipe('30000000-0000-4000-8000-000000000002','auto');", owner=A, error="RECIPE_NOT_FOUND")
        assert_equal(run("SELECT count(*) FROM stock_commands WHERE user_id=" + literal(A) + ";", owner=B), "0")
        assert_equal(run("SELECT count(*) FROM stock_movements WHERE user_id=" + literal(A) + ";", owner=B), "0")
        run("INSERT INTO stock_commands(user_id,command_id,command_type,payload_version,payload) VALUES(" + literal(A) + ",'40000000-0000-4000-8000-000000000001','consume_inventory',1,'{}');", owner=A, error="permission denied")
        run("SELECT execute_stock_command('{}','[]');", role="anon", error="permission denied")
        run("SELECT consume_inventory_item(" + literal(OTHER_LOT) + "," + literal(B) + ",1" + ");", owner=A, error="UNAUTHORIZED")
        execute({**consume(1), "user_id": B}, error="INVALID_COMMAND")
        assert_equal(qty(OTHER_LOT), 1)
    check("RPC, RLS, privileged internal calls and legacy user spoofing boundaries", private_boundaries)

    def transfer_rollback_and_overlap():
        ids = [str(uuid.uuid4()) for _ in range(6)]
        rows = ",".join("(" + literal(id) + "," + literal(A) + "," + literal(PRODUCT) + ",1,'kg',true)" for id in ids)
        run("INSERT INTO shopping_list(id,user_id,product_id,quantity,unit,is_purchased) VALUES" + rows + ";")
        # Fail at the very last write, after stock insertions have already happened.
        run("CREATE FUNCTION v10_test_refuse_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id=" + literal(sorted(ids)[-1]) + "::uuid THEN RAISE EXCEPTION 'TEST_DELETE_REFUSED'; END IF; RETURN OLD; END $$; CREATE TRIGGER v10_test_shopping BEFORE DELETE ON shopping_list FOR EACH ROW EXECUTE FUNCTION v10_test_refuse_delete();")
        operation = command("transfer_shopping", {"items": [{"id": id, "expected_version": 0} for id in ids]})
        before = run("SELECT count(*) FROM inventory WHERE user_id=" + literal(A) + ";")
        execute(operation, error="TEST_DELETE_REFUSED")
        assert_equal(run("SELECT count(*) FROM inventory WHERE user_id=" + literal(A) + ";"), before)
        assert_equal(run("SELECT count(*) FROM shopping_list WHERE user_id=" + literal(A) + ";"), "6")
        run("DROP TRIGGER v10_test_shopping ON shopping_list; DROP FUNCTION v10_test_refuse_delete();")
        operations = [operation, command("transfer_shopping",operation["payload"])]
        def attempt(op):
            try:
                return execute(op)["status"]
            except AssertionError as error:
                assert "ITEM_NOT_FOUND" in str(error), error
                return "conflict"
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            statuses = list(pool.map(attempt,operations))
        assert_equal(sorted(statuses), ["confirmed", "conflict"])
        winner = operations[statuses.index("confirmed")]
        assert_equal(len(execute(winner)["inventory_ids"]), 6)
        assert_equal(run("SELECT count(*) FROM inventory WHERE user_id=" + literal(A) + ";"), str(int(before) + 6))
        confirmed_transfer = execute(winner)
        assert all(change["before_quantity"] == 0 and change["after_quantity"] > 0 for change in confirmed_transfer["changes"])
        restored_transfer = execute(command("undo_stock", {"original_command_id": winner["command_id"]}))
        assert all(change["after_quantity"] == 0 and isinstance(change["stock_version"], int) for change in restored_transfer["changes"])
        assert_equal(run("SELECT count(*) FROM shopping_list WHERE user_id=" + literal(A) + ";"), "6")
        execute(operations[1-statuses.index("confirmed")], error="CONFLICT")
    check("six-item transfer refusal, overlapping transfers, lost response and restoration", transfer_rollback_and_overlap)

    def manual_recipe():
        payload = {"recipe": {"name": "Recette test manuelle", "instructions": "Cuire", "servings": 2, "prep_time": 1, "cook_time": 1, "difficulty": 2},
                   "ingredients": [{"ingredient_name": "Farine", "quantity": 200, "unit": "g"}, {"ingredient_name": "Lait", "quantity": -1, "unit": "ml"}]}
        execute(command("save_recipe", payload), error="INVALID_QUANTITY")
        assert_equal(run("SELECT count(*) FROM recipes WHERE name='Recette test manuelle';"), "0")
        payload["ingredients"][1]["quantity"] = 100
        operation = command("save_recipe", payload)
        result = execute(operation)
        assert_equal(execute(operation), result)
        assert_equal(run("SELECT count(*) FROM recipes WHERE name='Recette test manuelle';"), "1")
        assert_equal(run("SELECT count(*) FROM recipe_ingredients WHERE recipe_id=" + literal(result["recipe_id"]) + ";"), "2")
        fractional = {"recipe": {**payload["recipe"], "name": "Mesure fine"},
                      "ingredients": [{"ingredient_name": "Farine", "quantity": .125, "unit": "g"}]}
        fine_result = execute(command("save_recipe", fractional))
        assert_equal(float(run("SELECT quantity FROM recipe_ingredients WHERE recipe_id=" + literal(fine_result["recipe_id"]) + ";")), .125)
    check("manual recipe/ingredients are atomic, persistent and replayable", manual_recipe)

    def origins_and_library():
        catalog = str(uuid.uuid4())
        run("INSERT INTO recipes_catalog(id,title,ingredients_json,instructions,servings) VALUES(" + literal(catalog) + ",'Catalogue','[{\"name\":\"Farine\",\"amount\":\"200\",\"unit\":\"g\"}]','Cuire',4);")
        resolved = json.loads(run("SELECT resolve_stock_recipe(" + literal(catalog) + ",'recipes_catalog');",owner=A))
        assert_equal(resolved["ingredients"][0]["quantity"], 200)
        first = execute(command("add_catalog_recipe", {"catalog_recipe_id": catalog, "collections": ["A"]}))
        wrapper = first["user_recipe_id"]
        modifications = {"title": "Ma recette", "ingredients_override": [{"name": "Farine", "amount": "100", "unit": "g"}], "servings_multiplier": 2}
        run("UPDATE user_recipes SET custom_modifications=" + literal(json.dumps(modifications)) + "::jsonb WHERE id=" + literal(wrapper) + ";")
        second = execute(command("add_catalog_recipe", {"catalog_recipe_id": catalog, "collections": ["B"]}))
        assert_equal(second["user_recipe_id"], wrapper)
        resolved = json.loads(run("SELECT resolve_stock_recipe(" + literal(wrapper) + ",'auto');",owner=A))
        assert_equal(resolved["name"], "Ma recette")
        assert_equal(resolved["servings"], 8)
        assert_equal(resolved["ingredients"][0]["quantity"], 200)
        reset_stock()
        original = recipe_command(wrapper,servings=8)
        execute(original,[allocation(.2)])
        assert_equal(qty(), .8)
        execute(command("undo_stock", {"original_command_id": original["command_id"]}))
        assert_equal(run("SELECT times_cooked FROM user_recipes WHERE id=" + literal(wrapper) + ";"), "0")
        custom = str(uuid.uuid4())
        run("INSERT INTO user_recipes(id,user_id,is_from_catalog,custom_title,custom_ingredients_json) VALUES(" + literal(custom) + "," + literal(A) + ",false,'Custom','[{\"name\":\"Farine\",\"amount\":100,\"unit\":\"g\"}]');")
        assert_equal(json.loads(run("SELECT resolve_stock_recipe(" + literal(custom) + ",'user_recipes');",owner=A))["name"], "Custom")
        execute(command("plan_recipe", {"recipe": {"id": wrapper, "source": "auto"}, "servings": 4, "date": "2026-10-08", "meal_type": "dinner"}))
        assert_equal(run("SELECT recipe_reference->>'id' FROM meal_plan_entries LIMIT 1;"), wrapper)
    check("catalogue, customized wrapper, custom recipe and menu identities", origins_and_library)

    def repeated_ingredients():
        reset_stock(.3)
        run("INSERT INTO recipe_ingredients(recipe_id,ingredient_name,quantity,unit,inventory_product_id,order_index) VALUES(" + literal(RECIPE) + ",'Farine',200,'g'," + literal(PRODUCT) + ",1);")
        operation = recipe_command()
        execute(operation, [allocation(.2,0), allocation(.2,1)], error="INSUFFICIENT_QUANTITY")
        assert_equal(qty(), .3)
        run("DELETE FROM recipe_ingredients WHERE recipe_id=" + literal(RECIPE) + " AND order_index=1;")
    check("repeated ingredients reserve shared lots and cannot overdraw stock", repeated_ingredients)

    def cache_invalidation():
        if cache_table_is_complete:
            payload=literal(json.dumps({'pipeline_version':3,'profile_version':0}))+'::jsonb'
            run("INSERT INTO recipe_recommendation_cache(user_id,cache_key,result_json,expires_at) VALUES(" + literal(A) + ",'a',"+payload+",now()+interval '15 minutes'),(" + literal(B) + ",'b',"+payload+",now()+interval '15 minutes');")
        else:
            run("INSERT INTO recipe_recommendation_cache VALUES(" + literal(A) + ",'a','{}'),(" + literal(B) + ",'b','{}');")
        previous = int(run("SELECT revision FROM stock_context_versions WHERE user_id=" + literal(A) + ";"))
        reset_stock()
        assert_equal(run("SELECT count(*) FROM recipe_recommendation_cache WHERE user_id=" + literal(A) + ";"), "0")
        assert_equal(run("SELECT count(*) FROM recipe_recommendation_cache WHERE user_id=" + literal(B) + ";"), "1")
        assert int(run("SELECT revision FROM stock_context_versions WHERE user_id=" + literal(A) + ";")) > previous
        assert_equal(run("SELECT count(*) FROM stock_context_versions WHERE user_id=" + literal(B) + ";", owner=A), "0")
    check("manual/command invalidation is transactional and restricted to the account", cache_invalidation)


def routine_tests(capability=2):
    def routine_ownership():
        assert_equal(run("SELECT stock_routine_capabilities();",owner=A),str(capability))
        run("SELECT stock_routine_capabilities();",role="anon",error="permission denied")
        run("INSERT INTO mobile_routine_preferences(user_id,introduction) VALUES(" + literal(A) + ",'skipped');", owner=A)
        assert_equal(run("SELECT introduction FROM mobile_routine_preferences;", owner=A), "skipped")
        assert_equal(run("SELECT count(*) FROM mobile_routine_preferences;", owner=B), "0")
        run("UPDATE mobile_routine_preferences SET user_id=" + literal(B) + " WHERE user_id=" + literal(A) + ";", owner=A,error="row-level security")
        run("INSERT INTO mobile_routine_preferences(user_id) VALUES(" + literal(B) + ");",owner=A,error="row-level security")
        run("SELECT * FROM mobile_routine_preferences;",role="anon",error="permission denied")
        run("INSERT INTO routine_recipe_favorites(user_id,recipe_id,recipe_source) VALUES(" + literal(A) + "," + literal(RECIPE) + ",'recipes');",owner=A)
        assert_equal(run("SELECT count(*) FROM routine_recipe_favorites;",owner=B),"0")
        run("DELETE FROM routine_recipe_favorites;",owner=B)
        assert_equal(run("SELECT count(*) FROM routine_recipe_favorites;",owner=A),"1")
        run("INSERT INTO routine_recipe_favorites(user_id,recipe_id,recipe_source) VALUES(" + literal(B) + "," + literal(RECIPE) + ",'recipes');",owner=A,error="row-level security")
    check("routine introduction and favorites stay owned across devices/accounts",routine_ownership)

    def reviewed_transfer():
        shopping=str(uuid.uuid4())
        run("INSERT INTO shopping_list(id,user_id,product_id,quantity,unit,is_purchased) VALUES(" + literal(shopping) + "," + literal(A) + "," + literal(PRODUCT) + ",1,'kg',true);")
        operation=command("transfer_shopping",{"items":[{"id":shopping,"expected_version":0,"quantity":750,"unit":"g","location":"Placard","expiry_date":None}]})
        result=execute(operation)
        assert_equal(execute(operation),result)
        lot=result['inventory_ids'][0]
        row=json.loads(run("SELECT jsonb_build_array(quantity,unit,location,expiry_date) FROM inventory WHERE id=" + literal(lot) + ";"))
        assert_equal(row,[750,'g','Placard',None])
        execute(command("undo_stock",{"original_command_id":result['command_id']}))
        assert_equal(run("SELECT quantity FROM shopping_list WHERE id=" + literal(shopping) + ";"),'1')
    check("edited shopping quantities/units transfer atomically; undo restores original purchase",reviewed_transfer)

    def actual_cooking():
        reset_stock()
        recipe=str(uuid.uuid4())
        operation=command("save_recipe",{"recipe":{"name":"Pain V10-02","instructions":"Mélanger","prep_time":5,"cook_time":10,"servings":4,"difficulty":1},"ingredients":[{"ingredient_name":"Farine","quantity":200,"unit":"g"}]})
        recipe=execute(operation)['recipe_id']
        cook=recipe_command(recipe=recipe,servings=8)
        cook['payload']['adjustments']=[{"ingredient_index":0,"quantity":125,"unit":"g","inventory_id":LOT,"inventory_product_id":PRODUCT}]
        result=execute(cook,[allocation(.125)])
        assert_equal(qty(),.875)
        assert_equal(execute(cook,[allocation(.125)]),result)
        assert_equal(run("SELECT count(*) FROM cooking_journal_entries WHERE stock_command_id=" + literal(result['command_id']) + ";"),'1')
        execute(command("undo_stock",{"original_command_id":result['command_id']}))
        assert_equal(qty(),1)
        zero=recipe_command(recipe=recipe)
        zero['payload']['adjustments']=[{"ingredient_index":0,"quantity":0,"unit":"g"}]
        execute(zero,[])
        assert_equal(qty(),1)
        # A chosen foreign lot cannot be substituted even through a direct RPC.
        invalid=recipe_command(recipe=recipe)
        invalid['payload']['adjustments']=[{"ingredient_index":0,"quantity":200,"unit":"g","inventory_id":OTHER_LOT}]
        execute(invalid,[allocation(.2)],error='ITEM_NOT_FOUND')
        assert_equal(qty(),1)
        wrong=recipe_command(recipe=recipe)
        wrong['payload']['adjustments']=[{"ingredient_index":0,"quantity":200,"unit":"g","inventory_id":LOT}]
        execute(wrong,[allocation(.1)],error='INSUFFICIENT_QUANTITY')
        assert_equal(qty(),1)
    check("actual meal quantities apply once, unused ingredients consume zero, foreign/incorrect lots rejected",actual_cooking)

    def explicit_substitution():
        reset_stock()
        product,lot=str(uuid.uuid4()),str(uuid.uuid4())
        run("INSERT INTO products(id,name,category,unit_type) VALUES(" + literal(product) + ",'Farine de riz','Épicerie','kg');")
        run("INSERT INTO inventory(id,user_id,product_id,quantity,unit) VALUES(" + literal(lot) + "," + literal(A) + "," + literal(product) + ",1,'kg');")
        cook=recipe_command()
        cook['payload']['adjustments']=[{"ingredient_index":0,"quantity":125,"unit":"g","inventory_product_id":product,"inventory_id":lot}]
        result=execute(cook,[allocation(.125,lot=lot)])
        assert_equal(qty(),1)
        assert_equal(qty(lot),.875)
        execute(command("undo_stock",{"original_command_id":result['command_id']}))
        assert_equal(qty(lot),1)
    check("explicit replacement consumes only the chosen product and lot; inverse restores it",explicit_substitution)


if __name__ == "__main__":
    run("CREATE DATABASE " + DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-schema.sql")
        run(file=ROOT / "supabase/migrations/20261008151704_v10_reliability_commands.sql")
        run(file=ROOT / "supabase/migrations/20261008210917_v10_mobile_routine.sql")
        tests()
        routine_tests()
        print(f"{checks} groups passed on real PostgreSQL (local reconstructed schema).")
    finally:
        run("DROP DATABASE " + DATABASE + ";", database="postgres")
