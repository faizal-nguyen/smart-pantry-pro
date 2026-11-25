#!/usr/bin/env python3
"""Receipts and purchase prices on real local PostgreSQL (20261127090000_v11_receipt_scans.sql).

Same disposable database as test-update-menu-db.py: replays every earlier stock, menu, shopping,
link and menu edit scenario on the replaced command function, then checks V11-01 E5a: scans
written by the service role and read by their owner only, reconcile_receipt (whole, partial with the
remainder left to buy, more, converted, several lines on one row, purchases absent from the list,
prices), refusals that write nothing, one application per scan, undo, the storage that follows,
the last prices, export, deletion and the purge of scans never applied.
"""
import datetime
import importlib.util
import json
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("menu_edit_tests", Path(__file__).with_name("test-update-menu-db.py"))
edit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(edit)
links, week, shop, stock = edit.links, edit.week, edit.shop, edit.stock
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
MIGRATIONS = edit.MIGRATIONS + ["20261127090000_v11_receipt_scans.sql"]


def scan(count: int = 4, owner: str = A, store: str | None = "Marché E5", purchased_on: str | None = "2026-11-20",
         total: float | None = 12.5, currency: str | None = "EUR", failure: str | None = None, age_days: int = 0) -> str:
    """A scan as the API writes it (service role); returns its id."""
    read = [{"raw_text": "LIGNE " + str(index), "name": "ligne " + str(index), "quantity": None, "unit": None, "package": None,
             "unit_price": None, "total_price": None, "food": True, "confidence": "high"} for index in range(0 if failure else count)]
    value = lambda item: "NULL" if item is None else literal(item)
    return run("INSERT INTO receipt_scans(user_id,state,store,purchased_on,total,currency,lines,failure,model_receipt,read_at) VALUES("
               + literal(owner) + "," + literal("failed" if failure else "read") + "," + value(store) + "," + value(purchased_on) + ","
               + ("NULL" if total is None else str(total)) + "," + value(currency) + "," + literal(json.dumps(read)) + "::jsonb,"
               + value(failure) + ",'{\"invocation_id\":\"x\",\"calls\":[]}'::jsonb,now()-interval '" + str(age_days) + " days') RETURNING id;",
               role="service_role")


def line(index: int, name: str, quantity: float, unit: str, target: str | None = None, unit_price=None, total_price=None,
         version: int | None = None) -> dict:
    return {"line_index": index, "name": name, "quantity": quantity, "unit": unit, "unit_price": unit_price, "total_price": total_price,
            "target": None if target is None else {"shopping_id": target, "expected_version": shop.version(target) if version is None else version}}


def reconcile(receipt: str, *lines: dict, owner: str = A, identity: str | None = None, error: str | None = None):
    return stock.execute(stock.command("reconcile_receipt", {"receipt_scan_id": receipt, "lines": list(lines)}, identity), owner=owner, error=error)


def state(receipt: str) -> str:
    return run("SELECT state||':'||coalesce(applied_command_id::text,'') FROM receipt_scans WHERE id=" + literal(receipt) + ";")


def prices(command: str) -> list:
    return json.loads(run("SELECT coalesce(jsonb_agg(jsonb_build_object('product',p.name,'quantity',trim_scale(q.quantity),'unit',q.unit,"
                          "'unit_price',q.unit_price,'total_price',q.total_price,'currency',q.currency,'on',q.purchased_on,'store',q.store) ORDER BY q.total_price),'[]')"
                          " FROM purchase_prices q JOIN products p ON p.id=q.product_id WHERE q.command_id=" + literal(command) + ";"))


def tests() -> None:
    def scans_are_owned_and_closed():
        receipt = scan()
        equal(run("SELECT count(*) FROM receipt_scans WHERE id=" + literal(receipt) + ";", owner=A), "1")
        equal(run("SELECT count(*) FROM receipt_scans WHERE id=" + literal(receipt) + ";", owner=B), "0")
        run("SELECT * FROM receipt_scans;", role="anon", error="permission denied")
        run("INSERT INTO receipt_scans(user_id,state,lines) VALUES(" + literal(A) + ",'read','[{}]');", owner=A, error="permission denied")
        run("UPDATE receipt_scans SET state='applied';", owner=A, error="permission denied")
        run("DELETE FROM receipt_scans;", owner=A, error="permission denied")
        run("INSERT INTO purchase_prices(user_id,command_id,receipt_scan_id,product_id,total_price) VALUES(" + literal(A) + ","
            + literal(str(uuid.uuid4())) + "," + literal(receipt) + "," + literal(shop.product("Pain E5")) + ",1);", owner=A, error="permission denied")
        run("SELECT private.reconcile_receipt(" + literal(A) + "," + literal(str(uuid.uuid4())) + ",'{}'::jsonb);", owner=A, error="permission denied")
        run("SELECT private.purge_receipt_scans();", owner=A, error="permission denied")
        # A read scan has lines, a failed one has none and says why.
        run("INSERT INTO receipt_scans(user_id,state,lines) VALUES(" + literal(A) + ",'read','[]');", role="service_role", error="receipt_scans_state")
        run("INSERT INTO receipt_scans(user_id,state,lines) VALUES(" + literal(A) + ",'failed','[]');", role="service_role", error="receipt_scans_state")
        equal(state(scan(failure="RECEIPT_UNREADABLE")), "failed:")
        equal(run("SELECT line_count FROM receipt_scans WHERE id=" + literal(receipt) + ";"), "4")
        # The service role writes scans, never prices; it neither rewrites nor deletes a scan.
        run("UPDATE receipt_scans SET state='applied';", role="service_role", error="permission denied")
        run("DELETE FROM receipt_scans;", role="service_role", error="permission denied")
        run("DELETE FROM purchase_prices;", role="service_role", error="permission denied")
        run("INSERT INTO receipt_scans(user_id,state,lines,line_count) VALUES(" + literal(A) + ",'read','[{}]',9);", role="service_role", error="line_count")
    check("scans are written by the service role and read by their owner only", scans_are_owned_and_closed)

    flour = shop.seed("Farine E5", 1, "kg")
    sugar = shop.seed("Sucre E5", 500, "g")
    eggs = shop.seed("Œufs E5", 6, "unité(s)")
    applied: dict = {}

    def whole_partial_more_and_new():
        receipt = scan(5)
        result = reconcile(receipt,
                           line(0, "Farine de blé", 1000, "g", flour, total_price=1.2),
                           line(1, "Sucre en poudre", 250, "g", sugar),
                           line(2, "Œufs", 12, "unité(s)", eggs, unit_price=0.3, total_price=3.6),
                           line(4, "Chocolat noir E5", 2, "unité(s)", unit_price=1.99, total_price=3.98))
        equal(shop.lines("Farine E5"), "1 kg acheté")
        equal(shop.lines("Sucre E5"), "250 g acheté, 250 g")
        equal(shop.lines("Œufs E5"), "12 unité(s) acheté")
        equal(shop.lines("Chocolat noir E5"), "2 unité(s) acheté")
        equal(state(receipt), "applied:" + result["command_id"])
        outcomes = sorted((change["outcome"], change.get("note") or "") for change in result["shopping_changes"])
        equal(outcomes, [("checked", ""), ("checked", ""), ("checked", "receipt_partial"), ("created", "receipt_added"), ("created", "receipt_remainder")])
        equal(result["receipt_scan_id"], receipt)
        assert set(result["affected_tables"]) >= {"shopping_list", "purchase_prices", "receipt_scans"}
        equal(prices(result["command_id"]), [
            {"product": "Farine E5", "quantity": 1000, "unit": "g", "unit_price": None, "total_price": 1.2, "currency": "EUR", "on": "2026-11-20", "store": "Marché E5"},
            {"product": "Œufs E5", "quantity": 12, "unit": "unité(s)", "unit_price": 0.3, "total_price": 3.6, "currency": "EUR", "on": "2026-11-20", "store": "Marché E5"},
            {"product": "Chocolat noir E5", "quantity": 2, "unit": "unité(s)", "unit_price": 1.99, "total_price": 3.98, "currency": "EUR", "on": "2026-11-20", "store": "Marché E5"}])
        equal(run("SELECT count(*) FROM shopping_movements WHERE command_id=" + literal(result["command_id"]) + ";"), "5")
        applied.update(result=result, receipt=receipt)
    check("a receipt checks whole, partial and larger purchases, adds the others, and records their prices", whole_partial_more_and_new)

    def applied_once():
        result, receipt = applied["result"], applied["receipt"]
        operation = stock.command("reconcile_receipt", {"receipt_scan_id": receipt, "lines": [line(3, "Pain", 1, "unité(s)")]})
        stock.execute(operation, error="RECEIPT_ALREADY_APPLIED")
        payload = json.loads(run("SELECT payload FROM stock_commands WHERE command_id=" + literal(result["command_id"]) + ";"))
        equal(stock.execute(stock.command("reconcile_receipt", payload, result["command_id"])), result)
    check("a scan is applied once, even under another identity; the same identity returns its receipt", applied_once)

    def undo_gives_the_scan_back():
        result, receipt = applied["result"], applied["receipt"]
        stock.execute(stock.command("undo_stock", {"original_command_id": result["command_id"]}))
        equal(shop.lines("Farine E5"), "1 kg")
        equal(shop.lines("Sucre E5"), "500 g")
        equal(shop.lines("Œufs E5"), "6 unité(s)")
        equal(shop.lines("Chocolat noir E5"), "")
        equal(prices(result["command_id"]), [])
        equal(state(receipt), "read:")
        again = reconcile(receipt, line(1, "Sucre", 500, "g", sugar))
        equal(shop.lines("Sucre E5"), "500 g acheté")
        # A row changed since: nothing is undone.
        shop.execute("shopping_check", [shop.at(sugar, purchased=False)])
        stock.execute(stock.command("undo_stock", {"original_command_id": again["command_id"]}), error="UNDO_CONFLICT")
        equal(state(receipt), "applied:" + again["command_id"])
    check("undo restores the list, removes the prices and gives the scan back to apply again", undo_gives_the_scan_back)

    def several_lines_on_one_row():
        milk = shop.seed("Lait E5", 3, "unité(s)")
        receipt = scan(3)
        reconcile(receipt, line(0, "Lait demi-écrémé", 1, "unité(s)", milk), line(2, "Lait demi-écrémé", 1, "unité(s)", milk))
        equal(shop.lines("Lait E5"), "2 unité(s) acheté, 1 unité(s)")
    check("several receipt lines on one row add up, the remainder left to buy", several_lines_on_one_row)

    def a_row_checked_by_hand():
        honey = shop.seed("Miel E5", 5, "unité(s)", purchased=True)
        result = reconcile(scan(1), line(0, "Miel", 2, "unité(s)", honey))
        equal(shop.lines("Miel E5"), "2 unité(s) acheté")
        equal([change["outcome"] for change in result["shopping_changes"]], ["updated"])
    check("a row checked by hand takes the receipt's quantity, no remainder to buy", a_row_checked_by_hand)

    def refusals_write_nothing():
        butter = shop.seed("Beurre E5", 250, "g")
        rice = shop.seed("Riz E5", 1, "kg")
        receipt = scan(3)
        reconcile(receipt, line(0, "Beurre", 1, "paquet", butter), error="UNIT_INCOMPATIBLE")
        reconcile(receipt, line(0, "Riz", 1, "kg", rice, version=shop.version(rice) + 1), line(1, "Thé E5", 1, "unité(s)"), error="CONFLICT")
        reconcile(receipt, line(3, "Riz", 1, "kg", rice), error="INVALID_COMMAND")
        reconcile(receipt, line(0, "Riz", 1, "kg", rice), line(0, "Riz", 1, "kg", rice), error="DUPLICATE_ITEM")
        reconcile(receipt, {**line(0, "Riz", 1, "kg", rice), "user_id": B}, error="INVALID_COMMAND")
        reconcile(receipt, line(0, "Riz", 0, "kg", rice), error="INVALID_QUANTITY")
        reconcile(receipt, line(0, "Riz", 1, "kg", rice, total_price=-1), error="INVALID_COMMAND")
        reconcile(scan(failure="RECEIPT_NO_FOOD"), line(0, "Riz", 1, "kg", rice), error="RECEIPT_NOT_FOUND")
        # Another account: neither the scan nor the rows of A can be named, even by a direct call.
        reconcile(receipt, line(0, "Riz", 1, "kg"), owner=B, error="RECEIPT_NOT_FOUND")
        reconcile(scan(2, owner=B), line(0, "Riz", 1, "kg", rice), owner=B, error="ITEM_NOT_FOUND")
        equal(shop.lines("Beurre E5"), "250 g")
        equal(shop.lines("Riz E5"), "1 kg")
        equal(shop.lines("Thé E5"), "")
        equal(state(receipt), "read:")
    check("a refused receipt writes nothing, and another account names nothing of A", refusals_write_nothing)

    def storage_follows():
        oil = shop.seed("Huile E5", 1, "l")
        receipt = scan(1)
        reconcile(receipt, line(0, "Huile d'olive", 50, "cl", oil, total_price=6.5))
        bought = run("SELECT s.id FROM shopping_list s JOIN products p ON p.id=s.product_id WHERE p.name='Huile E5' AND s.is_purchased;")
        stock.execute(stock.command("transfer_shopping", {"items": [{"id": bought, "expected_version": shop.version(bought)}]}))
        equal(run("SELECT trim_scale(i.quantity)||' '||i.unit FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.name='Huile E5';"), "0.5 l")
        equal(shop.lines("Huile E5"), "0.5 l")
    check("the storage that follows takes the receipt's quantity and leaves the remainder", storage_follows)

    def last_prices():
        coffee = shop.seed("Café E5", 1, "unité(s)")
        old = reconcile(scan(1, purchased_on="2026-10-01"), line(0, "Café", 1, "unité(s)", coffee, unit_price=4.2))
        stock.execute(stock.command("transfer_shopping", {"items": [{"id": coffee, "expected_version": shop.version(coffee)}]}))
        reconcile(scan(1, purchased_on="2026-11-15", store="Épicerie E5"), line(0, "Café E5", 2, "unité(s)", total_price=9))
        latest = json.loads(run("SELECT jsonb_build_object('unit_price',unit_price,'on',purchased_on,'store',store,'unit',unit)"
                                " FROM latest_purchase_prices l JOIN products p ON p.id=l.product_id WHERE p.name='Café E5';", owner=A))
        equal(latest, {"unit_price": 4.5, "on": "2026-11-15", "store": "Épicerie E5", "unit": "unité(s)"})
        equal(run("SELECT count(*) FROM latest_purchase_prices;", owner=B), "0")
        equal(run("SELECT count(*) FROM purchase_prices WHERE command_id=" + literal(old["command_id"]) + ";", owner=B), "0")
        run("SELECT * FROM latest_purchase_prices;", role="anon", error="permission denied")
    check("the last price of a product is read by its owner, computed from a line total", last_prices)

    def exported_erased_and_purged():
        exported = json.loads(run("SELECT export_user_data(" + literal(A) + ");", owner=A))
        assert exported["receipt_scans"] and exported["purchase_prices"]
        assert all(row["user_id"] == A for row in exported["receipt_scans"] + exported["purchase_prices"])
        for table in ("receipt_scans", "purchase_prices"):
            equal(run("SELECT count(*) FROM pg_attribute WHERE attrelid='public." + table + "'::regclass AND attname='user_id' AND NOT attisdropped;"), "1")
        equal(run("SELECT confdeltype FROM pg_constraint WHERE conrelid='public.receipt_scans'::regclass AND confrelid='auth.users'::regclass;"), "c")
        # Read and failed scans are kept 7 days, applied ones stay.
        stale, failed, fresh = scan(age_days=8), scan(failure="RECEIPT_TOO_LONG", age_days=8), scan(age_days=6)
        kept = applied["receipt"]
        run("UPDATE receipt_scans SET created_at=now()-interval '30 days',read_at=now()-interval '30 days' WHERE id=" + literal(kept) + ";")
        # A scan read 8 days ago, applied then undone today, waits again from today.
        undone = scan(1, age_days=8)
        rice = shop.seed("Riz long E5", 1, "kg")
        stock.execute(stock.command("undo_stock", {"original_command_id": reconcile(undone, line(0, "Riz", 1, "kg", rice))["command_id"]}))
        purged = int(run("SELECT private.purge_receipt_scans();"))
        assert purged >= 2, purged
        equal(run("SELECT string_agg(id::text,',' ORDER BY id) FROM receipt_scans WHERE id IN (" + ",".join(literal(x) for x in (stale, failed, fresh, kept, undone)) + ");"),
              ",".join(sorted([fresh, kept, undone])))
    check("scans and prices are exported and erased with the account; scans never applied are purged after 7 days", exported_erased_and_purged)


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
        stock.routine_tests(capability=7)
        week.profile.tests()
        week.pantry.tests()
        week.units.tests()
        week.menu.tests()
        run(shop.UNIQUE_CATALOGUE)
        shop.tests()
        week.tests()
        links.tests()
        edit.tests()
        # The duplicate-plans scenario replays 20261126090000, which puts back its command body.
        run(file=ROOT / "supabase/migrations" / MIGRATIONS[-1])
        tests()
        print(f"{stock.checks} groups passed with receipts and purchase prices on real local PostgreSQL.")
    finally:
        run("DROP DATABASE " + stock.DATABASE + " WITH (FORCE);", database="postgres")
