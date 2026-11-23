#!/usr/bin/env python3
"""Shopping list commands on real local PostgreSQL (20261123120000_v11_shopping_commands.sql).

Same disposable database and local socket as test-v10-stock-db.py. The schema mirrors the
deployed shopping_list columns and the products.normalized_name unique index (see
docs/implementations/V11-05-E1.md), replays every earlier stock, personalization, pantry,
unit and menu scenario on the replaced command function, then checks the four shopping
commands, the aggregation primitive (D16: oldest unchecked convertible row) and undo.
"""
import concurrent.futures
import importlib.util
import json
from pathlib import Path
import uuid

spec = importlib.util.spec_from_file_location("menu_tests", Path(__file__).with_name("test-menu-shopping-db.py"))
menu = importlib.util.module_from_spec(spec)
spec.loader.exec_module(menu)
units, stock, profile, pantry = menu.units, menu.stock, menu.profile, menu.pantry
run, literal, check, equal = stock.run, stock.literal, stock.check, stock.assert_equal
A, B, ROOT = stock.A, stock.B, stock.ROOT
MIGRATIONS = menu.MIGRATIONS + ["20261123120000_v11_shopping_commands.sql"]

# Deployed columns and catalogue trigger absent from the reconstructed test schema. The trigger
# calls unaccent() unqualified, as in production, so every product a command creates meets it.
PRODUCTION_MIRROR = """
ALTER TABLE public.shopping_list ADD COLUMN IF NOT EXISTS priority integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS estimated_price numeric, ADD COLUMN IF NOT EXISTS store_section text;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS normalized_name text;
CREATE OR REPLACE FUNCTION public.products_normalize_name_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.normalized_name := lower(unaccent(trim(NEW.name))); RETURN NEW; END $$;
CREATE TRIGGER trg_products_normalize_name BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_normalize_name_trigger();
UPDATE public.products SET name=name;
"""

# The production unique index on normalized_name. Earlier suites insert several products of one
# name as fixtures; they are renamed once those suites are done, then the index is created.
UNIQUE_CATALOGUE = """
UPDATE public.products p SET name=p.name||' ('||left(p.id::text,8)||')'
WHERE EXISTS (SELECT 1 FROM public.products q WHERE q.normalized_name=p.normalized_name AND q.id<p.id);
CREATE UNIQUE INDEX idx_products_normalized_name_unique ON public.products(normalized_name);
"""


def product(name, unit="unité(s)"):
    run("INSERT INTO products(name,category,unit_type) VALUES(" + literal(name) + ",'Épicerie'," + literal(unit) + ") ON CONFLICT DO NOTHING;")
    return run("SELECT id FROM products WHERE normalized_name=lower(unaccent(trim(" + literal(name) + ")));")


def seed(name, quantity, unit, purchased=False, created="2026-11-01", section=None, owner=A):
    """A shopping row written directly, as an old client would; returns its id."""
    identity = str(uuid.uuid4())
    run("INSERT INTO shopping_list(id,user_id,product_id,quantity,unit,is_purchased,created_at,store_section) VALUES("
        + literal(identity) + "," + literal(owner) + "," + literal(product(name, unit)) + "," + str(quantity) + ","
        + literal(unit) + "," + str(purchased).lower() + "," + literal(created) + "::timestamptz,"
        + ("NULL" if section is None else literal(section)) + ");")
    return identity


def version(identity):
    return int(run("SELECT stock_version FROM shopping_list WHERE id=" + literal(identity) + ";"))


def row(identity):
    output = run("SELECT jsonb_build_object('quantity',trim_scale(quantity),'unit',unit,'purchased',is_purchased,"
                 "'section',store_section,'price',estimated_price,'product',product_id) FROM shopping_list WHERE id=" + literal(identity) + ";")
    return json.loads(output) if output else None


def lines(name, owner=A):
    return run("SELECT coalesce(string_agg(trim_scale(s.quantity)::text||' '||s.unit||CASE WHEN s.is_purchased THEN ' acheté' ELSE '' END,"
               "', ' ORDER BY s.created_at,s.id),'') FROM shopping_list s JOIN products p ON p.id=s.product_id"
               " WHERE s.user_id=" + literal(owner) + " AND p.name=" + literal(name) + ";")


def shopping(kind, items, identity=None):
    return stock.command(kind, {"items": items}, identity)


def item(name=None, quantity=1, unit="unité(s)", origin="manual", **extra):
    value = {"quantity": quantity, "unit": unit, "origin": origin}
    if "product_id" not in extra:
        value["name"] = name
    value.update(extra)
    return value


def add(*items, owner=A, error=None, identity=None):
    return stock.execute(shopping("shopping_add", list(items), identity), owner=owner, error=error)


def at(identity, **fields):
    return {"id": identity, "expected_version": version(identity), **fields}


def execute(kind, items, owner=A, error=None):
    return stock.execute(shopping(kind, items), owner=owner, error=error)


def undo(result, owner=A, error=None):
    return stock.execute(stock.command("undo_stock", {"original_command_id": result["command_id"]}), owner=owner, error=error)


def tests():
    def ownership_and_capability():
        yogurt = seed("Yaourt nature", 2, "unité(s)")
        operation = shopping("shopping_check", [at(yogurt, purchased=True)])
        run("SELECT public.execute_stock_command(" + literal(json.dumps(operation)) + "::jsonb,'[]'::jsonb);", role="anon", error="permission denied")
        execute("shopping_check", [at(yogurt, purchased=True)], owner=B, error="ITEM_NOT_FOUND")
        execute("shopping_update", [at(yogurt, quantity=9)], owner=B, error="ITEM_NOT_FOUND")
        execute("shopping_remove", [at(yogurt)], owner=B, error="ITEM_NOT_FOUND")
        add(item("Yaourt nature", user_id=B), error="INVALID_COMMAND")
        add(item("Yaourt nature", origin="robot"), error="INVALID_COMMAND")
        equal(row(yogurt)["quantity"], 2)
        # The private helpers are reachable only through the command.
        run("SELECT private.shopping_resolve_product('x',NULL,'g');", owner=A, error="permission denied")
        run("INSERT INTO shopping_movements(user_id,command_id,shopping_id,kind,version_after) VALUES("
            + literal(A) + "," + literal(str(uuid.uuid4())) + "," + literal(yogurt) + ",'created',0);", owner=A, error="permission denied")
        added = add(item("Yaourt nature", 1))
        equal(run("SELECT count(*) FROM shopping_movements WHERE command_id=" + literal(added["command_id"]) + ";", owner=A), "1")
        equal(run("SELECT count(*) FROM shopping_movements WHERE command_id=" + literal(added["command_id"]) + ";", owner=B), "0")
    check("shopping commands are owned, closed to anon, and their journal is read-only", ownership_and_capability)

    def tops_up_the_oldest_row():
        older = seed("Pommes Gala", 2, "unité(s)", created="2026-11-01", section="Fruits")
        newer = seed("Pommes Gala", 1, "pièce", created="2026-11-02")
        result = add(item("Pommes Gala", 3, "unité", store_section="Primeur"))
        equal(lines("Pommes Gala"), "5 unité(s), 1 pièce")
        equal(row(older)["section"], "Fruits")
        change = result["shopping_changes"][0]
        equal([change["id"], change["outcome"], change["added_quantity"], change["quantity"], change["name"]],
              [older, "merged", 3, 5, "Pommes Gala"])
        equal(result["shopping_ids"], [older])
        equal(row(newer)["quantity"], 1)
        # A row without section takes the one given.
        bare = seed("Poires", 1, "kg")
        add(item("Poires", 500, "g", store_section="Primeur"))
        equal([row(bare)["quantity"], row(bare)["section"]], [1.5, "Primeur"])
    check("an add tops up the oldest unchecked row in a convertible unit (D16)", tops_up_the_oldest_row)

    def never_a_bought_row_nor_another_unit():
        bought = seed("Moutarde", 1, "pot", purchased=True)
        result = add(item("Moutarde", 1, "pot"))
        equal(lines("Moutarde"), "1 pot acheté, 1 pot")
        equal([result["shopping_changes"][0]["outcome"], result["shopping_changes"][0]["note"]], ["created", "purchased_pending"])
        equal(row(bought)["purchased"], True)
        seed("Riz basmati", 1, "kg")
        separate = add(item("Riz basmati", 2, "paquet"))
        equal(separate["shopping_changes"][0]["note"], "unit_incompatible")
        add(item("Riz basmati", 500, "g"))
        equal(lines("Riz basmati"), "1.5 kg, 2 paquet")
    check("an add never tops up a bought row, nor a row in a unit that does not convert", never_a_bought_row_nor_another_unit)

    def explicit_target():
        first = seed("Farine T65", 1, "kg", created="2026-11-01")
        second = seed("Farine T65", 1, "kg", created="2026-11-02")
        add(item("Farine T65", 1, "kg", target={"id": second, "expected_version": version(second)}))
        equal([row(first)["quantity"], row(second)["quantity"]], [1, 2])
        stale = {"id": first, "expected_version": version(first) + 1}
        add(item("Farine T65", 1, "kg", target=stale), error="CONFLICT")
        equal([row(first)["quantity"], row(second)["quantity"]], [1, 2])
        run("UPDATE shopping_list SET is_purchased=true WHERE id=" + literal(first) + ";")
        add(item("Farine T65", 1, "kg", target={"id": first, "expected_version": version(first)}), error="CONFLICT")
    check("an explicit target is topped up at its version, refused when stale or bought", explicit_target)

    def replay_and_identity():
        identity = str(uuid.uuid4())
        first = add(item("Citrons verts", 2), identity=identity)
        equal(add(item("Citrons verts", 2), identity=identity), first)
        equal(lines("Citrons verts"), "2 unité(s)")
        add(item("Citrons verts", 3), identity=identity, error="IDEMPOTENCY_CONFLICT")
        equal(lines("Citrons verts"), "2 unité(s)")
    check("a replayed add has a single effect; the same identity with another payload is refused", replay_and_identity)

    def resolves_the_catalogue():
        beef = product("Boeuf haché", "g")
        result = add(item("Bœuf haché", 500, "g"))
        equal(row(result["shopping_ids"][0])["product"], beef)
        equal(run("SELECT count(*) FROM products WHERE normalized_name='boeuf hache';"), "1")
        oat = add(item("  Lait d'avoine ", 1, "l", category="Boissons"))
        equal(run("SELECT name||'|'||category FROM products WHERE id=" + literal(row(oat["shopping_ids"][0])["product"]) + ";"), "Lait d'avoine|Boissons")
        add({"product_id": str(uuid.uuid4()), "quantity": 1, "unit": "l", "origin": "manual"}, error="ITEM_NOT_FOUND")
        add(item("Lait d'avoine", 0, "l"), error="INVALID_QUANTITY")
        add(item("Lait d'avoine", 1, " "), error="UNIT_UNKNOWN")
    check("an add by name finds the catalogue product, including one only unaccent matches", resolves_the_catalogue)

    def check_update_remove():
        milk = seed("Lait demi-écrémé", 1, "l")
        execute("shopping_check", [{"id": milk, "expected_version": version(milk) + 1, "purchased": True}], error="CONFLICT")
        checked = execute("shopping_check", [at(milk, purchased=True)])
        equal([row(milk)["purchased"], checked["shopping_changes"][0]["outcome"]], [True, "checked"])
        execute("shopping_update", [at(milk, quantity=2, unit="l", store_section="Crèmerie", estimated_price=1.85)])
        equal([row(milk)[k] for k in ("quantity", "section", "price")], [2, "Crèmerie", 1.85])
        execute("shopping_update", [at(milk, estimated_price=None, store_section=None)])
        equal([row(milk)["price"], row(milk)["section"]], [None, None])
        renamed = execute("shopping_update", [at(milk, name="Lait entier bio")])
        equal(run("SELECT name FROM products WHERE id=" + literal(row(milk)["product"]) + ";"), "Lait entier bio")
        equal(renamed["shopping_changes"][0]["outcome"], "updated")
        execute("shopping_update", [at(milk)], error="INVALID_COMMAND")
        execute("shopping_update", [at(milk, estimated_price=-1)], error="INVALID_COMMAND")
        execute("shopping_update", [{"id": milk, "expected_version": version(milk) - 1, "quantity": 3}], error="CONFLICT")
        bread, butter = seed("Pain complet", 1, "unité(s)"), seed("Beurre doux", 1, "unité(s)")
        execute("shopping_remove", [at(bread), {"id": butter, "expected_version": version(butter) + 1}], error="CONFLICT")
        equal([row(bread) is None, row(butter) is None], [False, False])
        execute("shopping_remove", [at(bread), at(bread)], error="DUPLICATE_ITEM")
        removed = execute("shopping_remove", [at(bread), at(butter)])
        equal([row(bread), row(butter), sorted(c["outcome"] for c in removed["shopping_changes"])], [None, None, ["removed", "removed"]])
    check("check, update and remove apply at the displayed version, all or nothing", check_update_remove)

    def undo_everything():
        created = add(item("Tomates cerises", 250, "g"))
        undo(created)
        equal(lines("Tomates cerises"), "")
        undo(created, error="ALREADY_UNDONE")
        basil = seed("Basilic", 1, "unité(s)")
        merged = add(item("Basilic", 1))
        undo(merged)
        equal(row(basil)["quantity"], 1)
        checked = execute("shopping_check", [at(basil, purchased=True)])
        undo(checked)
        equal(row(basil)["purchased"], False)
        updated = execute("shopping_update", [at(basil, quantity=4, store_section="Herbes", estimated_price=2)])
        undo(updated)
        equal([row(basil)[k] for k in ("quantity", "section", "price")], [1, None, None])
        before = run("SELECT created_at::text FROM shopping_list WHERE id=" + literal(basil) + ";")
        removed = execute("shopping_remove", [at(basil)])
        undo(removed)
        equal([row(basil)["quantity"], run("SELECT created_at::text FROM shopping_list WHERE id=" + literal(basil) + ";")], [1, before])
        # Two items of one product in one command: created then topped up, undone as one.
        twice = add(item("Courgettes", 1), item("Courgettes", 2))
        equal(lines("Courgettes"), "3 unité(s)")
        undo(twice)
        equal(lines("Courgettes"), "")
    check("every shopping command is undone, rows coming back with their identity", undo_everything)

    def undo_is_all_or_nothing():
        eggs = seed("Œufs plein air", 6, "unité(s)")
        merged = add(item("Œufs plein air", 6))
        execute("shopping_check", [at(eggs, purchased=True)])
        undo(merged, error="UNDO_CONFLICT")
        equal([row(eggs)["quantity"], row(eggs)["purchased"]], [12, True])
        undo(merged, owner=B, error="COMMAND_NOT_FOUND")
        kale, leek = seed("Chou kale", 1, "unité(s)"), seed("Poireaux", 2, "unité(s)")
        removed = execute("shopping_remove", [at(kale), at(leek)])
        # Another device wrote a row under the same identity since: the removal is not undone.
        run("INSERT INTO shopping_list(id,user_id,product_id,quantity,unit) VALUES(" + literal(leek) + "," + literal(A) + ","
            + literal(product("Poireaux")) + ",1,'unité(s)');")
        undo(removed, error="UNDO_CONFLICT")
        equal(row(kale), None)
    check("an undo is refused without partial effect once a row changed", undo_is_all_or_nothing)

    def recipe_missing_is_undoable():
        seed("lait de coco", .5, "l")
        recipe = units.recipe(4, [("lait de coco", 1, "l")])
        result = menu.missing(recipe, [{"ingredient_index": 0, "quantity": 1, "unit": "l"}])
        equal([menu.listed("lait de coco"), result["shopping_changes"][0]["outcome"]], ["1 l", "merged"])
        undo(result)
        equal(menu.listed("lait de coco"), "0.5 l")
    check("« Ajouter les manquants » goes through the primitive and is undone", recipe_missing_is_undoable)

    def concurrent_adds():
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            for future in [pool.submit(add, item("Jus d'orange", 1, "l")) for _ in range(2)]:
                future.result()
        equal(lines("Jus d'orange"), "2 l")
    check("two concurrent adds of one product make one row holding both", concurrent_adds)


if __name__ == "__main__":
    run("CREATE DATABASE " + stock.DATABASE + ";", database="postgres")
    try:
        run(file=ROOT / "supabase/tests/v10-personalization-schema.sql")
        run(PRODUCTION_MIRROR)
        for name in MIGRATIONS:
            run(file=ROOT / "supabase/migrations" / name)
        run(file=ROOT / "supabase/migrations" / MIGRATIONS[-1])  # idempotent
        stock.tests(cache_table_is_complete=True)
        stock.routine_tests(capability=4)
        profile.tests()
        pantry.tests()
        units.tests()
        menu.tests()
        run(UNIQUE_CATALOGUE)
        tests()
        print(f"{stock.checks} groups passed with shopping list commands on real local PostgreSQL.")
    finally:
        run("DROP DATABASE " + stock.DATABASE + " WITH (FORCE);", database="postgres")
