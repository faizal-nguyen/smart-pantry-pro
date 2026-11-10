#!/usr/bin/env python3
"""The assistant keeps its thread (20261105110000_assistant_memory_thread.sql).

Same disposable database and local socket as test-v10-stock-db.py. Applies the
memory migrations, checks that existing hidden history stays hidden, replays
every V10-03C memory scenario on the replaced functions, then checks which
changes revoke the history (forget, consent withdrawn) and which do not
(a new memory, a profile edit, retention).
"""
import importlib.util
import json
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("memory_tests", Path(__file__).with_name("test-v10-memory-db.py"))
memory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(memory)
profile, stock = memory.profile, memory.stock
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
B, ROOT = stock.B, stock.ROOT
C = "00000000-0000-4000-8000-0000000000c3"
OLD = ["20261008151704_v10_reliability_commands.sql", "20261008210917_v10_mobile_routine.sql",
       "20261009095426_v10_personalization.sql", "20261011184535_v10_assistant_memory.sql"]
NEW = "20261105110000_assistant_memory_thread.sql"
CHEF = "20261110112236_assistant_chef_memory_negations.sql"


def policy(owner=C):
    return memory.policy(owner)


def artifact(kind, payload, revision=None, owner=C):
    return memory.artifact(kind, payload, owner=owner, revision=revision)


def remember(text, owner=C, revision=None, **changes):
    command = memory.command(text, owner=owner, **changes)
    if revision is not None:
        command["expected_revision"] = revision
    return memory.execute(command, owner)


def count(table, owner=C):
    return int(run("SELECT count(*) FROM " + table + " WHERE user_id=" + literal(owner) + ";"))


def conversation(owner=C):
    """A conversation with one message, its summary and a session context."""
    conv = artifact("conversation", {"mode": "general"}, owner=owner)
    message = artifact("message", {"conversation_id": conv["id"], "role": "user", "content": "Ce soir je veux des pâtes"}, owner=owner)
    coverage = {"conversation_id": conv["id"], "covered_message_ids": [message["id"]]}
    assert artifact("summary_claim", coverage, owner=owner)["claimed"]
    assert artifact("summary", {**coverage, "summary": "Pâtes ce soir.", "model_used": "mock"}, owner=owner)["id"]
    assert artifact("session", {"conversation_id": conv["id"], "key": "craving", "value": {"text": "pâtes"},
                                "expires_at": "2999-01-01T00:00:00Z"}, owner=owner)["id"]
    return conv, message


def floor_starts_at_revision():
    p = memory.policy(B)
    equal(p["historyFloor"], p["revision"])
    assert p["revision"] > 0, p


def tests():
    run("INSERT INTO auth.users(id) VALUES(" + literal(C) + ");")
    memory.enable(C, assistantMemoryEnabled=True, saveHistory=True)

    def thread_survives_a_new_memory():
        conv, message = conversation()
        before = policy()
        saved = remember("Souviens-toi que je préfère les plats épicés")
        equal(saved["status"], "saved")
        after = policy()
        assert after["revision"] > before["revision"], (before, after)
        equal(after["historyFloor"], before["historyFloor"])
        # The reply of the same turn, written under the turn's revision, is kept.
        reply = artifact("message", {"conversation_id": conv["id"], "role": "assistant", "content": "Des penne all'arrabbiata ?"},
                         revision=before["revision"])
        assert reply and reply["policy_revision"] == before["revision"], reply
        equal(count("assistant_conversation_summaries"), 1)
        equal(count("assistant_session_context"), 1)
        # A later summary may cover messages of both revisions.
        coverage = {"conversation_id": conv["id"], "covered_message_ids": [message["id"], reply["id"]]}
        assert artifact("summary_claim", coverage)["claimed"]
        # A command read before the addition is still current.
        equal(remember("Souviens-toi que je cuisine le dimanche", revision=before["revision"])["status"], "saved")
    check("a new memory keeps messages, summary, session and the reply of its own turn", thread_survives_a_new_memory)

    def forget_revokes():
        before = policy()
        row = run("SELECT to_jsonb(m) FROM assistant_memory_items m WHERE user_id=" + literal(C) + " AND status='active' ORDER BY created_at LIMIT 1;")
        row = json.loads(row)
        memory.execute(memory.command(owner=C, operation="forget", item=row["id"], version=row["version"]), C)
        after = policy()
        equal(after["historyFloor"], after["revision"])
        equal(count("assistant_conversation_summaries"), 0)
        equal(count("assistant_session_context"), 0)
        conv = run("SELECT id FROM assistant_conversations WHERE user_id=" + literal(C) + " LIMIT 1;")
        equal(artifact("message", {"conversation_id": conv, "role": "assistant", "content": "Réponse tardive"},
                       revision=before["revision"]), None)
        memory.execute({**memory.command("Souviens-toi que j'aime le thym", owner=C), "expected_revision": before["revision"]}, C,
                       error="MEMORY_REVISION_CONFLICT")
    check("forgetting a memory hides what came before and refuses stale writes", forget_revokes)

    def profile_edit_and_withdrawal():
        version = int(run("SELECT COALESCE((SELECT version FROM nutrition_profiles WHERE user_id=" + literal(C) + "),0);"))
        written = profile.write(profile.profile_command(version, profile.settings(shareWithAssistant=True)), owner=C)
        shared = policy()
        assert shared["shareProfile"], shared
        profile.write(profile.profile_command(written["version"], profile.settings(shareWithAssistant=True, likedIngredients=["thym"])), owner=C)
        edited = policy()
        assert edited["revision"] > shared["revision"]
        equal(edited["historyFloor"], shared["historyFloor"])
        profile.write(profile.profile_command(edited["profileVersion"], profile.settings(shareWithAssistant=False)), owner=C)
        withdrawn = policy()
        equal(withdrawn["historyFloor"], withdrawn["revision"])
    check("a profile edit keeps the thread, withdrawing profile sharing revokes it", profile_edit_and_withdrawal)

    def privacy_switches():
        start = policy()
        memory.enable(C, assistantMemoryEnabled=False)
        off = policy()
        equal(off["historyFloor"], off["revision"])
        memory.enable(C, assistantMemoryEnabled=True)
        on = policy()
        assert on["revision"] > off["revision"]
        equal(on["historyFloor"], off["historyFloor"])
        memory.enable(C, dataRetention="minimal")
        equal(policy()["historyFloor"], off["historyFloor"])
        memory.enable(C, saveHistory=False)
        history_off = policy()
        equal(history_off["historyFloor"], history_off["revision"])
        memory.enable(C, saveHistory=True, dataRetention="standard")
        assert start["revision"] < policy()["revision"]
    check("switching memory or history off revokes; switching on or retention does not", privacy_switches)

    def retention_keeps_the_thread():
        conv, _ = conversation()
        old = artifact("message", {"conversation_id": conv["id"], "role": "user", "content": "Un vieux message"})
        saved = remember("Souviens-toi de mon carnet de conservation")
        before = policy()
        run("UPDATE assistant_messages SET expires_at=now()-interval '1 minute' WHERE id=" + literal(old["id"]) + ";")
        run("UPDATE assistant_memory_items SET expires_at=now()-interval '1 minute' WHERE id=" + literal(saved["memory_id"]) + ";")
        after = policy()
        assert after["revision"] > before["revision"]
        equal(after["historyFloor"], before["historyFloor"])
        equal(count("assistant_conversation_summaries"), 0)  # it may quote the expired message
        equal(run("SELECT count(*) FROM assistant_memory_items WHERE id=" + literal(saved["memory_id"]) + ";"), "0")
        equal(run("SELECT count(*) FROM assistant_memory_tombstones WHERE user_id=" + literal(C) + ";") != "0", True)
        assert artifact("message", {"conversation_id": conv["id"], "role": "user", "content": "Toujours là"}, revision=before["revision"])
        equal(run("SELECT current_setting('smart.memory_expiry',true) IS DISTINCT FROM 'on';"), "t")
    check("retention purges old data without hiding the conversation in progress", retention_keeps_the_thread)

    def grants():
        run("SELECT private.bump_memory_revision(" + literal(C) + "::uuid,false);", role="anon", error="permission denied")
        run("SELECT private.bump_memory_revision(" + literal(C) + "::uuid,false);", owner=C, error="permission denied")
        run("SELECT private.bump_memory_revision(" + literal(C) + "::uuid,false);", role="service_role", error="permission denied")
    check("the revision functions stay private", grants)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-memory-schema.sql")
        for name in OLD:
            run(file=ROOT / "supabase/migrations" / name)
        # Existing state: B has a revision before the migration.
        memory.enable(B, assistantMemoryEnabled=True, saveHistory=True)
        run(file=ROOT / "supabase/migrations" / NEW)
        run(file=ROOT / "supabase/migrations" / NEW)  # idempotent
        run(file=ROOT / "supabase/migrations" / CHEF)
        run(file=ROOT / "supabase/migrations" / CHEF)
        check("existing rows start with their history floor at their revision", floor_starts_at_revision)
        memory.tests(history_floor=True)
        tests()
        def chef_negations_and_history():
            classify=lambda text: json.loads(run("SELECT private.classify_memory("+literal(text)+",'preference',true);"))
            equal(classify("Souviens-toi que je n’aime plus les plats épicés")["payload"]["value"],"mild")
            equal(classify("Je ne suis plus végétarien")["payload"]["field"],None)
            equal(classify("Je ne suis pas vegan")["payload"]["value"],None)
            equal(classify("Je cuisine sans porc et sans alcool")["payload"]["value"],["no_pork","no_alcohol"])
            equal(classify("Mon frère est vegan")["destination"],"session")
            owner="00000000-0000-4000-8000-0000000000d4"
            run("INSERT INTO auth.users(id) VALUES("+literal(owner)+");")
            memory.enable(owner,assistantMemoryEnabled=True,saveHistory=True)
            special=None
            for i in range(22):
                conv=artifact("conversation",{"title":"Histoire "+str(i)},owner=owner)
                message=artifact("message",{"conversation_id":conv["id"],"role":"user","content":"Une soupe épicée" if i==0 else "Autre échange"},owner=owner)
                if i==0: special=message
            call=lambda actor,revision: "SELECT search_assistant_model_history("+literal(actor)+","+str(revision)+",'epicee',20);"
            found=json.loads(run(call(owner,policy(owner)["revision"]),role="service_role"))
            equal([r["record"]["id"] for r in found],[special["id"]])
            equal(json.loads(run(call(owner,policy(owner)["revision"]-1),role="service_role")),[])
            equal(json.loads(run(call(B,policy(B)["revision"]),role="service_role")),[])
            run(call(owner,policy(owner)["revision"]),owner=B,error="permission denied")
            run(call(owner,policy(owner)["revision"]),role="anon",error="permission denied")
            run("UPDATE assistant_messages SET expires_at='2000-01-01' WHERE id="+literal(special["id"])+";")
            equal(json.loads(run(call(owner,policy(owner)["revision"]),role="service_role")),[])
        check("negations, compound diets and accent-normalized authorized history beyond 20 conversations",chef_negations_and_history)
        print(f"{stock.checks} groups passed with the assistant memory thread on real local PostgreSQL.")
    finally:
        run("DROP DATABASE " + stock.DATABASE + " WITH (FORCE);", database="postgres")
