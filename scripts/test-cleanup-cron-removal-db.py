#!/usr/bin/env python3
"""Removal of the nightly cleanup-shopping-list job on real local PostgreSQL.

The migration must remove only that job, be idempotent, and apply on a database
without pg_cron. pg_cron is stubbed: unschedule raises when the job is missing,
as the real extension does. Same disposable database and local socket as
test-v10-stock-db.py.
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("stock_tests", Path(__file__).with_name("test-v10-stock-db.py"))
stock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stock)
run, check, equal, ROOT = stock.run, stock.check, stock.assert_equal, stock.ROOT

MIGRATION = ROOT / "supabase/migrations/20261122204021_remove_cleanup_shopping_list_cron.sql"
JOB = "cleanup-shopping-list-daily"
OTHER_JOB = "process-deletion-requests-hourly"
CRON_STUB = """CREATE SCHEMA cron;
CREATE TABLE cron.job(jobid bigserial PRIMARY KEY,jobname text UNIQUE,schedule text NOT NULL,command text NOT NULL);
CREATE FUNCTION cron.unschedule(job_name text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM cron.job WHERE jobname = job_name;
  IF NOT FOUND THEN RAISE EXCEPTION 'could not find valid entry for job ''%''', job_name; END IF;
  RETURN true;
END $$;"""


def jobs():
    return run("SELECT coalesce(string_agg(jobname, ',' ORDER BY jobname), '') FROM cron.job;")


def tests():
    check("applies on a database without pg_cron", lambda: run(file=MIGRATION))

    def removes_only_the_cleanup_job():
        run(CRON_STUB)
        run("INSERT INTO cron.job(jobname,schedule,command) VALUES"
            "('" + JOB + "','0 2 * * *','SELECT 1'),('" + OTHER_JOB + "','0 * * * *','SELECT 2');")
        run(file=MIGRATION)
        equal(jobs(), OTHER_JOB)
    check("removes the cleanup job and keeps the other jobs", removes_only_the_cleanup_job)

    def idempotent():
        run(file=MIGRATION)
        equal(jobs(), OTHER_JOB)
    check("second application is a no-op when the job is already gone", idempotent)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        tests()
        print(f"{stock.checks} groups passed on real local PostgreSQL (cleanup job removal).")
    finally:
        run("DROP DATABASE " + stock.DATABASE + ";", database="postgres")
