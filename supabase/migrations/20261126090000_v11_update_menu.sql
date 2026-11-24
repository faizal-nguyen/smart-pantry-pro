-- V11-01 E3: an editable menu (PRP V11-01, section 5; decisions D4, D5 and D6).
--
-- * meal_plan_entries.leftover_of links a leftover to the meal it comes from (D6). A leftover has no
--   recipe of its own: it adds nothing to the week's shopping (private.menu_basis leaves it out) and
--   nothing to cook. The key is deferred, so that a swap may delete and reinsert a meal under its own
--   identity; a direct delete of a meal that has leftovers is refused at commit.
-- * Duplicate weekly plans (E0: one group of 5 in production) are resumed once: per account and week
--   the oldest plan stays (the one the commands write); per slot, a cooked meal, else the newest, is
--   kept and moved to it; the other meals and plans are deleted. Then one plan per week is unique.
-- * update_menu (capacity 6): set, servings, move (D5: an occupied slot swaps), remove and leftover,
--   applied in order under the account's lock, each against the version of the meals it touches.
--   Its receipt keeps the meals before and what stands after; undo_stock restores the menu as it
--   was when every meal it left is still as it left it (MENU_CHANGED, MEAL_COOKED).
-- * plan_recipe removes and names the leftovers of the meal it replaces; its undo restores them.
-- The command function starts from the exact body of 20261124090000_v11_menu_week_shopping.sql.
BEGIN;

ALTER TABLE public.meal_plan_entries ADD COLUMN IF NOT EXISTS leftover_of uuid;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='meal_plan_entries_leftover_of_fkey' AND conrelid='public.meal_plan_entries'::regclass) THEN
    ALTER TABLE public.meal_plan_entries ADD CONSTRAINT meal_plan_entries_leftover_of_fkey FOREIGN KEY (leftover_of)
      REFERENCES public.meal_plan_entries(id) DEFERRABLE INITIALLY DEFERRED;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='meal_plan_entries_leftover_not_self' AND conrelid='public.meal_plan_entries'::regclass) THEN
    ALTER TABLE public.meal_plan_entries ADD CONSTRAINT meal_plan_entries_leftover_not_self CHECK (leftover_of<>id);
  END IF;
END $do$;
CREATE INDEX IF NOT EXISTS meal_plan_entries_leftover_of_idx ON public.meal_plan_entries(leftover_of) WHERE leftover_of IS NOT NULL;

-- A leftover names a meal of the same account that is not itself a leftover, whoever writes it
-- (the legacy policy still lets the account write its meals directly).
CREATE OR REPLACE FUNCTION private.meal_entry_check_leftover() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.leftover_of IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.meal_plan_entries o JOIN public.weekly_meal_plans wo ON wo.id=o.meal_plan_id
      JOIN public.weekly_meal_plans wn ON wn.id=NEW.meal_plan_id
      WHERE o.id=NEW.leftover_of AND o.leftover_of IS NULL AND wo.user_id=wn.user_id) THEN
    RAISE EXCEPTION 'INVALID_COMMAND';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.meal_entry_check_leftover() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS meal_entry_check_leftover ON public.meal_plan_entries;
CREATE TRIGGER meal_entry_check_leftover BEFORE INSERT OR UPDATE OF leftover_of,meal_plan_id ON public.meal_plan_entries
  FOR EACH ROW EXECUTE FUNCTION private.meal_entry_check_leftover();

-- Duplicate weekly plans: per slot, a cooked meal first, else the newest, joins the oldest plan.
WITH ranked AS (
  SELECT id,user_id,week_start_date,row_number() OVER (PARTITION BY user_id,week_start_date ORDER BY created_at NULLS LAST,id) AS rank,
    count(*) OVER (PARTITION BY user_id,week_start_date) AS plans
  FROM public.weekly_meal_plans
), kept AS (
  SELECT user_id,week_start_date,id AS plan_id FROM ranked WHERE rank=1 AND plans>1
), meals AS (
  SELECT e.id,row_number() OVER (PARTITION BY k.plan_id,e.day_of_week,e.meal_type
      ORDER BY (e.cooked_command_id IS NOT NULL) DESC,e.created_at DESC NULLS LAST,e.id DESC) AS rank
  FROM public.meal_plan_entries e JOIN public.weekly_meal_plans w ON w.id=e.meal_plan_id
  JOIN kept k ON k.user_id=w.user_id AND k.week_start_date=w.week_start_date
)
DELETE FROM public.meal_plan_entries e USING meals m WHERE e.id=m.id AND m.rank>1;
WITH ranked AS (
  SELECT id,user_id,week_start_date,row_number() OVER (PARTITION BY user_id,week_start_date ORDER BY created_at NULLS LAST,id) AS rank,
    count(*) OVER (PARTITION BY user_id,week_start_date) AS plans
  FROM public.weekly_meal_plans
), kept AS (
  SELECT user_id,week_start_date,id AS plan_id FROM ranked WHERE rank=1 AND plans>1
)
UPDATE public.meal_plan_entries e SET meal_plan_id=k.plan_id
FROM public.weekly_meal_plans w JOIN kept k ON k.user_id=w.user_id AND k.week_start_date=w.week_start_date
WHERE w.id=e.meal_plan_id AND e.meal_plan_id<>k.plan_id;
-- Any other row naming a duplicate plan (production: contextual_planning_data, cascading, and
-- context_adaptations_log, blocking; both empty on 25 Nov 2026) now names the kept one.
DO $do$
DECLARE v_fk record;
BEGIN
  FOR v_fk IN SELECT c.conrelid::regclass AS tbl,a.attname AS col FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
      WHERE c.contype='f' AND c.confrelid='public.weekly_meal_plans'::regclass
        AND c.conrelid<>'public.meal_plan_entries'::regclass AND cardinality(c.conkey)=1 LOOP
    EXECUTE format('WITH ranked AS (SELECT id,user_id,week_start_date,row_number() OVER (PARTITION BY user_id,week_start_date ORDER BY created_at NULLS LAST,id) AS rank FROM public.weekly_meal_plans),
        kept AS (SELECT user_id,week_start_date,id AS plan_id FROM ranked WHERE rank=1)
      UPDATE %s t SET %I=k.plan_id FROM ranked r JOIN kept k USING (user_id,week_start_date) WHERE r.rank>1 AND t.%I=r.id',v_fk.tbl,v_fk.col,v_fk.col);
  END LOOP;
END $do$;
WITH ranked AS (
  SELECT id,row_number() OVER (PARTITION BY user_id,week_start_date ORDER BY created_at NULLS LAST,id) AS rank FROM public.weekly_meal_plans
)
DELETE FROM public.weekly_meal_plans p USING ranked r WHERE p.id=r.id AND r.rank>1;
CREATE UNIQUE INDEX IF NOT EXISTS weekly_meal_plans_user_week_key ON public.weekly_meal_plans(user_id,week_start_date);

-- Body of 20261124090000; plan creation now waits for, or takes, a plan created meanwhile.
CREATE OR REPLACE FUNCTION private.menu_plan_id(p_user uuid,p_week date,p_create boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.weekly_meal_plans WHERE user_id=p_user AND week_start_date=p_week
  ORDER BY created_at NULLS LAST,id LIMIT 1 FOR UPDATE;
  IF v_id IS NULL AND p_create THEN
    -- V11-01 E3: one plan per week (unique index); a plan created meanwhile is the one used.
    INSERT INTO public.weekly_meal_plans(user_id,week_start_date) VALUES(p_user,p_week)
    ON CONFLICT (user_id,week_start_date) DO NOTHING RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.weekly_meal_plans WHERE user_id=p_user AND week_start_date=p_week FOR UPDATE;
    END IF;
  END IF;
  RETURN v_id;
END $$;

-- Body of 20261124090000; leftovers are left out of the week's shopping (D3).
CREATE OR REPLACE FUNCTION private.menu_basis(p_user uuid,p_week_start date,p_as_of date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_meals jsonb;
BEGIN
  IF p_week_start IS NULL OR extract(isodow FROM p_week_start)<>1 OR p_as_of IS NULL THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  WITH plans AS (
    SELECT DISTINCT ON (week_start_date) id,week_start_date FROM public.weekly_meal_plans
    WHERE user_id=p_user AND week_start_date BETWEEN p_as_of-6 AND p_week_start+6
    ORDER BY week_start_date,created_at NULLS LAST,id
  ), meals AS (
    SELECT e.id,e.version,w.week_start_date+e.day_of_week AS day,e.meal_type,e.recipe_reference,e.servings,e.recipe_name,
      CASE e.meal_type WHEN 'breakfast' THEN 0 WHEN 'lunch' THEN 1 WHEN 'dinner' THEN 2 ELSE 3 END AS meal_order
    FROM public.meal_plan_entries e JOIN plans w ON w.id=e.meal_plan_id
    WHERE e.cooked_command_id IS NULL AND e.leftover_of IS NULL
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'date',day,'meal_type',meal_type,
      'recipe_reference',recipe_reference,'servings',servings,'recipe_name',recipe_name,
      'role',CASE WHEN day>=p_week_start THEN 'target' ELSE 'reserve' END) ORDER BY day,meal_order,id),'[]')
  INTO v_meals FROM meals WHERE day>=p_as_of AND day<=p_week_start+6;
  RETURN jsonb_build_object('week_start',p_week_start,'as_of',p_as_of,'meals',v_meals,'menu_version',md5(v_meals::text));
END $$;

-- A day as AAAA-MM-JJ, or NULL for anything else.
CREATE OR REPLACE FUNCTION private.menu_date(p_value text) RETURNS date
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF p_value IS NULL OR p_value !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN NULL; END IF;
  RETURN p_value::date;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

-- The moment of a slot, to order meals: day, then breakfast, lunch, dinner, snack.
CREATE OR REPLACE FUNCTION private.menu_moment(p_day date,p_meal text) RETURNS integer
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT (p_day-date '2000-01-03')*4+CASE p_meal WHEN 'breakfast' THEN 0 WHEN 'lunch' THEN 1 WHEN 'dinner' THEN 2 ELSE 3 END
$$;

CREATE OR REPLACE FUNCTION private.menu_entry_moment(p_entry public.meal_plan_entries) RETURNS integer
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT private.menu_moment(w.week_start_date+p_entry.day_of_week,p_entry.meal_type) FROM public.weekly_meal_plans w WHERE w.id=p_entry.meal_plan_id
$$;

-- A meal of the account, locked; a meal gone (or another account's) is a menu changed since.
CREATE OR REPLACE FUNCTION private.menu_entry_for_update(p_user uuid,p_id uuid) RETURNS public.meal_plan_entries
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_entry public.meal_plan_entries%ROWTYPE;
BEGIN
  SELECT e.* INTO v_entry FROM public.meal_plan_entries e JOIN public.weekly_meal_plans w ON w.id=e.meal_plan_id
  WHERE e.id=p_id AND w.user_id=p_user FOR UPDATE OF e;
  IF NOT FOUND THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
  RETURN v_entry;
END $$;

-- What a slot was expected to hold: JSON null for an empty slot, else the meal's version.
CREATE OR REPLACE FUNCTION private.menu_expect(p_found boolean,p_version bigint,p_expected jsonb) RETURNS void
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF p_expected IS NULL OR jsonb_typeof(p_expected) NOT IN ('null','number') THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF (jsonb_typeof(p_expected)='null')=p_found OR (p_found AND p_version IS DISTINCT FROM (p_expected#>>'{}')::bigint) THEN
    RAISE EXCEPTION 'MENU_CHANGED';
  END IF;
END $$;

-- D6: a leftover stays after its meal, and a meal before its leftovers. p_other moves to
-- p_other_moment in the same swap (or is NULL).
CREATE OR REPLACE FUNCTION private.menu_check_order(p_entry public.meal_plan_entries,p_moment integer,p_other uuid,p_other_moment integer) RETURNS void
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF p_entry.leftover_of IS NOT NULL AND p_moment<=(CASE WHEN p_entry.leftover_of=p_other THEN p_other_moment
      ELSE (SELECT private.menu_entry_moment(o) FROM public.meal_plan_entries o WHERE o.id=p_entry.leftover_of) END) THEN
    RAISE EXCEPTION 'LEFTOVER_ORDER';
  END IF;
  IF EXISTS (SELECT 1 FROM public.meal_plan_entries l WHERE l.leftover_of=p_entry.id
      AND (CASE WHEN l.id=p_other THEN p_other_moment ELSE private.menu_entry_moment(l) END)<=p_moment) THEN
    RAISE EXCEPTION 'LEFTOVER_ORDER';
  END IF;
END $$;

-- The image of a meal before the command first touched it (none for a meal it created).
CREATE OR REPLACE FUNCTION private.menu_snapshot(p_before jsonb,p_created uuid[],p_entry public.meal_plan_entries) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT CASE WHEN p_before ? p_entry.id::text OR p_entry.id=ANY(p_created) THEN p_before
    ELSE p_before||jsonb_build_object(p_entry.id::text,to_jsonb(p_entry)) END
$$;

-- Meals brought back as they were (identity and version included), into slots still free, each
-- leftover with its meal.
CREATE OR REPLACE FUNCTION private.menu_restore(p_rows jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p_rows,'[]')) r JOIN public.meal_plan_entries e
      ON e.id=(r.value->>'id')::uuid OR (e.meal_plan_id=(r.value->>'meal_plan_id')::uuid
        AND e.day_of_week=(r.value->>'day_of_week')::integer AND e.meal_type=r.value->>'meal_type'))
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p_rows,'[]')) r WHERE r.value->>'leftover_of' IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.meal_plan_entries o WHERE o.id=(r.value->>'leftover_of')::uuid)
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_rows) q WHERE q.value->>'id'=r.value->>'leftover_of'))
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p_rows,'[]')) r
      WHERE NOT EXISTS (SELECT 1 FROM public.weekly_meal_plans w WHERE w.id=(r.value->>'meal_plan_id')::uuid)) THEN
    RAISE EXCEPTION 'MENU_CHANGED';
  END IF;
  INSERT INTO public.meal_plan_entries SELECT (jsonb_populate_record(NULL::public.meal_plan_entries,r.value)).*
  FROM jsonb_array_elements(coalesce(p_rows,'[]')) r ORDER BY (r.value->>'leftover_of') IS NOT NULL;
END $$;

-- V11-01 E3 (D4): update_menu, applied in order under the account's lock. Each operation names the
-- version of the meals it touches; the receipt keeps their images before, and what stands after.
CREATE OR REPLACE FUNCTION private.update_menu(p_user uuid,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_op jsonb; v_kind text; v_entry public.meal_plan_entries%ROWTYPE; v_other public.meal_plan_entries%ROWTYPE;
  v_before jsonb:='{}'; v_created uuid[]:='{}'; v_date date; v_meal text; v_plan uuid; v_day integer;
  v_recipe jsonb; v_servings integer; v_found boolean; v_moment integer; v_from integer; v_sum integer;
  v_new uuid; v_after jsonb; v_removed jsonb;
BEGIN
  IF jsonb_typeof(p_payload->'operations')<>'array' OR jsonb_array_length(p_payload->'operations') NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  FOR v_op IN SELECT value FROM jsonb_array_elements(p_payload->'operations') LOOP
    v_kind:=v_op->>'op';
    IF jsonb_typeof(v_op)<>'object' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    IF v_kind IN ('set','move','leftover') THEN
      v_date:=private.menu_date(v_op->>'date'); v_meal:=v_op->>'meal_type';
      IF v_date IS NULL OR v_meal IS NULL OR v_meal NOT IN ('breakfast','lunch','dinner','snack') THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
      v_plan:=private.menu_plan_id(p_user,v_date-(extract(isodow FROM v_date)::integer-1),true);
      v_day:=extract(isodow FROM v_date)::integer-1;
      SELECT e.* INTO v_other FROM public.meal_plan_entries e
      WHERE e.meal_plan_id=v_plan AND e.day_of_week=v_day AND e.meal_type=v_meal FOR UPDATE;
      v_found:=FOUND;
    END IF;
    IF v_kind IN ('set','servings','leftover') THEN
      IF jsonb_typeof(v_op->'servings') IS DISTINCT FROM 'number' OR (v_op->>'servings')::numeric NOT BETWEEN 1 AND 100
        OR (v_op->>'servings')::numeric<>trunc((v_op->>'servings')::numeric) THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
      v_servings:=(v_op->>'servings')::integer;
    END IF;
    IF v_kind IN ('servings','move','remove','leftover') THEN
      IF coalesce(v_op->>'entry_id','')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        OR jsonb_typeof(v_op->'expected_version') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
      v_entry:=private.menu_entry_for_update(p_user,(v_op->>'entry_id')::uuid);
      IF v_entry.version IS DISTINCT FROM (v_op->>'expected_version')::bigint THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
    END IF;

    IF v_kind='set' THEN
      -- As plan_recipe: a new row; a cooked meal stays; the leftovers of a replaced meal go with it.
      IF coalesce(v_op#>>'{recipe,id}','')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
      v_recipe:=public.resolve_stock_recipe((v_op#>>'{recipe,id}')::uuid,coalesce(v_op#>>'{recipe,source}','auto'));
      PERFORM private.menu_expect(v_found,v_other.version,v_op->'expected_version');
      IF v_found THEN
        IF v_other.cooked_command_id IS NOT NULL THEN RAISE EXCEPTION 'MEAL_COOKED'; END IF;
        FOR v_entry IN SELECT * FROM public.meal_plan_entries WHERE leftover_of=v_other.id ORDER BY id FOR UPDATE LOOP
          v_before:=private.menu_snapshot(v_before,v_created,v_entry);
        END LOOP;
        v_before:=private.menu_snapshot(v_before,v_created,v_other);
        DELETE FROM public.meal_plan_entries WHERE leftover_of=v_other.id;
        DELETE FROM public.meal_plan_entries WHERE id=v_other.id;
      END IF;
      INSERT INTO public.meal_plan_entries(meal_plan_id,day_of_week,meal_type,recipe_id,recipe_reference,recipe_name,servings,prep_time,cook_time)
      VALUES(v_plan,v_day,v_meal,NULL,jsonb_build_object('id',v_recipe->>'id','source',v_recipe->>'source'),v_recipe->>'name',v_servings,
        (v_recipe->>'prep_time')::integer,(v_recipe->>'cook_time')::integer)
      RETURNING id INTO v_new;
      v_created:=v_created||v_new;

    ELSIF v_kind='servings' THEN
      -- A meal keeps at least the servings of its leftovers; a leftover at most what its meal leaves.
      IF v_entry.leftover_of IS NULL THEN
        SELECT coalesce(sum(servings),0) INTO v_sum FROM public.meal_plan_entries WHERE leftover_of=v_entry.id;
        IF v_sum>v_servings THEN RAISE EXCEPTION 'LEFTOVER_CAPACITY'; END IF;
      ELSE
        SELECT o.servings-coalesce((SELECT sum(l.servings) FROM public.meal_plan_entries l WHERE l.leftover_of=o.id AND l.id<>v_entry.id),0)
        INTO v_sum FROM public.meal_plan_entries o WHERE o.id=v_entry.leftover_of FOR UPDATE;
        IF v_servings>v_sum THEN RAISE EXCEPTION 'LEFTOVER_CAPACITY'; END IF;
      END IF;
      v_before:=private.menu_snapshot(v_before,v_created,v_entry);
      UPDATE public.meal_plan_entries SET servings=v_servings WHERE id=v_entry.id;

    ELSIF v_kind='move' THEN
      -- D5: to an empty slot, or a swap with its meal; a meal keeps its identity, cooking and leftovers.
      IF v_plan=v_entry.meal_plan_id AND v_day=v_entry.day_of_week AND v_meal=v_entry.meal_type THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
      PERFORM private.menu_expect(v_found,v_other.version,v_op->'target_version');
      v_moment:=private.menu_moment(v_date,v_meal); v_from:=private.menu_entry_moment(v_entry);
      PERFORM private.menu_check_order(v_entry,v_moment,CASE WHEN v_found THEN v_other.id END,v_from);
      v_before:=private.menu_snapshot(v_before,v_created,v_entry);
      IF NOT v_found THEN
        UPDATE public.meal_plan_entries SET meal_plan_id=v_plan,day_of_week=v_day,meal_type=v_meal WHERE id=v_entry.id;
      ELSE
        PERFORM private.menu_check_order(v_other,v_from,v_entry.id,v_moment);
        v_before:=private.menu_snapshot(v_before,v_created,v_other);
        -- The slot pair is unique at once: both rows leave, then come back swapped, identities kept.
        DELETE FROM public.meal_plan_entries WHERE id IN (v_entry.id,v_other.id);
        INSERT INTO public.meal_plan_entries SELECT (jsonb_populate_record(NULL::public.meal_plan_entries,to_jsonb(v_entry)
          ||jsonb_build_object('meal_plan_id',v_plan,'day_of_week',v_day,'meal_type',v_meal,'version',v_entry.version+1))).*;
        INSERT INTO public.meal_plan_entries SELECT (jsonb_populate_record(NULL::public.meal_plan_entries,to_jsonb(v_other)
          ||jsonb_build_object('meal_plan_id',v_entry.meal_plan_id,'day_of_week',v_entry.day_of_week,'meal_type',v_entry.meal_type,'version',v_other.version+1))).*;
      END IF;

    ELSIF v_kind='remove' THEN
      -- The leftovers go with their meal; a cooked meal leaves the menu, its cooking stays in the journal.
      FOR v_other IN SELECT * FROM public.meal_plan_entries WHERE leftover_of=v_entry.id ORDER BY id FOR UPDATE LOOP
        v_before:=private.menu_snapshot(v_before,v_created,v_other);
      END LOOP;
      v_before:=private.menu_snapshot(v_before,v_created,v_entry);
      DELETE FROM public.meal_plan_entries WHERE leftover_of=v_entry.id;
      DELETE FROM public.meal_plan_entries WHERE id=v_entry.id;

    ELSIF v_kind='leftover' THEN
      -- D6: a meal of a recipe, an empty slot after it, within the servings it leaves.
      IF v_entry.leftover_of IS NOT NULL OR v_entry.recipe_reference IS NULL THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
      IF v_found THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
      IF private.menu_moment(v_date,v_meal)<=private.menu_entry_moment(v_entry) THEN RAISE EXCEPTION 'LEFTOVER_ORDER'; END IF;
      SELECT coalesce(sum(servings),0) INTO v_sum FROM public.meal_plan_entries WHERE leftover_of=v_entry.id;
      IF v_sum+v_servings>v_entry.servings THEN RAISE EXCEPTION 'LEFTOVER_CAPACITY'; END IF;
      INSERT INTO public.meal_plan_entries(meal_plan_id,day_of_week,meal_type,recipe_id,recipe_reference,recipe_name,servings,prep_time,cook_time,leftover_of)
      VALUES(v_plan,v_day,v_meal,NULL,NULL,left('Reste : '||v_entry.recipe_name,255),v_servings,0,0,v_entry.id)
      RETURNING id INTO v_new;
      v_created:=v_created||v_new;

    ELSE
      RAISE EXCEPTION 'INVALID_COMMAND';
    END IF;
  END LOOP;

  SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'version',e.version,'cooked_command_id',e.cooked_command_id) ORDER BY e.id),'[]')
  INTO v_after FROM public.meal_plan_entries e
  WHERE e.id=ANY(v_created) OR e.id IN (SELECT k::uuid FROM jsonb_object_keys(v_before) k);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.value->'id','recipe_name',b.value->'recipe_name','leftover_of',b.value->'leftover_of') ORDER BY b.key),'[]')
  INTO v_removed FROM jsonb_each(v_before) b WHERE NOT EXISTS (SELECT 1 FROM public.meal_plan_entries e WHERE e.id=b.key::uuid);
  RETURN jsonb_build_object('before',(SELECT coalesce(jsonb_agg(b.value ORDER BY b.key),'[]') FROM jsonb_each(v_before) b),
    'after',v_after,'removed',v_removed);
END $$;

-- D6 holds around these meals: each leftover after its meal, all within the meal's servings.
CREATE OR REPLACE FUNCTION private.menu_leftovers_hold(p_ids uuid[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  WITH origins AS (
    SELECT o.* FROM public.meal_plan_entries o
    WHERE o.id=ANY(p_ids) OR o.id IN (SELECT l.leftover_of FROM public.meal_plan_entries l WHERE l.id=ANY(p_ids))
  )
  SELECT NOT EXISTS (SELECT 1 FROM origins o JOIN public.meal_plan_entries l ON l.leftover_of=o.id
      WHERE private.menu_entry_moment(l)<=private.menu_entry_moment(o))
    AND NOT EXISTS (SELECT 1 FROM origins o
      WHERE (SELECT coalesce(sum(l.servings),0) FROM public.meal_plan_entries l WHERE l.leftover_of=o.id)>o.servings)
$$;

-- The menu as it was before an update_menu, if every meal it left is still as it left it.
CREATE OR REPLACE FUNCTION private.undo_update_menu(p_user uuid,p_edit jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_item jsonb; v_entry public.meal_plan_entries%ROWTYPE;
BEGIN
  IF p_edit IS NULL OR jsonb_typeof(p_edit->'after')<>'array' OR jsonb_typeof(p_edit->'before')<>'array' THEN RAISE EXCEPTION 'COMMAND_NOT_FOUND'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_edit->'after') ORDER BY value->>'id' LOOP
    v_entry:=private.menu_entry_for_update(p_user,(v_item->>'id')::uuid);
    IF v_entry.cooked_command_id IS DISTINCT FROM nullif(v_item->>'cooked_command_id','')::uuid THEN RAISE EXCEPTION 'MEAL_COOKED'; END IF;
    IF v_entry.version IS DISTINCT FROM (v_item->>'version')::bigint THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
  END LOOP;
  DELETE FROM public.meal_plan_entries WHERE id IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(p_edit->'after'));
  PERFORM private.menu_restore(p_edit->'before');
  -- A leftover planned since of a meal this undo removes, or one the restored meals would no longer
  -- hold (servings, order): the menu changed.
  IF EXISTS (SELECT 1 FROM public.meal_plan_entries l WHERE l.leftover_of IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(p_edit->'after'))
      AND NOT EXISTS (SELECT 1 FROM public.meal_plan_entries o WHERE o.id=l.leftover_of))
    OR NOT private.menu_leftovers_hold(ARRAY(SELECT (value->>'id')::uuid FROM jsonb_array_elements(p_edit->'before')
      UNION SELECT (value->>'id')::uuid FROM jsonb_array_elements(p_edit->'after'))) THEN
    RAISE EXCEPTION 'MENU_CHANGED';
  END IF;
END $$;

REVOKE ALL ON FUNCTION private.menu_date(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_leftovers_hold(uuid[]) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_moment(date,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_entry_moment(public.meal_plan_entries) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_entry_for_update(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_expect(boolean,bigint,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_check_order(public.meal_plan_entries,integer,uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_snapshot(jsonb,uuid[],public.meal_plan_entries) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_restore(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.update_menu(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.undo_update_menu(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_plan_id(uuid,date,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_basis(uuid,date,date) FROM PUBLIC,anon,authenticated;

-- Body of 20261124090000; only update_menu, its undo and plan_recipe's leftovers are added.
CREATE OR REPLACE FUNCTION private.execute_stock_command(p_command jsonb,p_allocations jsonb DEFAULT '[]') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_user uuid:=auth.uid(); v_id uuid; v_type text; v_payload jsonb; v_previous public.stock_commands%ROWTYPE;
  v_adjust jsonb; v_seen integer[]; v_item jsonb; v_ing jsonb; v_recipe jsonb; v_plan jsonb; v_result jsonb;
  v_inventory public.inventory%ROWTYPE; v_shopping public.shopping_list%ROWTYPE;
  v_movement public.stock_movements%ROWTYPE; v_product public.products%ROWTYPE;
  v_new_id uuid; v_recipe_id uuid; v_journal_id uuid; v_wrapper_id uuid; v_original_id uuid;
  v_quantity numeric; v_required numeric; v_total numeric; v_tolerance numeric; v_next numeric; v_unit text;
  v_version bigint; v_index integer; v_count integer; v_multiplier numeric;
  v_inventory_ids jsonb:='[]'; v_shopping_ids jsonb:='[]'; v_tables jsonb:='[]';
  v_date date; v_week date; v_plan_id uuid; v_ingredients jsonb;
  v_entry public.meal_plan_entries%ROWTYPE; v_replaced jsonb; v_change jsonb; v_shopping_changes jsonb;
  v_meal_entry uuid; v_entry_version bigint; v_leftovers jsonb; v_menu_edit jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  IF p_command IS NULL OR jsonb_typeof(p_command)<>'object' OR octet_length(p_command::text)>500000 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  v_id:=(p_command->>'command_id')::uuid; v_type:=p_command->>'command_type'; v_payload:=p_command->'payload';
  IF v_id IS NULL OR (p_command->>'payload_version')::integer IS DISTINCT FROM 1 OR jsonb_typeof(v_payload)<>'object' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF v_payload ? 'user_id' OR p_command ? 'user_id' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF v_type NOT IN ('transfer_shopping','consume_recipe','consume_inventory','adjust_inventory','undo_stock','save_recipe','add_catalog_recipe','recipe_add_missing','plan_recipe',
    'shopping_add','shopping_check','shopping_update','shopping_remove','menu_add_missing','update_menu') THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  -- Serialize commands for one account; row locks also protect against old clients.
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-stock:'||v_user::text,0));
  SELECT * INTO v_previous FROM public.stock_commands WHERE user_id=v_user AND command_id=v_id;
  IF FOUND THEN
    IF v_previous.command_type<>v_type OR v_previous.payload<>v_payload THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
    RETURN v_previous.result;
  END IF;
  INSERT INTO public.stock_commands(user_id,command_id,command_type,payload_version,payload)
  VALUES(v_user,v_id,v_type,1,v_payload);

  IF v_type='transfer_shopping' THEN
    IF jsonb_typeof(v_payload->'items')<>'array' OR jsonb_array_length(v_payload->'items') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(v_payload->'items'))<>jsonb_array_length(v_payload->'items') THEN RAISE EXCEPTION 'DUPLICATE_ITEM'; END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_payload->'items') ORDER BY value->>'id' LOOP
      SELECT * INTO v_shopping FROM public.shopping_list WHERE id=(v_item->>'id')::uuid AND user_id=v_user FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
      IF NOT v_shopping.is_purchased OR (v_item->>'expected_version')::bigint IS DISTINCT FROM v_shopping.stock_version THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      IF v_shopping.quantity<=0 OR v_shopping.quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      SELECT * INTO STRICT v_product FROM public.products WHERE id=v_shopping.product_id;
      v_quantity:=CASE WHEN v_item ? 'quantity' THEN (v_item->>'quantity')::numeric ELSE v_shopping.quantity END;
      v_unit:=coalesce(v_item->>'unit',v_shopping.unit,v_product.unit_type);
      IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity>1000000000 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      IF nullif(btrim(v_unit),'') IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
      INSERT INTO public.inventory(user_id,product_id,quantity,unit,location,expiry_date,date_kind,quantity_quality)
      VALUES(v_user,v_shopping.product_id,v_quantity,v_unit,v_item->>'location',nullif(v_item->>'expiry_date','')::date,COALESCE(v_item->>'date_kind','unknown'),COALESCE(v_item->>'quantity_quality','unknown'))
      RETURNING id,stock_version INTO v_new_id,v_version;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot,source_shopping)
      VALUES(v_user,v_id,v_new_id,v_quantity,v_unit,v_version,'{}',to_jsonb(v_shopping));
      DELETE FROM public.shopping_list WHERE id=v_shopping.id AND user_id=v_user;
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_new_id); v_shopping_ids:=v_shopping_ids||jsonb_build_array(v_shopping.id);
    END LOOP;
    v_tables:='["inventory","shopping_list"]';

  ELSIF v_type='consume_recipe' THEN
    v_recipe:=public.resolve_stock_recipe((v_payload#>>'{recipe,id}')::uuid,coalesce(v_payload#>>'{recipe,source}','auto'));
    IF v_recipe->>'version' IS DISTINCT FROM v_payload->>'recipe_version' THEN RAISE EXCEPTION 'RECIPE_CHANGED'; END IF;
    -- V11-01 E1: a planned meal is cooked once; the link is written in this transaction.
    IF v_payload ? 'meal_plan_entry_id' THEN
      SELECT e.* INTO v_entry FROM public.meal_plan_entries e JOIN public.weekly_meal_plans w ON w.id=e.meal_plan_id
      WHERE e.id=(v_payload->>'meal_plan_entry_id')::uuid AND w.user_id=v_user FOR UPDATE OF e;
      IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
      IF v_entry.cooked_command_id IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_COOKED'; END IF;
      IF v_entry.version IS DISTINCT FROM (v_payload->>'entry_version')::bigint
        OR v_entry.recipe_reference->>'id' IS DISTINCT FROM v_payload#>>'{recipe,id}' THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
      v_meal_entry:=v_entry.id;
    END IF;
    v_multiplier:=(v_payload->>'servings')::numeric/(v_recipe->>'servings')::numeric;
    IF v_multiplier IS NULL OR v_multiplier<=0 OR v_multiplier::text IN ('NaN','Infinity','-Infinity') OR (v_payload->>'servings')::numeric>100 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    IF jsonb_typeof(p_allocations)<>'array' OR jsonb_array_length(p_allocations)>1000 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    IF jsonb_typeof(v_payload->'outside_inventory')<>'array' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    v_ingredients:=v_recipe->'ingredients';
    IF jsonb_array_length(v_ingredients) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_RECIPE'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_payload->'outside_inventory') n WHERE n::integer<0 OR n::integer>=jsonb_array_length(v_ingredients)) THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    -- V10-02: actual quantities refer to this meal once; substitutions are explicit.
    IF v_payload ? 'adjustments' THEN
      IF jsonb_typeof(v_payload->'adjustments')<>'array' OR jsonb_array_length(v_payload->'adjustments')>100 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
      v_seen:='{}';
      FOR v_adjust IN SELECT value FROM jsonb_array_elements(v_payload->'adjustments') LOOP
        v_index:=(v_adjust->>'ingredient_index')::integer;
        v_quantity:=(v_adjust->>'quantity')::numeric;
        IF v_index IS NULL OR v_index<0 OR v_index>=jsonb_array_length(v_ingredients) OR v_index=ANY(v_seen) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
        IF v_quantity IS NULL OR v_quantity<0 OR v_quantity>1000000000 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
        IF nullif(btrim(v_adjust->>'unit'),'') IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
        IF v_adjust ? 'inventory_product_id' AND NOT EXISTS (SELECT 1 FROM public.products WHERE id=(v_adjust->>'inventory_product_id')::uuid) THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
        IF v_adjust ? 'inventory_id' AND NOT EXISTS (SELECT 1 FROM public.inventory WHERE id=(v_adjust->>'inventory_id')::uuid AND user_id=v_user) THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
        v_seen:=array_append(v_seen,v_index);
        v_ing:=(v_ingredients->v_index) || jsonb_build_object('quantity',v_quantity/v_multiplier,'unit',v_adjust->>'unit');
        IF v_adjust ? 'inventory_product_id' THEN v_ing:=v_ing || jsonb_build_object('inventory_product_id',v_adjust->>'inventory_product_id'); END IF;
        v_ingredients:=jsonb_set(v_ingredients,ARRAY[v_index::text],v_ing);
      END LOOP;
    END IF;
    -- Deterministic row locking, then revalidate every allocation in the DB.
    PERFORM id FROM public.inventory WHERE user_id=v_user AND id IN
      (SELECT (value->>'inventory_id')::uuid FROM jsonb_array_elements(p_allocations)) ORDER BY id FOR UPDATE;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_allocations) LOOP
      v_index:=(v_item->>'ingredient_index')::integer;
      IF v_index IS NULL OR v_index<0 OR v_index>=jsonb_array_length(v_ingredients)
        OR v_payload->'outside_inventory' @> jsonb_build_array(v_index) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
      v_ing:=v_ingredients->v_index;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(v_payload->'adjustments','[]')) a WHERE (a->>'ingredient_index')::integer=v_index AND a ? 'inventory_id' AND a->>'inventory_id' IS DISTINCT FROM v_item->>'inventory_id') THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
      SELECT * INTO v_inventory FROM public.inventory WHERE id=(v_item->>'inventory_id')::uuid AND user_id=v_user;
      IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
      IF (v_item->>'expected_version')::bigint IS DISTINCT FROM v_inventory.stock_version THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      SELECT * INTO STRICT v_product FROM public.products WHERE id=v_inventory.product_id;
      v_unit:=coalesce(v_inventory.unit,v_product.unit_type);
      IF v_item->>'unit' IS DISTINCT FROM v_unit THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      -- Same rule as allocateRecipeStock: the linked product or a pantry product of the same name.
      IF nullif(v_ing->>'inventory_product_id','')::uuid IS DISTINCT FROM v_inventory.product_id
        AND public.stock_ingredient_match_rank(v_ing->>'ingredient_name',v_product.name)=0 THEN
        RAISE EXCEPTION 'INVALID_ALLOCATION';
      END IF;
      v_quantity:=(v_item->>'quantity')::numeric;
      IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      PERFORM public.stock_quantity_in_unit(v_quantity,v_unit,v_ing->>'unit');
    END LOOP;
    FOR v_ing,v_index IN SELECT value,ordinality::integer-1 FROM jsonb_array_elements(v_ingredients) WITH ORDINALITY LOOP
      IF v_payload->'outside_inventory' @> jsonb_build_array(v_index) THEN CONTINUE; END IF;
      -- Tap water is never taken from stock.
      IF public.stock_is_tap_water(v_ing->>'ingredient_name') THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_allocations) a WHERE (a->>'ingredient_index')::integer=v_index) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
        CONTINUE;
      END IF;
      v_required:=(v_ing->>'quantity')::numeric*v_multiplier;
      IF v_required=0 AND EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(v_payload->'adjustments','[]')) a WHERE (a->>'ingredient_index')::integer=v_index AND (a->>'quantity')::numeric=0) THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_allocations) a WHERE (a->>'ingredient_index')::integer=v_index) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
        CONTINUE;
      END IF;
      IF v_required IS NULL OR v_required<=0 THEN RAISE EXCEPTION 'QUANTITY_UNKNOWN'; END IF;
      -- Allocations are rounded to 1e-9 in the lot unit, and 1e-9 kg is 1e-6 g:
      -- each allocation may differ by 1e-9 of the larger of the two units.
      SELECT coalesce(sum(public.stock_quantity_in_unit((value->>'quantity')::numeric,value->>'unit',v_ing->>'unit')),0),
        coalesce(sum(greatest(1,public.stock_quantity_in_unit(1,value->>'unit',v_ing->>'unit'))),1)*0.000000001
      INTO v_total,v_tolerance FROM jsonb_array_elements(p_allocations) WHERE (value->>'ingredient_index')::integer=v_index;
      IF abs(v_total-v_required)>v_tolerance THEN RAISE EXCEPTION 'INSUFFICIENT_QUANTITY'; END IF;
    END LOOP;
    FOR v_plan IN SELECT jsonb_build_object('inventory_id',value->>'inventory_id','quantity',sum((value->>'quantity')::numeric))
      FROM jsonb_array_elements(p_allocations) GROUP BY value->>'inventory_id' ORDER BY value->>'inventory_id' LOOP
      SELECT * INTO STRICT v_inventory FROM public.inventory WHERE id=(v_plan->>'inventory_id')::uuid AND user_id=v_user;
      v_quantity:=(v_plan->>'quantity')::numeric;
      IF v_inventory.quantity<v_quantity THEN RAISE EXCEPTION 'INSUFFICIENT_QUANTITY'; END IF;
      SELECT coalesce(v_inventory.unit,unit_type) INTO v_unit FROM public.products WHERE id=v_inventory.product_id;
      UPDATE public.inventory SET quantity=quantity-v_quantity,unit=v_unit WHERE id=v_inventory.id AND user_id=v_user RETURNING stock_version INTO v_version;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot)
      VALUES(v_user,v_id,v_inventory.id,-v_quantity,v_unit,v_version,to_jsonb(v_inventory));
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_inventory.id);
    END LOOP;
    INSERT INTO public.cooking_journal_entries(user_id,recipe_id,recipe_title,stock_command_id,adjustments)
    VALUES(v_user,(v_recipe->>'id')::uuid,v_recipe->>'name',v_id,
      jsonb_build_object('servings',v_payload->'servings','recipe_reference',v_payload->'recipe','outside_inventory',v_payload->'outside_inventory','actual_ingredients',v_payload->'adjustments')) RETURNING id INTO v_journal_id;
    IF v_recipe->>'source'='user_recipes' THEN UPDATE public.user_recipes SET times_cooked=coalesce(times_cooked,0)+1,last_cooked_date=now() WHERE id=(v_recipe->>'id')::uuid AND user_id=v_user; END IF;
    IF v_meal_entry IS NOT NULL THEN UPDATE public.meal_plan_entries SET cooked_command_id=v_id WHERE id=v_meal_entry; END IF;
    v_tables:='["inventory","cooking_journal","user_recipes"]';

  ELSIF v_type IN ('consume_inventory','adjust_inventory') THEN
    IF jsonb_typeof(v_payload->'items')<>'array' OR jsonb_array_length(v_payload->'items') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(v_payload->'items'))<>jsonb_array_length(v_payload->'items') THEN RAISE EXCEPTION 'DUPLICATE_ITEM'; END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_payload->'items') ORDER BY value->>'id' LOOP
      SELECT * INTO v_inventory FROM public.inventory WHERE id=(v_item->>'id')::uuid AND user_id=v_user FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
      IF v_item ? 'expected_version' AND (v_item->>'expected_version')::bigint IS DISTINCT FROM v_inventory.stock_version THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      IF v_type='adjust_inventory' AND NOT v_item ? 'expected_version' THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      SELECT coalesce(v_inventory.unit,unit_type) INTO v_unit FROM public.products WHERE id=v_inventory.product_id;
      v_quantity:=public.stock_quantity_in_unit((v_item->>'quantity')::numeric,v_item->>'unit',v_unit);
      IF v_type='consume_inventory' THEN
        IF v_quantity<=0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
        IF v_quantity>v_inventory.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_QUANTITY'; END IF;
        v_next:=v_inventory.quantity-v_quantity;
      ELSE v_next:=v_quantity; END IF;
      UPDATE public.inventory SET quantity=v_next,unit=v_unit,
        location=CASE WHEN v_item ? 'location' THEN v_item->>'location' ELSE location END,
        expiry_date=CASE WHEN v_item ? 'expiry_date' THEN nullif(v_item->>'expiry_date','')::date ELSE expiry_date END,
        date_kind=CASE WHEN v_item ? 'date_kind' THEN v_item->>'date_kind' ELSE date_kind END,
        quantity_quality=CASE WHEN v_item ? 'quantity_quality' THEN v_item->>'quantity_quality' ELSE quantity_quality END
      WHERE id=v_inventory.id AND user_id=v_user RETURNING stock_version INTO v_version;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot)
      VALUES(v_user,v_id,v_inventory.id,v_next-v_inventory.quantity,v_unit,v_version,to_jsonb(v_inventory));
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_inventory.id);
    END LOOP;
    v_tables:='["inventory"]';

  ELSIF v_type='undo_stock' THEN
    v_original_id:=(v_payload->>'original_command_id')::uuid;
    SELECT * INTO v_previous FROM public.stock_commands WHERE user_id=v_user AND command_id=v_original_id;
    IF NOT FOUND OR v_previous.command_type NOT IN ('consume_recipe','consume_inventory','adjust_inventory','transfer_shopping','plan_recipe',
      'recipe_add_missing','shopping_add','shopping_check','shopping_update','shopping_remove','menu_add_missing','update_menu') THEN RAISE EXCEPTION 'COMMAND_NOT_FOUND'; END IF;
    IF EXISTS (SELECT 1 FROM public.stock_commands WHERE user_id=v_user AND reverses_command_id=v_original_id) THEN RAISE EXCEPTION 'ALREADY_UNDONE'; END IF;
    UPDATE public.stock_commands SET reverses_command_id=v_original_id WHERE user_id=v_user AND command_id=v_id;
  IF v_previous.command_type='update_menu' THEN
    -- V11-01 E3: the menu as it was, if every meal the edit left is still as it left it.
    PERFORM private.undo_update_menu(v_user,v_previous.result->'menu_edit');
    v_tables:='["meal_plan_entries","weekly_meal_plans"]';
  ELSIF v_previous.command_type='plan_recipe' THEN
    -- The slot gets back the meal it replaced, or is emptied; not when it changed since.
    SELECT e.* INTO v_entry FROM public.meal_plan_entries e JOIN public.weekly_meal_plans w ON w.id=e.meal_plan_id
    WHERE e.id=(v_previous.result->>'meal_plan_entry_id')::uuid AND w.user_id=v_user FOR UPDATE OF e;
    IF NOT FOUND OR v_entry.recipe_reference IS DISTINCT FROM v_previous.result->'planned_reference'
      OR v_entry.servings IS DISTINCT FROM (v_previous.payload->>'servings')::integer THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
    -- V11-01 E1: a cooked meal stays; its cooking is undone first.
    IF v_entry.cooked_command_id IS NOT NULL THEN RAISE EXCEPTION 'MEAL_COOKED'; END IF;
    -- V11-01 E3: so do the leftovers planned since from it.
    IF EXISTS (SELECT 1 FROM public.meal_plan_entries WHERE leftover_of=v_entry.id) THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
    IF v_previous.result ? 'entry_version' THEN
      -- V11-01 E1: the meal must still be the one planned (moved or edited: refused); the meal it
      -- replaced comes back exactly as it was, identity and version included, so that its own
      -- planning can be undone in turn.
      IF v_entry.version IS DISTINCT FROM (v_previous.result->>'entry_version')::bigint THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
      DELETE FROM public.meal_plan_entries WHERE id=v_entry.id;
      IF v_previous.result ? 'replaced_entry' THEN
        INSERT INTO public.meal_plan_entries SELECT (jsonb_populate_record(NULL::public.meal_plan_entries,v_previous.result->'replaced_entry' ||
          jsonb_build_object('version',coalesce((v_previous.result#>>'{replaced_entry,version}')::bigint,0)))).*;
      END IF;
      -- V11-01 E3: the leftovers it removed come back with it.
      PERFORM private.menu_restore(v_previous.result->'replaced_leftovers');
    -- A receipt from before V11-01 E1: the slot must still be the planned day and meal.
    ELSIF v_entry.day_of_week IS DISTINCT FROM extract(isodow FROM (v_previous.payload->>'date')::date)::integer-1
      OR v_entry.meal_type IS DISTINCT FROM coalesce(v_previous.payload->>'meal_type','dinner') THEN RAISE EXCEPTION 'MENU_CHANGED';
    ELSIF v_previous.result ? 'replaced_entry' THEN
      UPDATE public.meal_plan_entries SET recipe_id=nullif(v_previous.result#>>'{replaced_entry,recipe_id}','')::uuid,
        recipe_reference=v_previous.result#>'{replaced_entry,recipe_reference}',recipe_name=v_previous.result#>>'{replaced_entry,recipe_name}',
        servings=(v_previous.result#>>'{replaced_entry,servings}')::integer,prep_time=(v_previous.result#>>'{replaced_entry,prep_time}')::integer,
        cook_time=(v_previous.result#>>'{replaced_entry,cook_time}')::integer WHERE id=v_entry.id;
    ELSE
      DELETE FROM public.meal_plan_entries WHERE id=v_entry.id;
    END IF;
    v_plan_id:=v_entry.meal_plan_id; v_tables:='["meal_plan_entries"]';
  ELSIF v_previous.command_type IN ('recipe_add_missing','shopping_add','shopping_check','shopping_update','shopping_remove','menu_add_missing') THEN
    -- V11-05 E2: list commands are journaled in shopping_movements; a recipe_add_missing sent
    -- before this migration left no journal and cannot be undone.
    IF NOT EXISTS (SELECT 1 FROM public.shopping_movements WHERE user_id=v_user AND command_id=v_original_id)
      AND jsonb_array_length(coalesce(v_previous.result->'shopping_ids','[]'))>0 THEN RAISE EXCEPTION 'COMMAND_NOT_FOUND'; END IF;
    v_shopping_changes:=private.undo_shopping_command(v_user,v_original_id,v_id);
    DELETE FROM public.menu_shopping_contributions WHERE user_id=v_user AND command_id=v_original_id;
    SELECT coalesce(jsonb_agg(c->'id'),'[]') INTO v_shopping_ids FROM jsonb_array_elements(v_shopping_changes) c;
    v_tables:='["shopping_list"]';
  ELSE
    FOR v_movement IN SELECT * FROM public.stock_movements WHERE user_id=v_user AND command_id=v_original_id ORDER BY inventory_id LOOP
      SELECT * INTO v_inventory FROM public.inventory WHERE id=v_movement.inventory_id AND user_id=v_user FOR UPDATE;
      IF NOT FOUND OR v_inventory.stock_version<>v_movement.version_after OR v_inventory.unit IS DISTINCT FROM v_movement.unit THEN RAISE EXCEPTION 'UNDO_CONFLICT'; END IF;
      IF v_movement.source_shopping IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.shopping_list WHERE id=(v_movement.source_shopping->>'id')::uuid) THEN RAISE EXCEPTION 'UNDO_CONFLICT'; END IF;
        INSERT INTO public.shopping_list SELECT (jsonb_populate_record(NULL::public.shopping_list,v_movement.source_shopping ||
          jsonb_build_object('stock_version',(v_movement.source_shopping->>'stock_version')::bigint+1,'updated_at',now()))).*;
        DELETE FROM public.inventory WHERE id=v_inventory.id AND user_id=v_user;
        v_shopping_ids:=v_shopping_ids||jsonb_build_array(v_movement.source_shopping->>'id');
        v_version:=v_inventory.stock_version+1;
      ELSE
        v_next:=v_inventory.quantity-v_movement.delta;
        IF v_next<0 THEN RAISE EXCEPTION 'UNDO_CONFLICT'; END IF;
        UPDATE public.inventory SET quantity=v_next,
          location=v_movement.snapshot->>'location',expiry_date=nullif(v_movement.snapshot->>'expiry_date','')::date,
          date_kind=COALESCE(v_movement.snapshot->>'date_kind','unknown'),quantity_quality=COALESCE(v_movement.snapshot->>'quantity_quality','unknown')
        WHERE id=v_inventory.id AND user_id=v_user RETURNING stock_version INTO v_version;
      END IF;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot)
      VALUES(v_user,v_id,v_inventory.id,-v_movement.delta,v_movement.unit,v_version,to_jsonb(v_inventory));
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_inventory.id);
    END LOOP;
    UPDATE public.cooking_journal_entries SET voided_at=now(),updated_at=now()
    WHERE user_id=v_user AND stock_command_id=v_original_id RETURNING id INTO v_journal_id;
    UPDATE public.meal_plan_entries SET cooked_command_id=NULL WHERE cooked_command_id=v_original_id
      AND meal_plan_id IN (SELECT id FROM public.weekly_meal_plans WHERE user_id=v_user);
    IF v_previous.command_type='consume_recipe' AND EXISTS (SELECT 1 FROM public.user_recipes WHERE id=(v_previous.payload#>>'{recipe,id}')::uuid AND user_id=v_user) THEN
      UPDATE public.user_recipes SET times_cooked=greatest(0,coalesce(times_cooked,0)-1),
        last_cooked_date=(SELECT max(cooked_at) FROM public.cooking_journal_entries WHERE user_id=v_user AND recipe_id=(v_previous.payload#>>'{recipe,id}')::uuid AND voided_at IS NULL)
      WHERE id=(v_previous.payload#>>'{recipe,id}')::uuid AND user_id=v_user;
    END IF;
    v_tables:='["inventory","shopping_list","cooking_journal","user_recipes"]';
  END IF;

  ELSIF v_type='save_recipe' THEN
    v_recipe:=v_payload->'recipe'; v_ingredients:=v_payload->'ingredients';
    IF nullif(btrim(v_recipe->>'name'),'') IS NULL OR jsonb_typeof(v_ingredients)<>'array' OR jsonb_array_length(v_ingredients) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_RECIPE'; END IF;
    IF (v_recipe->>'servings')::numeric IS NULL OR (v_recipe->>'servings')::numeric<=0 OR (v_recipe->>'servings')::numeric>100 OR (v_recipe->>'servings')::numeric<>trunc((v_recipe->>'servings')::numeric) THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    INSERT INTO public.recipes(user_id,name,instructions,description,image_url,cuisine_category,meal_type,prep_time,cook_time,rest_time,servings,difficulty,tags,is_public,source_type,source_url)
    VALUES(v_user,btrim(v_recipe->>'name'),coalesce(v_recipe->>'instructions',''),v_recipe->>'description',v_recipe->>'image_url',
      v_recipe->>'cuisine_category',v_recipe->>'meal_type',coalesce((v_recipe->>'prep_time')::integer,0),coalesce((v_recipe->>'cook_time')::integer,0),
      coalesce((v_recipe->>'rest_time')::integer,0),(v_recipe->>'servings')::integer,coalesce((v_recipe->>'difficulty')::integer,3),
      ARRAY(SELECT jsonb_array_elements_text(coalesce(v_recipe->'tags','[]'))),coalesce((v_recipe->>'is_public')::boolean,false),
      coalesce(v_recipe->>'source_type','manual'),v_recipe->>'source_url') RETURNING id INTO v_recipe_id;
    FOR v_ing,v_index IN SELECT value,ordinality::integer-1 FROM jsonb_array_elements(v_ingredients) WITH ORDINALITY LOOP
      IF nullif(btrim(v_ing->>'ingredient_name'),'') IS NULL THEN RAISE EXCEPTION 'INVALID_INGREDIENT'; END IF;
      v_quantity:=nullif(v_ing->>'quantity','')::numeric;
      IF v_quantity IS NOT NULL AND (v_quantity<=0 OR v_quantity::text IN ('NaN','Infinity','-Infinity')) THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      v_new_id:=nullif(v_ing->>'inventory_product_id','')::uuid;
      IF v_new_id IS NULL THEN SELECT id INTO v_new_id FROM public.products WHERE public.stock_normalize_name(name)=public.stock_normalize_name(v_ing->>'ingredient_name') ORDER BY id LIMIT 1; END IF;
      INSERT INTO public.recipe_ingredients(recipe_id,ingredient_name,quantity,unit,is_essential,notes,order_index,inventory_product_id)
      VALUES(v_recipe_id,btrim(v_ing->>'ingredient_name'),v_quantity,v_ing->>'unit',coalesce((v_ing->>'is_essential')::boolean,true),v_ing->>'notes',v_index,v_new_id);
    END LOOP;
    v_tables:='["recipes","recipe_ingredients"]';

  ELSIF v_type='add_catalog_recipe' THEN
    v_recipe_id:=(v_payload->>'catalog_recipe_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.recipes_catalog WHERE id=v_recipe_id) THEN RAISE EXCEPTION 'RECIPE_NOT_FOUND'; END IF;
    INSERT INTO public.user_recipes(user_id,recipe_id,is_from_catalog,collections,personal_notes,custom_modifications)
    VALUES(v_user,v_recipe_id,true,ARRAY(SELECT jsonb_array_elements_text(coalesce(v_payload->'collections','[]'))),v_payload->>'personal_notes','{}')
    ON CONFLICT(user_id,recipe_id) WHERE is_from_catalog AND recipe_id IS NOT NULL DO NOTHING;
    SELECT id INTO STRICT v_wrapper_id FROM public.user_recipes WHERE user_id=v_user AND recipe_id=v_recipe_id AND is_from_catalog;
    v_tables:='["user_recipes"]';

  ELSIF v_type='recipe_add_missing' THEN
    v_recipe:=public.resolve_stock_recipe((v_payload#>>'{recipe,id}')::uuid,coalesce(v_payload#>>'{recipe,source}','auto'));
    v_multiplier:=(v_payload->>'servings')::numeric/(v_recipe->>'servings')::numeric;
    IF v_multiplier IS NULL OR v_multiplier<=0 OR v_multiplier::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    IF jsonb_typeof(p_allocations)<>'array' OR jsonb_array_length(p_allocations)>100 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    v_shopping_changes:='[]';
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_allocations) LOOP
      v_index:=(v_item->>'ingredient_index')::integer; v_ing:=v_recipe->'ingredients'->v_index;
      IF v_ing IS NULL THEN RAISE EXCEPTION 'INVALID_INGREDIENT'; END IF;
      v_quantity:=(v_item->>'quantity')::numeric;
      IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'QUANTITY_UNKNOWN'; END IF;
      IF (v_ing->>'quantity')::numeric IS NULL OR (v_ing->>'quantity')::numeric<=0 THEN RAISE EXCEPTION 'QUANTITY_UNKNOWN'; END IF;
      -- The shopping list only holds measurable amounts (canAddToShoppingList).
      IF public.stock_unit(public.stock_unit_name(v_ing->>'unit')) IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
      IF v_item->>'unit' IS DISTINCT FROM v_ing->>'unit' OR v_quantity>(v_ing->>'quantity')::numeric*v_multiplier THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      v_new_id:=coalesce(nullif(v_ing->>'inventory_product_id','')::uuid,private.shopping_resolve_product(v_ing->>'ingredient_name',NULL,v_ing->>'unit'));
      -- V11-05 E2: what the list already holds counts, the oldest convertible row is completed (D16),
      -- and every row change is journaled so that undo_stock can take it back.
      v_change:=private.shopping_aggregate(v_user,v_id,v_new_id,v_quantity,v_ing->>'unit','complete_to');
      IF v_change IS NULL THEN CONTINUE; END IF;
      v_shopping_changes:=v_shopping_changes||jsonb_build_array(v_change);
      v_shopping_ids:=v_shopping_ids||jsonb_build_array(v_change->'id');
    END LOOP;
    v_tables:='["shopping_list","products"]';

  ELSIF v_type IN ('shopping_add','shopping_check','shopping_update','shopping_remove') THEN
    v_shopping_changes:=private.shopping_command(v_user,v_id,v_type,v_payload);
    SELECT coalesce(jsonb_agg(s.id ORDER BY s.first),'[]') INTO v_shopping_ids
    FROM (SELECT c->'id' AS id,min(o) AS first FROM jsonb_array_elements(v_shopping_changes) WITH ORDINALITY e(c,o) GROUP BY c->'id') s;
    v_tables:=CASE WHEN v_type IN ('shopping_add','shopping_update') THEN '["shopping_list","products"]'::jsonb ELSE '["shopping_list"]'::jsonb END;

  ELSIF v_type='menu_add_missing' THEN
    v_shopping_changes:=private.menu_add_missing(v_user,v_id,v_payload);
    SELECT coalesce(jsonb_agg(s.id ORDER BY s.first),'[]') INTO v_shopping_ids
    FROM (SELECT c->'id' AS id,min(o) AS first FROM jsonb_array_elements(v_shopping_changes) WITH ORDINALITY e(c,o) GROUP BY c->'id') s;
    v_tables:='["shopping_list","products"]';

  ELSIF v_type='update_menu' THEN
    v_menu_edit:=private.update_menu(v_user,v_payload);
    v_tables:='["meal_plan_entries","weekly_meal_plans"]';

  ELSIF v_type='plan_recipe' THEN
    v_recipe:=public.resolve_stock_recipe((v_payload#>>'{recipe,id}')::uuid,coalesce(v_payload#>>'{recipe,source}','auto'));
    v_date:=(v_payload->>'date')::date; v_week:=v_date-(extract(isodow FROM v_date)::integer-1);
    IF v_date IS NULL OR (v_payload->>'servings')::numeric IS NULL OR (v_payload->>'servings')::numeric<=0 OR (v_payload->>'servings')::numeric>100 OR (v_payload->>'servings')::numeric<>trunc((v_payload->>'servings')::numeric) THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    -- V11-01 E1: the oldest plan of the week; a replaced meal is deleted, never rewritten in place,
    -- so no cooking link passes to the next meal; a cooked meal is not replaced.
    v_plan_id:=private.menu_plan_id(v_user,v_week,true);
    SELECT e.* INTO v_entry FROM public.meal_plan_entries e
    WHERE e.meal_plan_id=v_plan_id AND e.day_of_week=extract(isodow FROM v_date)::integer-1 AND e.meal_type=coalesce(v_payload->>'meal_type','dinner') FOR UPDATE;
    IF FOUND THEN
      IF v_entry.cooked_command_id IS NOT NULL THEN RAISE EXCEPTION 'MEAL_COOKED'; END IF;
      v_replaced:=to_jsonb(v_entry);
      -- V11-01 E3: the leftovers of a replaced meal go with it, named in the receipt.
      SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]') INTO v_leftovers FROM public.meal_plan_entries l WHERE l.leftover_of=v_entry.id;
      DELETE FROM public.meal_plan_entries WHERE leftover_of=v_entry.id;
      DELETE FROM public.meal_plan_entries WHERE id=v_entry.id;
    END IF;
    INSERT INTO public.meal_plan_entries(meal_plan_id,day_of_week,meal_type,recipe_id,recipe_reference,recipe_name,servings,prep_time,cook_time)
    VALUES(v_plan_id,extract(isodow FROM v_date)::integer-1,coalesce(v_payload->>'meal_type','dinner'),NULL,
      jsonb_build_object('id',v_recipe->>'id','source',v_recipe->>'source'),v_recipe->>'name',(v_payload->>'servings')::integer,
      (v_recipe->>'prep_time')::integer,(v_recipe->>'cook_time')::integer)
    RETURNING id,version INTO v_new_id,v_entry_version;
    v_tables:='["meal_plan_entries","weekly_meal_plans"]';
  END IF;

  v_result:=jsonb_strip_nulls(jsonb_build_object('command_id',v_id,'command_type',v_type,'status','confirmed',
    'affected_tables',v_tables,'inventory_ids',v_inventory_ids,'shopping_ids',v_shopping_ids,
    'recipe_id',v_recipe_id,'journal_id',v_journal_id,'user_recipe_id',v_wrapper_id,'meal_plan_id',v_plan_id,'meal_plan_entry_id',CASE WHEN v_type='plan_recipe' THEN v_new_id WHEN v_type='consume_recipe' THEN v_meal_entry ELSE NULL END,
    'entry_version',CASE WHEN v_type='plan_recipe' THEN v_entry_version END,
    'planned_reference',CASE WHEN v_type='plan_recipe' THEN jsonb_build_object('id',v_recipe->>'id','source',v_recipe->>'source') END,
    'replaced_entry',CASE WHEN v_type='plan_recipe' THEN v_replaced END,
    'shopping_changes',v_shopping_changes,
    'changes',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.inventory_id,'before_quantity',coalesce((m.snapshot->>'quantity')::numeric,0),
      'after_quantity',coalesce(i.quantity,0),'unit',m.unit,'stock_version',coalesce(i.stock_version,m.version_after)) ORDER BY m.inventory_id),'[]')
      FROM public.stock_movements m LEFT JOIN public.inventory i ON i.id=m.inventory_id AND i.user_id=v_user
      WHERE m.user_id=v_user AND m.command_id=v_id)));
  -- V11-01 E3: the menu's images are kept whole, nulls included (jsonb_strip_nulls is recursive).
  IF v_type='plan_recipe' AND jsonb_array_length(coalesce(v_leftovers,'[]'))>0 THEN v_result:=v_result||jsonb_build_object('replaced_leftovers',v_leftovers); END IF;
  IF v_type='update_menu' THEN v_result:=v_result||jsonb_build_object('menu_edit',v_menu_edit); END IF;
  UPDATE public.stock_commands SET result=v_result WHERE user_id=v_user AND command_id=v_id;
  RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION private.execute_stock_command(jsonb,jsonb) FROM PUBLIC,anon;

-- V11-01 E3: the API sends update_menu only to a database that declares it.
CREATE OR REPLACE FUNCTION public.stock_routine_capabilities() RETURNS integer LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$ SELECT 6 $$;
NOTIFY pgrst, 'reload schema';

COMMIT;
