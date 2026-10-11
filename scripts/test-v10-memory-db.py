#!/usr/bin/env python3
"""Actual SQL, real client grants and two fictitious owners in a new local database."""
import concurrent.futures
import importlib.util
import json
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("profile_tests", Path(__file__).with_name("test-v10-personalization-db.py"))
profile = importlib.util.module_from_spec(spec)
spec.loader.exec_module(profile)
stock = profile.stock
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT

def policy(owner=A):
    return json.loads(run("SELECT read_assistant_memory_policy();",owner=owner))

def enable(owner=A, **changes):
    return json.loads(run("SELECT patch_assistant_privacy_settings("+literal(json.dumps(changes))+"::jsonb);",owner=owner))

def command(text=None, owner=A, operation="save", item=None, version=0, identity=None, source="user_explicit", **changes):
    result={"command_id":identity or str(uuid.uuid4()),"expected_revision":policy(owner)["revision"],
            "expected_version":version,"operation":operation,**changes}
    if item: result["memory_id"]=item
    if text: result["payload"]={"content":text,"source":source,"evidence":{"channel":"text"}}
    return result

def execute(value, owner=A, error=None):
    out=run("SELECT execute_assistant_memory_command("+literal(json.dumps(value))+"::jsonb);",owner=owner,error=error)
    return json.loads(out) if not error else out

def item(identity,owner=A):
    out=run("SELECT COALESCE((SELECT to_jsonb(m) FROM assistant_memory_items m WHERE id="+literal(identity)+"),'null'::jsonb);",owner=owner)
    return json.loads(out) if out else None

def artifact(kind,payload,owner=A,revision=None):
    out=run("SELECT persist_assistant_memory_artifact("+literal(owner)+"::uuid,"+
            str(policy(owner)["revision"] if revision is None else revision)+","+literal(kind)+","+
            literal(json.dumps(payload))+"::jsonb);",role="service_role")
    return json.loads(out) if out else None

def tests():
    equal(policy()["memoryEnabled"],False)
    equal(policy()["saveHistory"],False)
    equal(execute(command("Souviens-toi que je préfère les plats épicés"))["status"],"disabled")
    enable(assistantMemoryEnabled=True,saveHistory=True)
    enable(B,assistantMemoryEnabled=True,saveHistory=True)

    def sensitive():
        result=execute(command("Souviens-toi que je suis allergique aux cacahuètes"))
        equal(result["status"],"awaiting_confirmation")
        row=item(result["memory_id"])
        equal(row["destination"],"profile");equal(row["sensitivity"],"health_sensitive");equal(row["status"],"candidate")
        equal(run("SELECT count(*) FROM assistant_memory_items WHERE user_id="+literal(A)+" AND status='active' AND content ILIKE '%allerg%';"),"0")
        compound=execute(command("Souviens-toi que je suis allergique au lait et au soja"))
        equal(item(compound["memory_id"])["payload"]["field"],None)
        manual=execute(command(operation="confirm",item=compound["memory_id"],version=1))
        equal(manual["status"],"awaiting_confirmation");equal(manual["reason"],"open_profile")
        return result
    allergy=sensitive()
    check("allergy is one profile proposal, never an active ordinary preference", lambda: equal(item(allergy["memory_id"])["version"],1))

    first=execute(command("Souviens-toi que je préfère les plats épicés"))
    def replay():
        c=command("Souviens-toi que je préfère les plats épicés",identity=str(uuid.uuid4()))
        result=execute(c)
        equal(result["memory_id"],first["memory_id"])
        equal(execute(c)["replayed"],True)
        c["payload"]["content"]="Je préfère les plats doux"
        execute(c,error="IDEMPOTENCY_CONFLICT")
        equal(run("SELECT count(*) FROM assistant_memory_items WHERE destination='memory' AND status='active';"),"1")
    check("semantic dedup, durable receipts and lost-reply replay",replay)

    def simultaneous_replay():
        c=command("Souviens-toi de mon carnet de bord fictif")
        with concurrent.futures.ThreadPoolExecutor(2) as pool: results=list(pool.map(execute,[c,c]))
        equal(results[0]["memory_id"],results[1]["memory_id"])
        equal(sum(bool(r.get("replayed")) for r in results),1)
        equal(run("SELECT count(*) FROM assistant_memory_commands WHERE command_id="+literal(c["command_id"])+";"),"1")
    check("two simultaneous identical command IDs create one effect and one receipt",simultaneous_replay)

    def rights():
        equal(item(first["memory_id"],B),None)
        run("SELECT * FROM assistant_memory_commands WHERE user_id="+literal(A)+";",owner=B)
        run("SELECT * FROM assistant_memory_items;",role="anon",error="permission denied")
        run("SELECT execute_assistant_memory_command('{}');",role="anon",error="permission denied")
        run("SELECT read_assistant_memory_policy("+literal(B)+");",owner=A,error="FORBIDDEN")
        execute(command(operation="forget",item=first["memory_id"],version=1,owner=B),B,error="MEMORY_NOT_FOUND")
        run("INSERT INTO assistant_memory_items(user_id,kind,content) VALUES("+literal(A)+",'preference','allergie');",owner=A,error="permission denied")
        run("UPDATE assistant_memory_items SET user_id="+literal(B)+";",owner=A,error="permission denied")
        run("DELETE FROM assistant_memory_items;",owner=A,error="permission denied")
        run("SELECT persist_assistant_memory_artifact("+literal(A)+",0,'conversation','{}');",owner=A,error="permission denied")
        run("SELECT private.bump_memory_revision("+literal(A)+");",owner=A,error="permission denied")
        run("INSERT INTO assistant_memory_commands VALUES("+literal(A)+",gen_random_uuid(),'x','{}',now());",owner=A,error="permission denied")
    check("actual grants, private functions, anonymous and cross-owner isolation",rights)

    def concurrency():
        frozen=command("Finalement je préfère les plats doux",operation="correct",item=first["memory_id"],version=1)
        other={**frozen,"command_id":str(uuid.uuid4()),"payload":{"content":"Souviens-toi que je préfère les plats épicés","source":"user_explicit"}}
        def attempt(c):
            try: return execute(c)
            except AssertionError as e:
                assert "MEMORY_REVISION_CONFLICT" in str(e) or "MEMORY_VERSION_CONFLICT" in str(e),e
                return None
        with concurrent.futures.ThreadPoolExecutor(2) as pool: results=list(pool.map(attempt,[frozen,other]))
        equal(sum(r is not None for r in results),1)
        equal(item(first["memory_id"])["version"],2)
    check("two devices: one version wins and the stale edit fails",concurrency)

    def confirm_profile():
        result=execute(command(operation="confirm",item=allergy["memory_id"],version=1,expected_profile_version=0))
        equal(result["status"],"awaiting_confirmation");equal(result["reason"],"profile_consent_required")
        profile.write(profile.profile_command(0,profile.settings()))
        c=command(operation="confirm",item=allergy["memory_id"],version=1,expected_profile_version=1)
        result=execute(c);equal(result["status"],"saved");equal(result["profile_version"],2)
        equal(profile.read()["settings"]["allergies"],["cacahuetes"])
        equal(execute(c)["replayed"],True);equal(profile.read()["version"],2)
        execute(command(operation="forget",item=allergy["memory_id"],version=2))
        equal(profile.read()["settings"]["allergies"],["cacahuetes"])
    check("confirmation writes canonical profile atomically; forgetting the reference keeps the allergy",confirm_profile)

    def summaries():
        conv=artifact("conversation",{"mode":"general"})
        message=artifact("message",{"conversation_id":conv["id"],"role":"user","content":"Choisissons une soupe fictive"})
        coverage={"conversation_id":conv["id"],"covered_message_ids":[message["id"]]}
        claim=artifact("summary_claim",coverage);assert claim["claimed"]
        equal(artifact("summary_claim",coverage),None)
        summary=artifact("summary",{**coverage,"summary":"Soupe choisie. Cuisson à vérifier.","model_used":"mock"})
        assert summary["id"]
        old_revision=policy()["revision"]
        row=item(first["memory_id"])
        execute(command(operation="forget",item=row["id"],version=row["version"]))
        equal(run("SELECT count(*) FROM assistant_conversation_summaries WHERE user_id="+literal(A)+";"),"0")
        equal(artifact("summary",{**coverage,"summary":"Ancien fait","model_used":"mock"},revision=old_revision),None)
        deleted=item(row["id"]);equal(deleted["content"],"");equal(deleted["payload"],None);equal(deleted["evidence"],{})
        blocked=execute(command("Je préfère les plats épicés",source="assistant_inferred"))
        equal(blocked["status"],"not_saved");equal(blocked["reason"],"previously_rejected")
    check("one summary coverage; forget purges derived contexts, rejects stale writes and re-extraction",summaries)

    def consent():
        old=policy()["revision"]
        enable(assistantMemoryEnabled=False,saveHistory=False)
        equal(artifact("conversation",{"mode":"general"},revision=old),None)
        equal(execute(command("Souviens-toi de mon carnet"))["status"],"disabled")
        enable(assistantMemoryEnabled=True)
        equal(policy()["saveHistory"],False)
        # Concurrent partial settings updates must preserve both changes.
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            list(pool.map(lambda patch: enable(**patch),[{"allowAnalytics":True},{"batterySaver":True}]))
        row=json.loads(run("SELECT settings FROM user_privacy_settings WHERE user_id="+literal(A)+";"))
        equal(row["allowAnalytics"],True);equal(row["batterySaver"],True)
    check("revocation blocks in-flight persistence; independent consent and atomic partial settings",consent)

    def feedback():
        payload={"command_id":str(uuid.uuid4()),"recipe_id":stock.RECIPE,"recipe_source":"recipes","recipe_title":"Plat fictif","outcome":"liked"}
        sql="SELECT record_assistant_recipe_feedback("+literal(json.dumps(payload))+"::jsonb);"
        result=json.loads(run(sql,owner=A));equal(result["status"],"saved");equal(result["affects_suggestions"],True)
        equal(json.loads(run(sql,owner=A))["replayed"],True)
        equal(run("SELECT count(*) FROM recipe_interactions WHERE user_id="+literal(A)+" AND feedback_command_id="+literal(payload["command_id"])+";"),"1")
        equal(run("SELECT count(*) FROM cooking_journal_entries WHERE user_id="+literal(A)+" AND feedback_command_id="+literal(payload["command_id"])+";"),"1")
        run(sql,role="anon",error="permission denied")
        run(sql,owner=B,error="RECIPE_NOT_FOUND")
        payload["outcome"]="disliked"
        run("SELECT record_assistant_recipe_feedback("+literal(json.dumps(payload))+"::jsonb);",owner=A,error="IDEMPOTENCY_CONFLICT")
        payload["command_id"]=str(uuid.uuid4());payload["recipe_id"]="30000000-0000-4000-8000-000000000002"
        run("SELECT record_assistant_recipe_feedback("+literal(json.dumps(payload))+"::jsonb);",owner=A,error="RECIPE_NOT_FOUND")
        equal(run("SELECT count(*) FROM cooking_journal_entries WHERE feedback_command_id="+literal(payload["command_id"])+";"),"0")
    check("feedback atomically writes ranking interaction and journal, with retry and owner isolation",feedback)

    def retention():
        enable(assistantMemoryEnabled=True,saveHistory=True,dataRetention="minimal")
        text="Souviens-toi de mon carnet de conservation fictif"
        saved=execute(command(text))
        equal(run("SELECT expires_at BETWEEN now()+interval '6 days' AND now()+interval '8 days' FROM assistant_memory_items WHERE id="+literal(saved["memory_id"])+";"),"t")
        legacy=str(uuid.uuid4())
        run("INSERT INTO assistant_memory_items(id,user_id,kind,content,expires_at) VALUES("+literal(legacy)+","+literal(A)+",'preference','Ancien souvenir fictif',now()-interval '1 day');")
        other=execute(command("Souviens-toi du carnet d'un autre compte",owner=B),B)
        conv=artifact("conversation",{"mode":"general"})
        message=artifact("message",{"conversation_id":conv["id"],"role":"user","content":"Soupe fictive à préparer"})
        coverage={"conversation_id":conv["id"],"covered_message_ids":[message["id"]]}
        artifact("summary_claim",coverage)
        artifact("summary",{**coverage,"summary":"Une soupe à préparer","model_used":"mock"})
        old=policy()["revision"]
        run("UPDATE assistant_memory_items SET expires_at=now()-interval '1 minute' WHERE id="+literal(saved["memory_id"])+";")
        run("UPDATE assistant_conversations SET expires_at=now()-interval '1 minute' WHERE id="+literal(conv["id"])+";")
        assert policy()["revision"]>old
        equal(item(saved["memory_id"]),None)
        assert item(legacy) and item(other["memory_id"],B)
        equal(run("SELECT count(*) FROM assistant_messages WHERE id="+literal(message["id"])+";"),"0")
        equal(run("SELECT count(*) FROM assistant_conversation_summaries WHERE user_id="+literal(A)+";"),"0")
        equal(artifact("message",{"conversation_id":conv["id"],"role":"user","content":"Réponse tardive"},revision=old),None)
        equal(execute(command(text,source="assistant_inferred"))["status"],"not_saved")
        enable(dataRetention="full",autoDeleteAfter=0)
        full=execute(command("Souviens-toi de mon carnet sans échéance fictif"))
        equal(item(full["memory_id"])["expires_at"],None)
        enable(autoDeleteAfter=3)
        equal(run("SELECT expires_at BETWEEN now()+interval '2 days' AND now()+interval '4 days' FROM assistant_memory_items WHERE id="+literal(full["memory_id"])+";"),"t")
        run("SELECT private.expire_memory_data("+literal(A)+");",owner=A,error="permission denied")
    check("retention expires and purges new data, preserves legacy and other owners, and blocks resurrection",retention)

    def profile_clear():
        version=profile.read()["version"]
        clear=profile.profile_command(version,profile.settings(consent=False),"clear")
        equal(profile.write(clear)["version"],version+1)
        equal(profile.write(clear)["version"],version+1)
        equal(run("SELECT count(*) FROM assistant_memory_items WHERE user_id="+literal(A)+";"),"0")
        # A late derived cache write is rejected after a memory revision change.
        rev=policy()["revision"]
        enable(assistantMemoryEnabled=False)
        cache={"pipeline_version":3,"profile_version":version+1,"memory_revision":rev}
        run("INSERT INTO recipe_recommendation_cache(user_id,cache_key,result_json,expires_at) VALUES("+literal(A)+",'v10-03c:test',"+literal(json.dumps(cache))+",now()+interval '15 minutes');",owner=A,error="MEMORY_REVISION_CONFLICT")
    check("canonical profile clear remains replayable; cache writes are guarded against revocation",profile_clear)

    def export_delete():
        saved=execute(command("Souviens-toi que je préfère les plats épicés",owner=B),B)
        exported=json.loads(run("SELECT export_assistant_memory();",owner=A))
        for rows in exported.values(): assert all(r["user_id"]==A for r in rows)
        equal(len(exported),10)
        run("SELECT export_assistant_memory();",role="anon",error="permission denied")
        req=str(uuid.uuid4())
        run("INSERT INTO data_deletion_requests(id,user_id) VALUES("+literal(req)+","+literal(A)+");",owner=A)
        run("UPDATE data_deletion_requests SET status='completed' WHERE id="+literal(req)+";")
        for table in exported:
            equal(run("SELECT count(*) FROM "+table+" WHERE user_id="+literal(A)+";"),"0")
        assert item(saved["memory_id"],B)
    check("owned export and completed-deletion cleanup include all ten memory objects",export_delete)

if __name__=="__main__":
    run("CREATE DATABASE "+stock.DATABASE+";",database="postgres")
    try:
        run(file=ROOT/"supabase/tests/v10-memory-schema.sql")
        for name in ["20261008151704_v10_reliability_commands.sql","20261008210917_v10_mobile_routine.sql","20261009095426_v10_personalization.sql","20261011184535_v10_assistant_memory.sql"]:
            run(file=ROOT/"supabase/migrations"/name)
        tests()
        print(str(stock.checks)+" groups passed on real local PostgreSQL (no remote data).")
    finally:
        run("DROP DATABASE "+stock.DATABASE+";",database="postgres")
