#!/usr/bin/env python3
"""V10-03 tests on a new local-only disposable database, including real RLS/CAS."""
import concurrent.futures
import importlib.util
import json
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("stock_tests", Path(__file__).with_name("test-v10-stock-db.py"))
stock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stock)
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT


def settings(**changes):
    return {"consent": True, "allergies": [], "excludedIngredients": [], "diets": [],
            "likedIngredients": [], "avoidedIngredients": [], "cuisines": [],
            "usualTimeMinutes": None, "skill": None, "equipment": [], "usualServings": None,
            "goals": [], "targets": {"enabled": False, "dailyCaloriesKcal": None, "dailyProteinG": None},
            "shareWithAssistant": False, **changes}


def profile_command(version, value=None, operation="save", identity=None):
    return {"command_id": identity or str(uuid.uuid4()), "expected_version": version,
            "operation": operation, "settings": value or settings(), "origin": "explicit"}


def write(command, owner=A, error=None):
    result = run("SELECT write_nutrition_profile(" + literal(json.dumps(command)) + "::jsonb);", owner=owner, error=error)
    return json.loads(result) if not error else result


def read(owner=A):
    output = run("SELECT to_jsonb(p) FROM nutrition_profiles p WHERE user_id=" + literal(owner) + ";", owner=owner)
    return json.loads(output) if output else None


def feedback(reference, kind, owner=A, identity=None, event=None, error=None):
    command = {"command_id": identity or str(uuid.uuid4()), "recipe": reference, "feedback": kind, "event_id": event}
    result = run("SELECT record_recommendation_feedback(" + literal(json.dumps(command)) + "::jsonb);", owner=owner, error=error)
    return json.loads(result) if not error else result


def count(table, owner=A):
    return int(run("SELECT count(*) FROM " + table + " WHERE user_id=" + literal(owner) + ";"))


def tests():
    def reconnect():
        equal(write(profile_command(0, settings(allergies=["lait"])))["version"], 1)
        equal(read()["settings"]["allergies"], ["lait"])
        equal(read()["version"], 1)  # each run opens another independent authenticated connection
        equal(write(profile_command(0, settings(diets=["vegan"])), B)["version"], 1)
        equal(read(B)["settings"]["allergies"], [])
    check("profile persists across connections, owners keep separate values", reconnect)

    def isolation():
        equal(run("SELECT count(*) FROM nutrition_profiles WHERE user_id=" + literal(B) + ";", owner=A), "0")
        run("UPDATE nutrition_profiles SET settings=" + literal(json.dumps(settings(allergies=["arachides"]))) + "::jsonb WHERE user_id=" + literal(B) + ";", owner=A)
        equal(read(B)["settings"]["allergies"], [])
        run("INSERT INTO nutrition_profiles(user_id,settings,origin) VALUES(" + literal(B) + "," + literal(json.dumps(settings())) + "::jsonb,'explicit');", owner=A, error="row-level security")
        run("SELECT * FROM nutrition_profiles;", role="anon", error="permission denied")
        run("SELECT write_nutrition_profile('{}');", role="anon", error="permission denied")
        run("DELETE FROM nutrition_profiles;", owner=A, error="permission denied")
    check("RLS blocks foreign reads/writes and anonymous access; no direct version reset", isolation)

    def replay():
        command = profile_command(1, settings(allergies=["lait", "arachides"]))
        equal(write(command)["version"], 2)
        equal(write(command)["version"], 2)
        equal(read()["version"], 2)
        command["settings"]["allergies"] = []
        write(command, error="IDEMPOTENCY_CONFLICT")
        equal(read()["settings"]["allergies"], ["lait", "arachides"])
        write(profile_command(1), error="PROFILE_VERSION_CONFLICT")
    check("lost reply replays once; UUID reuse and stale version cannot erase constraints", replay)

    def concurrent_writes():
        commands = [profile_command(2, settings(allergies=[allergy])) for allergy in ["lait", "arachides"]]
        def attempt(command):
            try:
                return write(command)
            except AssertionError as error:
                assert "PROFILE_VERSION_CONFLICT" in str(error), error
                return None
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(attempt, commands))
        equal(sum(result is not None for result in results), 1)
        equal(read()["version"], 3)
    check("two devices writing the same version: exactly one commits", concurrent_writes)

    def direct_shape():
        for values in [settings(weight=75), settings(diets=["magic"]), settings(skill=4), settings(usualServings=2.5), settings(targets={"enabled": False,"dailyCaloriesKcal":1800,"dailyProteinG":None})]:
            run("UPDATE nutrition_profiles SET settings=" + literal(json.dumps(values)) + "::jsonb WHERE user_id=" + literal(A) + ";", owner=A, error="nutrition_profile_shape")
        run("UPDATE nutrition_profiles SET version=999,updated_at='2000-01-01' WHERE user_id=" + literal(A) + ";", owner=A)
        equal(read()["version"], 4)
        assert read()["updated_at"][:4] != "2000"
        malformed = profile_command(4)
        del malformed["origin"]
        write(malformed, error="INVALID_PROFILE")
    check("direct writes validate shape, forbid clinical fields and cannot forge a version", direct_shape)

    def cache():
        for owner in [A, B]:
            payload = json.dumps({"pipeline_version": 3, "profile_version": read(owner)["version"]})
            run("INSERT INTO recipe_recommendation_cache(user_id,cache_key,result_json,expires_at) VALUES(" + literal(owner) + ",'test'," + literal(payload) + "::jsonb,now()+interval '15 minutes');", owner=owner)
        write(profile_command(4,settings(likedIngredients=["riz"])))
        equal(count("recipe_recommendation_cache",A),0)
        equal(count("recipe_recommendation_cache",B),1)
    check("profile edit invalidates only its owner's private cache", cache)

    refs = []
    def recipe_origins():
        catalog, wrapper = str(uuid.uuid4()), str(uuid.uuid4())
        run("INSERT INTO recipes_catalog(id,title,ingredients_json) VALUES(" + literal(catalog) + ",'Catalogue test','[]');")
        run("INSERT INTO user_recipes(id,user_id,recipe_id) VALUES(" + literal(wrapper) + "," + literal(A) + "," + literal(catalog) + ");")
        refs.extend([{"id": stock.RECIPE,"source":"recipes"},{"id":catalog,"source":"recipes_catalog"},{"id":wrapper,"source":"user_recipes"}])
        for ref in refs:
            identity = str(uuid.uuid4())
            first = feedback(ref,"repeat",identity=identity)
            equal(feedback(ref,"repeat",identity=identity),first)
            feedback(ref,"dislike",identity=identity,error="IDEMPOTENCY_CONFLICT")
        feedback({"id":"30000000-0000-4000-8000-000000000002","source":"recipes"},"dislike",error="RECIPE_NOT_FOUND")
        feedback(refs[2],"repeat",B,error="RECIPE_NOT_FOUND")
        equal(count("recipe_interactions"),3)
    check("feedback supports every recipe origin, replays once and rejects private foreign recipes", recipe_origins)

    def feedback_scope():
        event=str(uuid.uuid4())
        run("INSERT INTO recommendation_events(id,user_id) VALUES(" + literal(event) + "," + literal(B) + ");")
        feedback(refs[0],"not_today",event=event,error="FORBIDDEN")
        for kind in ["dislike","too_long","not_today"]:
            feedback(refs[0],kind)
        equal(count("recipe_interactions"),6)
        run("SELECT record_recommendation_feedback('{}');",role="anon",error="permission denied")
        feedback({"id":stock.RECIPE,"source":"auto"},"repeat",error="INVALID_PROFILE")
    check("four feedback kinds are stored distinctly, event ownership enforced", feedback_scope)

    def privacy_clear():
        for owner in [A,B]:
            run("INSERT INTO assistant_memory_items(user_id,kind,content) VALUES(" + literal(owner) + ",'constraint','allergie fixture');")
            run("INSERT INTO user_meal_preferences(user_id,allergies) VALUES(" + literal(owner) + ",ARRAY['lait']);")
            run("INSERT INTO assistant_action_log(user_id,tool,result) VALUES(" + literal(owner) + ",'suggest_recipes_for_context','{\"constraint\":\"allergie fixture\"}');")
            run("INSERT INTO assistant_action_log(user_id,tool) VALUES(" + literal(owner) + ",'add_shopping_items');")
        exported=json.loads(run("SELECT export_nutrition_personalization();",owner=A))
        equal(exported["nutrition_profile"]["user_id"],A)
        equal(len(exported["assistant_memory"]),1)
        assert all(row['user_id']==A for row in exported['recommendation_interactions'])
        equal(exported["assistant_memory"][0]["user_id"],A)
        equal(len(exported['recommendation_action_receipts']),1)
        equal(exported['recommendation_action_receipts'][0]['user_id'],A)
        clear=profile_command(5,settings(consent=False),"clear")
        equal(write(clear)["version"],6)
        equal(write(clear)["version"],6)
        equal(read()["settings"]["allergies"],[])
        equal(read()["settings"]["consent"],False)
        for table in ['assistant_memory_items','recipe_interactions','recommendation_events','recipe_recommendation_cache','user_meal_preferences']:
            equal(count(table),0)
        equal(count('assistant_memory_items',B),1)
        equal(count('assistant_action_log'),1)  # reversible-write receipt stays usable
        run("DELETE FROM assistant_action_log WHERE user_id="+literal(A)+";",owner=A)
        equal(count('assistant_action_log'),1)  # no permission to delete write receipts
        equal(count('assistant_action_log',B),2)
        run("INSERT INTO recipe_recommendation_cache(user_id,cache_key,result_json,expires_at) VALUES(" + literal(A) + ",'late','{\"pipeline_version\":3,\"profile_version\":5}',now()+interval '15 minutes');", owner=A, error="PROFILE_VERSION_CONFLICT")
        equal(count('recipe_recommendation_cache'),0)
        write(profile_command(0),error="PROFILE_VERSION_CONFLICT")
        run("SELECT export_nutrition_personalization();",role="anon",error="permission denied")
    check("owned export includes profile/memory; verified clear removes scoped data with version tombstone", privacy_clear)

    def metadata():
        update=stock.command('adjust_inventory',{'items':[{'id':stock.LOT,'expected_version':stock.version(),'quantity':.8,'unit':'kg','date_kind':'best_before','quantity_quality':'estimated','expiry_date':'2026-10-10'}]})
        applied=stock.execute(update)
        equal(run("SELECT date_kind||':'||quantity_quality FROM inventory WHERE id="+literal(stock.LOT)+";"),'best_before:estimated')
        equal(stock.execute(update),applied)
        stock.execute(stock.command('undo_stock',{'original_command_id':applied['command_id']}))
        equal(run("SELECT date_kind||':'||quantity_quality FROM inventory WHERE id="+literal(stock.LOT)+";"),'unknown:unknown')
        bad=stock.command('adjust_inventory',{'items':[{'id':stock.LOT,'expected_version':stock.version(),'quantity':.7,'unit':'kg','date_kind':'unverified_magic'}]})
        stock.execute(bad,error='check constraint')
        equal(stock.qty(),1)
        equal(run('SELECT stock_routine_capabilities();',owner=A),'3')
    check("lot metadata participates in atomic correction, receipt replay and inverse", metadata)

    def adapted_ingredients():
        wrapper = refs[2]['id']
        adapted = [{'name': 'Farine', 'quantity': 125, 'unit': 'g', 'inventory_product_id': stock.PRODUCT}]
        run("UPDATE user_recipes SET custom_ingredients_json=" + literal(json.dumps(adapted)) + "::jsonb WHERE id=" + literal(wrapper) + ";")
        resolved = json.loads(run("SELECT resolve_stock_recipe(" + literal(wrapper) + ",'user_recipes');", owner=A))
        equal(resolved['ingredients'][0]['ingredient_name'], 'Farine')
        equal(resolved['ingredients'][0]['quantity'], 125)
        applied = stock.execute(stock.recipe_command(recipe=wrapper,servings=4,source='user_recipes'),[stock.allocation(.125)])
        equal(stock.qty(), .875)
        stock.execute(stock.command('undo_stock',{'original_command_id':applied['command_id']}))
        equal(stock.qty(), 1)
    check("personal ingredient adaptation is used by actual consumption, not the canonical recipe", adapted_ingredients)

    def transfer_metadata():
        shopping = str(uuid.uuid4())
        run("INSERT INTO shopping_list(id,user_id,product_id,quantity,unit,is_purchased) VALUES(" + literal(shopping) + "," + literal(A) + "," + literal(stock.PRODUCT) + ",1,'kg',true);")
        operation = stock.command('transfer_shopping',{'items':[{'id':shopping,'expected_version':0,'quantity':.5,'unit':'kg','location':'fridge','expiry_date':'2026-10-12','date_kind':'use_by','quantity_quality':'measured'}]})
        applied = stock.execute(operation)
        equal(run("SELECT date_kind||':'||quantity_quality FROM inventory WHERE user_id=" + literal(A) + " AND expiry_date='2026-10-12';"),'use_by:measured')
        equal(stock.execute(operation),applied)
        stock.execute(stock.command('undo_stock',{'original_command_id':applied['command_id']}))
        equal(run("SELECT count(*) FROM inventory WHERE user_id=" + literal(A) + " AND expiry_date='2026-10-12';"),'0')
        equal(float(run("SELECT quantity FROM shopping_list WHERE id=" + literal(shopping) + ";")),1)
    check("shopping transfer preserves date and quantity qualification, replays once and restores the purchase", transfer_metadata)

    def deletion_worker():
        write(profile_command(6,settings(allergies=['lait'])))
        request=str(uuid.uuid4())
        run("INSERT INTO data_deletion_requests(id,user_id) VALUES("+literal(request)+","+literal(A)+");",owner=A)
        run("CREATE FUNCTION fail_profile_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$;CREATE TRIGGER test_fail BEFORE DELETE ON nutrition_profiles FOR EACH ROW EXECUTE FUNCTION fail_profile_delete();")
        failed=json.loads(run('SELECT process_pending_deletion_requests(1);',role='service_role'))
        equal(failed['failed'],1)
        equal(run("SELECT status FROM data_deletion_requests WHERE id="+literal(request)+";"),'failed')
        assert read() is not None
        run("DROP TRIGGER test_fail ON nutrition_profiles;UPDATE data_deletion_requests SET status='pending' WHERE id="+literal(request)+";")
        completed=json.loads(run('SELECT process_pending_deletion_requests(1);',role='service_role'))
        equal(completed['processed'],1)
        for table in ['nutrition_profiles','nutrition_profile_commands','assistant_memory_items','recipe_interactions','recipe_recommendation_cache','user_meal_preferences','assistant_action_log']:
            equal(count(table),0)
        equal(read(B)['settings']['diets'],['vegan'])
    check("deletion worker cannot report completed when new-data cleanup fails, then retries atomically", deletion_worker)


if __name__ == '__main__':
    run('CREATE DATABASE '+stock.DATABASE+';',database='postgres')
    try:
        run(file=ROOT/'supabase/tests/v10-personalization-schema.sql')
        for name in ['20261008151704_v10_reliability_commands.sql','20261008210917_v10_mobile_routine.sql','20261009095426_v10_personalization.sql']:
            run(file=ROOT/'supabase/migrations'/name)
        # Re-run the original transaction and routine scenarios on the latest
        # functions and real recommendation cache, not only the older schema.
        stock.tests(cache_table_is_complete=True)
        stock.routine_tests(capability=3)
        tests()
        print(f'{stock.checks} groups passed with V10-03 on real local PostgreSQL (17 regression + 13 personalization).')
    finally:
        run('DROP DATABASE '+stock.DATABASE+';',database='postgres')
