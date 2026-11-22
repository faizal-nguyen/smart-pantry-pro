#!/usr/bin/env python3
"""assistant_action_log on real local PostgreSQL: the `executing` state of a
confirmation (V11-04 E2, advanced fix).

Same disposable database and local socket as test-v10-stock-db.py. Applies the
real migrations of the table, then the one that adds `executing`, twice.
"""
import importlib.util
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("stock_tests", Path(__file__).with_name("test-v10-stock-db.py"))
stock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stock)
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, ROOT = stock.A, stock.ROOT
TABLE_MIGRATIONS = ["20260508120001_create_assistant_action_log.sql", "20260508130000_fix_assistant_action_log_unique.sql",
                    "20260508140000_fix_action_log_risk_tier_read.sql"]
EXECUTING = ROOT / "supabase/migrations/20261122150000_assistant_action_log_executing.sql"
SCHEMA = """CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
INSERT INTO auth.users VALUES (""" + literal(A) + ");"


def insert(status):
    row = str(uuid.uuid4())
    run("INSERT INTO assistant_action_log(id,user_id,client_request_id,session_id,step_seq,tool,tool_args,risk_tier,status)"
        " VALUES(" + literal(row) + "," + literal(A) + ",gen_random_uuid(),gen_random_uuid(),0,'consume_inventory_items','{}','medium',"
        + literal(status) + ");")
    return row


def tests():
    def accepts_executing():
        row = insert("planned")
        before = run("SELECT updated_at FROM assistant_action_log WHERE id=" + literal(row) + ";")
        run("SELECT pg_sleep(0.01);UPDATE assistant_action_log SET status='executing' WHERE id=" + literal(row) + " AND status='planned';")
        equal(run("SELECT status FROM assistant_action_log WHERE id=" + literal(row) + ";"), "executing")
        # The stale delay of a confirmation is measured from the claim: the trigger must move updated_at.
        assert run("SELECT updated_at>" + literal(before) + "::timestamptz FROM assistant_action_log WHERE id=" + literal(row) + ";") == "t"
        for status in ["executed", "failed", "undone", "cancelled"]:
            insert(status)
    check("executing is accepted next to every former status, and the claim moves updated_at", accepts_executing)

    def rejects_unknown():
        run("INSERT INTO assistant_action_log(user_id,client_request_id,session_id,step_seq,tool,tool_args,risk_tier,status)"
            " VALUES(" + literal(A) + ",gen_random_uuid(),gen_random_uuid(),0,'x','{}','low','running');",
            error="assistant_action_log_status_check")
    check("a status outside the list is still refused", rejects_unknown)

    def guarded_settle():
        row = insert("executing")
        run("UPDATE assistant_action_log SET status='executed',result='{\"consumed\":1}' WHERE id=" + literal(row) + ";")
        settled = run("UPDATE assistant_action_log SET status='failed',error_code='EXECUTION_UNVERIFIED' WHERE id=" + literal(row)
                      + " AND status='executing' RETURNING id;")
        equal(settled, "")
        equal(run("SELECT status||'/'||result::text FROM assistant_action_log WHERE id=" + literal(row) + ";"), 'executed/{"consumed": 1}')
    check("settling a row only while executing never overwrites the first run's result", guarded_settle)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(SCHEMA)
        for name in TABLE_MIGRATIONS:
            run(file=ROOT / "supabase/migrations" / name)
        legacy = insert("executed")
        run(file=EXECUTING)
        run(file=EXECUTING)  # replayable
        equal(run("SELECT status FROM assistant_action_log WHERE id=" + literal(legacy) + ";"), "executed")
        tests()
        print(f"{stock.checks} groups passed on real local PostgreSQL (assistant action log).")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
