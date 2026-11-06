#!/usr/bin/env python3
"""Transactional/RLS discovery + canonical import tests in a new disposable database.
No TCP, real accounts or providers. Start the isolated socket cluster from V10-03F.md.
"""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import uuid
from urllib.parse import urlsplit, parse_qsl, urlencode
ROOT=Path(__file__).resolve().parents[1]
PSQL=os.environ.get("V10_TEST_PSQL","/opt/homebrew/opt/postgresql@16/bin/psql")
SOCKET=os.environ.get("V10_DISCOVERY_TEST_SOCKET","/private/tmp/smartpantry-v10-03f-pg-socket")
PORT=os.environ.get("V10_DISCOVERY_TEST_PORT","55439")
DB="v10_discovery_"+uuid.uuid4().hex[:12]
A="00000000-0000-4000-8000-000000000001"
B="00000000-0000-4000-8000-000000000002"
checks=0
def lit(value): return "'"+str(value).replace("'","''")+"'"
def run(sql=None,owner=None,role=None,file=None,db=DB,error=None):
    assert SOCKET.startswith("/private/tmp/") and not SOCKET.startswith("/private/tmp/../")
    args=[PSQL,"-X","-q","-A","-t","-h",SOCKET,"-p",PORT,"-d",db,"-v","ON_ERROR_STOP=1"]
    if file: args+=["-f",str(file)]; result=subprocess.run(args,text=True,capture_output=True)
    else:
        prefix=("SET ROLE "+(role or "authenticated")+";" if role or owner else "")
        if role or owner: prefix+="SELECT set_config('request.jwt.claim.role',"+lit(role or "authenticated")+",false);"
        if owner: prefix+="SELECT set_config('request.jwt.claim.sub',"+lit(owner)+",false);"
        result=subprocess.run(args,input=prefix+(sql or ""),text=True,capture_output=True)
    if error:
        assert result.returncode and error in result.stderr,(error,result.stderr,result.stdout)
        return result.stderr
    assert result.returncode==0,result.stderr
    rows=result.stdout.strip().splitlines()
    return rows[-1] if rows else ""
def execute(op,payload,owner=A,command_id=None,error=None):
    command={"op":op,"payload":payload}
    if op not in ("seed","selection"): command["commandId"]=command_id or str(uuid.uuid4())
    answer=run("SELECT public.execute_recipe_discovery("+lit(json.dumps(command))+"::jsonb);",owner=owner,error=error)
    return json.loads(answer) if not error else answer
def identity(url):
    u=urlsplit(url);host=u.netloc.removeprefix("www.").removeprefix("m.")
    pairs=[(k,v) for k,v in parse_qsl(u.query,keep_blank_values=True) if not k.startswith("utm") and k not in ("fbclid","igsh","si")]
    query=urlencode(sorted(pairs,key=lambda p:p[0]))
    return host+u.path.rstrip("/")+(("?"+query) if query else "")
def capture(creator,url,title="Recette à vérifier",owner=A,command_id=None,error=None):
    payload={"creatorId":creator,"sourceUrl":url,"canonicalUrl":url,"sourceHash":hashlib.sha256(identity(url).encode()).hexdigest()[:32],"title":title}
    return execute("capture",payload,owner,command_id,error)
def item(id):
    return json.loads(run("SELECT row_to_json(t) FROM recipe_discovery_items t WHERE id="+lit(id)+";"))
def keep(id,command_id=None,error=None,version=None):
    return execute("decision",{"itemId":id,"expectedVersion":version or item(id)["version"],"decision":"keep"},command_id=command_id,error=error)
def prepare(id,command_id=None,error=None):
    return execute("prepare_import",{"itemId":id,"expectedVersion":item(id)["version"]},command_id=command_id,error=error)
def current(import_id):
    return json.loads(run("SELECT row_to_json(t) FROM imported_recipe_drafts t WHERE import_id="+lit(import_id)+" AND is_current;"))
def save(import_id,payload,error=None,owner=A):
    return run("SELECT public.save_imported_recipe("+lit(import_id)+","+lit(json.dumps(payload))+"::jsonb,'[]');",owner=owner,error=error)
def check(label,fn):
    global checks
    fn();checks+=1;print("PASS "+label,flush=True)
def equal(a,b): assert a==b,(a,b)
def recipe_draft(import_id,unknown=False):
    d=current(import_id)["draft_json"]
    d.update(title="Soupe personnelle",ingredients=[{"name":"Farine",**({} if unknown else {"quantity":200,"unit":"g"})}],
        instructions=[{"step":1,"description":"Cuire les ingrédients vérifiés."}])
    if not unknown: d.update(servings=2,prepTimeMinutes=10,cookTimeMinutes=20)
    return d
def main():
    execute("seed",{})
    ca=run("SELECT id FROM recipe_discovery_creators WHERE user_id="+lit(A)+" AND seed_key='andy-cooks';")
    execute("seed",{},owner=B)
    cb=run("SELECT id FROM recipe_discovery_creators WHERE user_id="+lit(B)+" AND seed_key='andy-cooks';")
    def creator_and_privileges():
        execute("seed",{});equal(run("SELECT count(*) FROM recipe_discovery_creators WHERE user_id="+lit(A)+";"),"3")
        execute("pause_creator",{"creatorId":ca,"paused":True,"expectedVersion":1})
        execute("seed",{});equal(run("SELECT paused FROM recipe_discovery_creators WHERE id="+lit(ca)+";"),"t")
        execute("pause_creator",{"creatorId":ca,"paused":False},error="INVALID_COMMAND")
        execute("pause_creator",{"creatorId":ca,"paused":False,"expectedVersion":1},error="VERSION_CONFLICT")
        execute("pause_creator",{"creatorId":ca,"paused":False,"expectedVersion":2})
        run("UPDATE recipe_discovery_creators SET user_id="+lit(B)+" WHERE id="+lit(ca)+";",owner=A,error="permission denied")
        run("SELECT execute_recipe_discovery('{}');",role="anon",error="permission denied")
        run("SELECT * FROM private.recipe_discovery_receipts;",owner=A,error="permission denied")
    check("idempotent creator seeds, reversible pause, mandatory revision, no direct writes/anonymous RPC",creator_and_privileges)
    x=capture(ca,"https://example.org/recipe?id=Soup")["item_id"]
    def dedupe():
        equal(capture(ca,"https://example.org/recipe?id=Soup&utm_source=test")["item_id"],x)
        y=capture(ca,"https://example.org/recipe?id=soup")["item_id"];assert y!=x
        equal(capture(ca,"http://www.example.org/recipe/?id=Soup")["item_id"],x)
        z=capture(ca,"https://example.org/words?name=white%20rice")["item_id"]
        equal(capture(ca,"https://example.org/words?name=white+rice")["item_id"],z)
        execute("capture",{"creatorId":ca,"sourceUrl":"https://example.org/recipe?id=Soup","canonicalUrl":"https://example.org/recipe?id=other","sourceHash":"a"*32},error="INVALID_URL")
    check("meaningful queries/case preserved, protocol/tracking aliases deduped and forged canonical rejected",dedupe)
    def owner_checks():
        capture(cb,"https://example.org/foreign",owner=A,error="CREATOR_NOT_FOUND")
        foreign=capture(cb,"https://example.org/private",owner=B)["item_id"]
        execute("decision",{"itemId":foreign,"expectedVersion":1,"decision":"keep"},error="ITEM_NOT_FOUND")
        equal(run("SELECT count(*) FROM recipe_discovery_items WHERE user_id="+lit(B)+";",owner=A),"0")
        run("INSERT INTO recipe_discovery_items(user_id,creator_id,source_url,canonical_url,source_hash,title) VALUES("+lit(A)+","+lit(cb)+",'https://example.org/a','https://example.org/a','"+("a"*32)+"','x');",owner=A,error="permission denied")
    check("RLS and parent ownership across accounts, direct forged item insert denied",owner_checks)
    def commands():
        cid=str(uuid.uuid4());payload={"itemId":x,"expectedVersion":1,"decision":"keep"}
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            values=list(pool.map(lambda _:execute("decision",payload,command_id=cid),range(2)))
        equal(values[0]["item_id"],values[1]["item_id"]);equal(item(x)["version"],2)
        equal(run("SELECT count(*) FROM recipe_discovery_events WHERE item_id="+lit(x)+" AND kind='keep';"),"1")
        execute("decision",{**payload,"decision":"pass"},command_id=cid,error="IDEMPOTENCY_CONFLICT")
        execute("decision",{"itemId":x,"expectedVersion":1,"decision":"pass"},error="VERSION_CONFLICT")
        execute("feedback",{"itemId":x,"expectedVersion":2,"feedback":"repeat"},error="COOKING_REQUIRED")
        execute("feedback",{"itemId":x,"expectedVersion":2,"feedback":"repeat","cooked":True},error="RECIPE_REQUIRED")
    check("concurrent/lost-response decisions apply once; stale device, payload reuse and premature feedback rejected",commands)
    imp=prepare(x)["import_id"]
    def promotion():
        equal(prepare(x)["import_id"],imp)
        equal(run("SELECT count(*) FROM social_recipe_imports WHERE id="+lit(imp)+";"),"1")
        equal(current(imp)["version"],1)
        equal(current(imp)["draft_json"]["ingredients"],[])
        save(imp,{"import_revision":1,"source_reviewed":True,"acknowledge_unknowns":True},error="RECIPE_INCOMPLETE")
    check("one durable canonical import/draft per kept link; metadata-only empty recipe never saves",promotion)
    def fidelity_and_atomic_save():
        draft=recipe_draft(imp,unknown=True);draft["source"]["sourceUrl"]="https://evil.example/fake"
        payload={"import_revision":1,"draft_json":draft,"source_reviewed":True}
        save(imp,payload,error="UNKNOWN_FIELDS_REVIEW_REQUIRED")
        # Last ingredient write fails: recipe, edited draft, status and added event all roll back.
        run("CREATE FUNCTION refuse_discovery_ingredient() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_REFUSAL'; END $$;CREATE TRIGGER refuse_discovery_ingredient BEFORE INSERT ON recipe_ingredients FOR EACH ROW EXECUTE FUNCTION refuse_discovery_ingredient();")
        save(imp,{**payload,"acknowledge_unknowns":True},error="TEST_REFUSAL")
        equal(current(imp)["version"],1)
        equal(run("SELECT count(*) FROM recipes WHERE import_id="+lit(imp)+";"),"0")
        run("DROP TRIGGER refuse_discovery_ingredient ON recipe_ingredients;DROP FUNCTION refuse_discovery_ingredient();")
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            ids=list(pool.map(lambda _:save(imp,{**payload,"acknowledge_unknowns":True}),range(2)))
        equal(ids[0],ids[1]);equal(run("SELECT count(*) FROM recipes WHERE import_id="+lit(imp)+";"),"1")
        equal(run("SELECT count(*) FROM recipe_discovery_events WHERE item_id="+lit(x)+" AND kind='added';"),"1")
        equal(current(imp)["version"],2)
        equal(current(imp)["draft_json"]["source"]["sourceUrl"],"https://example.org/recipe?id=Soup")
        equal(run("SELECT prep_time IS NULL AND servings IS NULL FROM recipes WHERE id="+lit(ids[0])+";"),"t")
        equal(run("SELECT quantity IS NULL AND unit IS NULL FROM recipe_ingredients WHERE recipe_id="+lit(ids[0])+";"),"t")
        equal(save(imp,{"import_revision":1}),ids[0]) # cold replay of stale payload
    check("human edits persist, provenance cannot change, accepted unknowns stay NULL, failure rolls back and simultaneous saves return one recipe",fidelity_and_atomic_save)
    def feedback():
        execute("feedback",{"itemId":x,"expectedVersion":item(x)["version"],"feedback":"repeat"},error="COOKING_REQUIRED")
        execute("feedback",{"itemId":x,"expectedVersion":item(x)["version"],"feedback":"repeat","cooked":True})
        equal(run("SELECT count(*) FROM recipe_discovery_events WHERE item_id="+lit(x)+" AND kind='repeat' AND cooked;"),"1")
        execute("decision",{"itemId":x,"expectedVersion":item(x)["version"],"decision":"pass"},error="ALREADY_ADDED")
    check("after-cooking declaration distinct from keep/added; an added recipe cannot be passed as a new candidate",feedback)
    def direct_canonical_save_and_edit():
        y=capture(ca,"https://example.org/direct-review")["item_id"]
        keep(y); direct_import=prepare(y)["import_id"]
        draft=recipe_draft(direct_import)
        def replace(expected,owner=A,error=None):
            expected_sql="NULL" if expected is None else str(expected)
            return run("SELECT (public.replace_social_import_draft("+lit(direct_import)+","+expected_sql+","+lit(json.dumps(draft))+"::jsonb)).version;",owner=owner,error=error)
        replace(None,error="REVISION_REQUIRED")
        replace(1,owner=B,error="NOT_FOUND")
        equal(replace(1),"2")
        replace(1,error="REVISION_CONFLICT")
        run("INSERT INTO recipes(user_id,name,instructions,import_id) VALUES("+lit(A)+",'Unreviewed','Fake',"+lit(direct_import)+");",owner=A,error="SOURCE_REVIEW_REQUIRED")
        metadata={"reviewConfirmations":{"source_reviewed":True,"unknowns_acknowledged":True,"adaptations_acknowledged":True}}
        recipe_id=run("INSERT INTO recipes(user_id,name,instructions,import_id,source_url,source_metadata) VALUES("+lit(A)+",'Client fake title','Client fake steps',"+lit(direct_import)+",'https://fake.example/',"+lit(json.dumps(metadata))+"::jsonb) RETURNING id;",owner=A)
        equal(run("SELECT name FROM recipes WHERE id="+lit(recipe_id)+";"),"Soupe personnelle")
        equal(run("SELECT status||':'||recipe_id FROM social_recipe_imports WHERE id="+lit(direct_import)+";"),"saved:"+recipe_id)
        equal(run("SELECT count(*) FROM recipe_ingredients WHERE recipe_id="+lit(recipe_id)+";"),"1")
        equal(run("SELECT quantity=200 FROM recipe_ingredients WHERE recipe_id="+lit(recipe_id)+";"),"t")
        equal(run("SELECT count(*) FROM recipe_discovery_events WHERE item_id="+lit(y)+" AND kind='added';"),"1")
        equal(save(direct_import,{"import_revision":1}),recipe_id)
        # Normal recipe editing remains possible after the import is saved.
        edited_instructions=[{"step":1,"description":"Cuire doucement, selon la correction personnelle."}]
        run("UPDATE recipes SET name='Soupe corrigée',instructions='1. Cuire doucement',prep_time=12,servings=3,image_url='https://images.example/personal.jpg',source_metadata=source_metadata||"+lit(json.dumps({"personalNotes":"Moins de sel","instructions":edited_instructions}))+"::jsonb WHERE id="+lit(recipe_id)+";",owner=A)
        equal(run("SELECT name||':'||prep_time||':'||servings FROM recipes WHERE id="+lit(recipe_id)+";"),"Soupe corrigée:12:3")
        equal(run("SELECT source_metadata->>'personalNotes' FROM recipes WHERE id="+lit(recipe_id)+";"),"Moins de sel")
        equal(json.loads(run("SELECT source_metadata->'instructions' FROM recipes WHERE id="+lit(recipe_id)+";")),edited_instructions)
        run("UPDATE recipes SET source_url='https://forged.example/' WHERE id="+lit(recipe_id)+";",owner=A,error="IMPORT_SOURCE_IMMUTABLE")
        run("UPDATE recipes SET source_metadata=source_metadata||'{\"authorName\":\"Forged\"}'::jsonb WHERE id="+lit(recipe_id)+";",owner=A,error="IMPORT_PROVENANCE_IMMUTABLE")
    check("direct Data API insert derives canonical ingredients/receipt; revision required and normal owned recipe editing survives",direct_canonical_save_and_edit)
    def parent_forges():
        execute("decision",{"itemId":x,"expectedVersion":item(x)["version"],"decision":"keep"},owner=B,error="ITEM_NOT_FOUND")
        foreign_imp=run("INSERT INTO social_recipe_imports(user_id,platform,source_url,source_hash) VALUES("+lit(B)+",'web','https://example.org/b','"+("b"*32)+"') RETURNING id;")
        run("INSERT INTO imported_recipe_drafts(user_id,import_id,draft_json) VALUES("+lit(A)+","+lit(foreign_imp)+",'{}');",owner=A,error="IMPORT_OWNER_MISMATCH")
        run("INSERT INTO recipes(user_id,name,instructions,import_id) VALUES("+lit(A)+",'Forge','Fake',"+lit(foreign_imp)+");",owner=A,error="IMPORT_OWNER_MISMATCH")
        run("UPDATE social_recipe_imports SET recipe_id='30000000-0000-4000-8000-000000000002' WHERE id="+lit(imp)+";",owner=A,error="RECIPE_OWNER_MISMATCH")
        run("UPDATE social_recipe_imports SET recipe_id='30000000-0000-4000-8000-000000000001' WHERE id="+lit(imp)+";",owner=A,error="RECIPE_OWNER_MISMATCH")
    check("Data API cannot attach a draft/recipe to a foreign import or forge a saved receipt",parent_forges)
    def selection_and_snooze():
        key=run("SELECT to_char(now() AT TIME ZONE 'Europe/Paris','IYYY-IW')||CASE WHEN extract(isodow FROM now() AT TIME ZONE 'Europe/Paris')>=4 THEN '-b' ELSE '-a' END;")
        y=capture(ca,"https://example.org/snooze")["item_id"]
        first=execute("selection",{"key":key,"itemIds":[y]})
        equal(execute("selection",{"key":key,"itemIds":[]} )["item_ids"],first["item_ids"])
        execute("selection",{"key":"2000-01-a","itemIds":[]},error="SELECTION_WINDOW_CHANGED")
        execute("decision",{"itemId":y,"expectedVersion":1,"decision":"not_today"})
        equal(item(y)["status"],"snoozed");assert item(y)["snoozed_until"]
        equal(run("SELECT count(*) FROM recipe_discovery_events WHERE item_id="+lit(y)+" AND cooked;"),"0")
    check("Paris selection window is stable; not today is a temporary event, not dislike",selection_and_snooze)
    def quota():
        remaining=25-int(run("SELECT count(*) FROM social_recipe_imports WHERE user_id="+lit(B)+" AND status NOT IN ('saved','archived');"))
        rows=",".join("("+lit(B)+",'web','https://example.org/quota"+str(i)+"',"+lit(hashlib.sha256(str(i).encode()).hexdigest()[:32])+")" for i in range(remaining))
        run("INSERT INTO social_recipe_imports(user_id,platform,source_url,source_hash) VALUES"+rows+";")
        y=capture(cb,"https://example.org/quota-new",owner=B)["item_id"]
        execute("decision",{"itemId":y,"expectedVersion":1,"decision":"keep"},owner=B)
        execute("prepare_import",{"itemId":y,"expectedVersion":2,"activeImportCap":99999},owner=B,error="QUOTA_EXCEEDED")
        equal(run("SELECT import_id IS NULL FROM recipe_discovery_items WHERE id="+lit(y)+";"),"t")
        run("DELETE FROM social_recipe_imports WHERE id=(SELECT id FROM social_recipe_imports WHERE user_id="+lit(B)+" ORDER BY created_at LIMIT 1);")
        def canonical_capture():
            try:
                run("INSERT INTO social_recipe_imports(user_id,platform,source_url,source_hash) VALUES("+lit(B)+",'web','https://example.org/concurrent-direct',"+lit('c'*32)+");",owner=B)
                return 'applied'
            except AssertionError as error:
                assert 'QUOTA_EXCEEDED' in str(error),error
                return 'quota'
        def discovery_capture():
            try: execute("prepare_import",{"itemId":y,"expectedVersion":2},owner=B);return 'applied'
            except AssertionError as error:
                assert 'QUOTA_EXCEEDED' in str(error),error
                return 'quota'
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results=[pool.submit(canonical_capture),pool.submit(discovery_capture)]
            equal(sorted(f.result() for f in results),['applied','quota'])
        equal(run("SELECT count(*) FROM social_recipe_imports WHERE user_id="+lit(B)+" AND status NOT IN ('saved','archived');"),'25')
        archived=run("UPDATE social_recipe_imports SET status='archived' WHERE id=(SELECT id FROM social_recipe_imports WHERE user_id="+lit(B)+" AND source_url LIKE '%/quota%' LIMIT 1) RETURNING id;",owner=B)
        run("INSERT INTO social_recipe_imports(user_id,platform,source_url,source_hash) VALUES("+lit(B)+",'web','https://example.org/replacement',"+lit('d'*32)+");",owner=B)
        run("UPDATE social_recipe_imports SET status='captured' WHERE id="+lit(archived)+";",owner=B,error='QUOTA_EXCEEDED')
    check("manual links consume no import quota until promotion; direct caller cannot raise free cap",quota)
    def premium():
        run("CREATE TABLE public.user_subscriptions(user_id uuid PRIMARY KEY,tier text,expires_at timestamptz);")
        run("INSERT INTO user_subscriptions VALUES("+lit(B)+",'premium',now()+interval '1 hour');")
        run("INSERT INTO social_recipe_imports(user_id,platform,source_url,source_hash) VALUES("+lit(B)+",'web','https://example.org/premium',"+lit('e'*32)+");",owner=B)
        equal(run("SELECT count(*) FROM social_recipe_imports WHERE user_id="+lit(B)+" AND status NOT IN ('saved','archived');"),'26')
        run("UPDATE user_subscriptions SET expires_at=now()-interval '1 hour';")
        run("INSERT INTO social_recipe_imports(user_id,platform,source_url,source_hash) VALUES("+lit(B)+",'web','https://example.org/premium-expired',"+lit('f'*32)+");",owner=B,error='QUOTA_EXCEEDED')
        run("UPDATE user_subscriptions SET expires_at=NULL;",owner=B,error='permission denied')
    check("premium cap exception is derived from a current DB subscription, never a user request",premium)
    def migration_replay():
        before=run("SELECT (SELECT count(*) FROM recipes)||':'||(SELECT count(*) FROM imported_recipe_drafts)||':'||(SELECT count(*) FROM recipe_discovery_events);")
        run(file=ROOT/"supabase/migrations/20261106154631_kitchen_discovery_import_review.sql")
        equal(run("SELECT (SELECT count(*) FROM recipes)||':'||(SELECT count(*) FROM imported_recipe_drafts)||':'||(SELECT count(*) FROM recipe_discovery_events);"),before)
        equal(save(imp,{"import_revision":1}),run("SELECT recipe_id FROM social_recipe_imports WHERE id="+lit(imp)+";"))
    check("F1 function migration reapplies without changing owned recipes, revisions, events or saved receipts",migration_replay)
if __name__=="__main__":
    run("CREATE DATABASE "+DB+";",db="postgres")
    try:
        run(file=ROOT/"supabase/tests/v10-schema.sql")
        run(file=ROOT/"supabase/tests/v10-discovery-schema.sql")
        run(file=ROOT/"supabase/migrations/20261106154631_kitchen_discovery_import_review.sql")
        run(file=ROOT/"supabase/migrations/20261106154633_kitchen_recipe_discovery.sql")
        main()
        print(str(checks)+" real PostgreSQL checks passed.")
    finally:
        run("DROP DATABASE "+DB+";",db="postgres")
