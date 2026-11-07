-- V10-03F: owner-scoped manual discovery. No cron, scraping or paid provider is activated.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE CREATE ON SCHEMA private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- URLSearchParams-compatible query normalization for HTTP/RPC deduplication.
CREATE FUNCTION private.discovery_decode(p_text text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $fn$
DECLARE i integer:=1;b bytea:=''::bytea;c text;
BEGIN
 WHILE i<=length(p_text) LOOP
  c:=substr(p_text,i,1);
  IF c='%' AND substr(p_text,i+1,2) ~ '^[a-fA-F0-9]{2}$' THEN b:=b||decode(substr(p_text,i+1,2),'hex');i:=i+3;
  ELSE b:=b||convert_to(CASE WHEN c='+' THEN ' ' ELSE c END,'UTF8');i:=i+1;END IF;
 END LOOP;
 RETURN convert_from(b,'UTF8');
END $fn$;
CREATE FUNCTION private.discovery_encode(p_text text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $fn$
DECLARE b bytea:=convert_to(p_text,'UTF8');i integer;c integer;r text:='';
BEGIN
 FOR i IN 0..octet_length(b)-1 LOOP
  c:=get_byte(b,i);
  r:=r||CASE WHEN c=32 THEN '+' WHEN c BETWEEN 65 AND 90 OR c BETWEEN 97 AND 122 OR c BETWEEN 48 AND 57 OR c IN (42,45,46,95) THEN chr(c) ELSE '%'||upper(lpad(to_hex(c),2,'0')) END;
 END LOOP;
 RETURN r;
END $fn$;
CREATE FUNCTION private.discovery_url_identity(p_url text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $fn$
DECLARE base text:=split_part(p_url,'#',1);parts text[];host text;path text;query text;normalized_query text;
BEGIN
 parts:=regexp_match(base,'^https?://([^/?#@]+)([^?#]*)(?:\?([^#]*))?$','i');
 IF parts IS NULL THEN RAISE EXCEPTION 'INVALID_URL';END IF;
 host:=regexp_replace(lower(parts[1]),'^(www\.|m\.)','');
 IF base ~ '^https://' THEN host:=regexp_replace(host,':443$','');ELSE host:=regexp_replace(host,':80$','');END IF;
 path:=regexp_replace(coalesce(nullif(parts[2],''),'/'),'/+$','');
 query:=parts[3];
 SELECT string_agg(private.discovery_encode(k)||'='||private.discovery_encode(v),'&' ORDER BY k COLLATE "C",ord) INTO normalized_query
 FROM (
  SELECT private.discovery_decode(split_part(pair,'=',1)) k,
   private.discovery_decode(CASE WHEN strpos(pair,'=')>0 THEN substr(pair,strpos(pair,'=')+1) ELSE '' END) v,ord
  FROM unnest(string_to_array(query,'&')) WITH ORDINALITY AS q(pair,ord) WHERE pair<>''
 ) AS decoded WHERE k !~* '^(utm(_.+)?|fbclid|gclid|dclid|msclkid|igsh|igshid|si|share_id|share_app_id|_r|_t)$';
 RETURN host||path||CASE WHEN normalized_query IS NOT NULL AND normalized_query<>'' THEN '?'||normalized_query ELSE '' END;
END $fn$;
REVOKE ALL ON FUNCTION private.discovery_decode(text),private.discovery_encode(text),private.discovery_url_identity(text) FROM PUBLIC,anon,authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS discovery_import_owner_idx ON public.social_recipe_imports(id,user_id);
CREATE TABLE public.recipe_discovery_creators (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 160),seed_key text,
 paused boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,user_id),UNIQUE(user_id,seed_key)
);
CREATE TABLE public.recipe_discovery_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 creator_id uuid NOT NULL,url text NOT NULL CHECK(length(url)<=2000 AND url ~ '^https?://'),
 platform text NOT NULL CHECK(platform IN ('instagram','tiktok','web','manual')),
 access_mode text NOT NULL DEFAULT 'manual' CHECK(access_mode IN ('manual','written_feed')),
 identity_status text NOT NULL DEFAULT 'unverified' CHECK(identity_status IN ('unverified','verified')),
 last_success_at timestamptz,last_error text,
 FOREIGN KEY(creator_id,user_id) REFERENCES public.recipe_discovery_creators(id,user_id) ON DELETE CASCADE,
 UNIQUE(user_id,creator_id,url)
);
CREATE INDEX discovery_sources_creator_idx ON public.recipe_discovery_sources(creator_id,user_id);
CREATE TABLE public.recipe_discovery_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 creator_id uuid NOT NULL,source_url text NOT NULL CHECK(length(source_url)<=2000 AND source_url ~ '^https?://'),
 canonical_url text NOT NULL CHECK(length(canonical_url)<=2000 AND canonical_url ~ '^https?://'),
 source_hash text NOT NULL CHECK(source_hash ~ '^[a-f0-9]{32}$'),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 300),description text CHECK(length(description)<=3000),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','kept','passed','snoozed')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),import_id uuid,
 published_at timestamptz,snoozed_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(creator_id,user_id) REFERENCES public.recipe_discovery_creators(id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(import_id,user_id) REFERENCES public.social_recipe_imports(id,user_id) ON DELETE SET NULL (import_id),
 UNIQUE(id,user_id),UNIQUE(user_id,source_hash)
);
CREATE INDEX discovery_items_owner_status_idx ON public.recipe_discovery_items(user_id,status,created_at DESC);
CREATE INDEX discovery_items_creator_idx ON public.recipe_discovery_items(creator_id,user_id);
CREATE INDEX discovery_items_import_idx ON public.recipe_discovery_items(import_id,user_id) WHERE import_id IS NOT NULL;
CREATE TABLE public.recipe_discovery_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 selection_key text NOT NULL,selected_at timestamptz NOT NULL DEFAULT now(),item_ids jsonb NOT NULL DEFAULT '[]',
 CHECK(jsonb_typeof(item_ids)='array' AND jsonb_array_length(item_ids)<=5),UNIQUE(user_id,selection_key)
);
CREATE TABLE public.recipe_discovery_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 item_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('keep','pass','not_today','added','repeat','dislike','too_long')),
 cooked boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(item_id,user_id) REFERENCES public.recipe_discovery_items(id,user_id) ON DELETE CASCADE,
 CHECK((kind IN ('repeat','dislike','too_long') AND cooked) OR (kind NOT IN ('repeat','dislike','too_long') AND NOT cooked))
);
CREATE INDEX discovery_events_owner_item_idx ON public.recipe_discovery_events(user_id,item_id,created_at DESC);
CREATE UNIQUE INDEX discovery_events_added_once_idx ON public.recipe_discovery_events(user_id,item_id) WHERE kind='added';
CREATE VIEW public.recipe_discovery_latest_feedback WITH (security_invoker=true) AS
 SELECT DISTINCT ON(user_id,item_id) id,user_id,item_id,kind,cooked,created_at
 FROM public.recipe_discovery_events WHERE cooked AND kind IN ('repeat','dislike','too_long')
 ORDER BY user_id,item_id,created_at DESC,id DESC;
REVOKE ALL ON public.recipe_discovery_latest_feedback FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.recipe_discovery_latest_feedback TO authenticated;
CREATE TABLE private.recipe_discovery_receipts (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,command_id uuid NOT NULL,
 command jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,command_id)
);
ALTER TABLE private.recipe_discovery_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.recipe_discovery_receipts FROM PUBLIC,anon,authenticated;

DO $rls$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['recipe_discovery_creators','recipe_discovery_sources','recipe_discovery_items','recipe_discovery_batches','recipe_discovery_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY owner_read ON public.%I FOR SELECT TO authenticated USING ((select auth.uid())=user_id)',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $rls$;

-- All writes are bounded domain commands. No Data API write can qualify a source
-- or assign a foreign owner. The private function always derives identity from JWT.
CREATE FUNCTION private.execute_recipe_discovery(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
 u uuid:=auth.uid();op text:=p_command->>'op';p jsonb:=p_command->'payload';
 cid uuid;old private.recipe_discovery_receipts%ROWTYPE;result jsonb;
 creator public.recipe_discovery_creators%ROWTYPE;item public.recipe_discovery_items%ROWTYPE;
 imp public.social_recipe_imports%ROWTYPE;draft public.imported_recipe_drafts%ROWTYPE;
 spec record;url text;platform text;expected integer;decision text;feedback text;key text;ids jsonb;canonical text;identity text;hash text;
 active_count integer;cap integer;new_import boolean:=false;source jsonb;draft_json jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
 IF jsonb_typeof(p_command) IS DISTINCT FROM 'object' OR jsonb_typeof(p) IS DISTINCT FROM 'object' OR op IS NULL OR
    (p_command-'op'-'payload'-'commandId')<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
 -- Serialize commands per owner, including quota checks and concurrent replays.
 PERFORM pg_advisory_xact_lock(hashtextextended('discovery:'||u::text,0));
 IF op NOT IN ('seed','selection') THEN
  BEGIN cid:=(p_command->>'commandId')::uuid;EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'INVALID_COMMAND';END;
  IF cid IS NULL THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
  SELECT * INTO old FROM private.recipe_discovery_receipts WHERE user_id=u AND command_id=cid;
  IF FOUND THEN
   IF old.command<>p_command THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';END IF;
   RETURN old.result||jsonb_build_object('replayed',true);
  END IF;
 END IF;
 IF op='seed' THEN
  IF p<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
  FOR spec IN SELECT * FROM (VALUES
   ('loulou-kitchen','LouLouKitchen','https://www.marabout.com/auteur/loulou-kitchen/','web','verified'),
   ('olivier-lin','Olivier Lin','https://www.instagram.com/olivier_lin/','instagram','unverified'),
   ('andy-cooks','Andy Cooks','https://www.andy-cooks.com/blogs/recipes','web','verified')
  ) AS v(seed_key,name,url,platform,identity_status) LOOP
   INSERT INTO public.recipe_discovery_creators(user_id,name,seed_key) VALUES(u,spec.name,spec.seed_key)
    ON CONFLICT(user_id,seed_key) DO NOTHING;
   SELECT * INTO creator FROM public.recipe_discovery_creators WHERE user_id=u AND seed_key=spec.seed_key;
   INSERT INTO public.recipe_discovery_sources(user_id,creator_id,url,platform,identity_status)
    VALUES(u,creator.id,spec.url,spec.platform,spec.identity_status) ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN jsonb_build_object('seeded',true);
 ELSIF op='create_creator' THEN
  IF length(coalesce(btrim(p->>'name'),'')) NOT BETWEEN 1 AND 160 OR
    (p-'name'-'url')<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  url:=p->>'url';
  IF url IS NULL OR length(url)>2000 OR url !~ '^https?://' THEN RAISE EXCEPTION 'INVALID_URL';END IF;
  IF (SELECT count(*) FROM public.recipe_discovery_creators WHERE user_id=u)>=30 THEN RAISE EXCEPTION 'CREATOR_LIMIT';END IF;
  INSERT INTO public.recipe_discovery_creators(user_id,name) VALUES(u,btrim(p->>'name')) RETURNING * INTO creator;
  platform:=CASE WHEN url ~ '^https?://([a-z0-9-]+\.)?instagram\.com/' THEN 'instagram'
    WHEN url ~ '^https?://([a-z0-9-]+\.)?tiktok\.com/' THEN 'tiktok' ELSE 'web' END;
  INSERT INTO public.recipe_discovery_sources(user_id,creator_id,url,platform) VALUES(u,creator.id,url,platform);
  result:=jsonb_build_object('creator_id',creator.id);
 ELSIF op='pause_creator' THEN
  IF (p-'creatorId'-'expectedVersion'-'paused')<>'{}'::jsonb OR jsonb_typeof(p->'paused') IS DISTINCT FROM 'boolean'
    OR jsonb_typeof(p->'expectedVersion') IS DISTINCT FROM 'number' OR coalesce(p->>'expectedVersion','') !~ '^[1-9][0-9]*$' THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
  SELECT * INTO creator FROM public.recipe_discovery_creators WHERE id=(p->>'creatorId')::uuid AND user_id=u FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CREATOR_NOT_FOUND';END IF;
  IF creator.version<>(p->>'expectedVersion')::integer THEN RAISE EXCEPTION 'VERSION_CONFLICT';END IF;
  UPDATE public.recipe_discovery_creators SET paused=(p->>'paused')::boolean,version=version+1 WHERE id=creator.id;
  result:=jsonb_build_object('creator_id',creator.id);
 ELSIF op='capture' THEN
  IF (p-'creatorId'-'sourceUrl'-'canonicalUrl'-'sourceHash'-'title'-'description')<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
  SELECT * INTO creator FROM public.recipe_discovery_creators WHERE id=(p->>'creatorId')::uuid AND user_id=u;
  IF NOT FOUND THEN RAISE EXCEPTION 'CREATOR_NOT_FOUND';END IF;
  canonical:=p->>'canonicalUrl';url:=p->>'sourceUrl';
  IF canonical IS NULL OR url IS NULL OR canonical !~ '^https?://[^/@]+([/?]|$)' OR url !~ '^https?://[^/@]+([/?]|$)'
    OR length(canonical)>2000 OR length(url)>2000
    OR private.discovery_url_identity(canonical) IS DISTINCT FROM private.discovery_url_identity(url)
    THEN RAISE EXCEPTION 'INVALID_URL';END IF;
  identity:=private.discovery_url_identity(canonical);
  hash:=left(encode(sha256(convert_to(identity,'UTF8')),'hex'),32);
  IF p->>'sourceHash' IS DISTINCT FROM hash THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
  -- Stable original URL is another dedupe key even for a forged canonical query.
  SELECT * INTO item FROM public.recipe_discovery_items WHERE user_id=u AND (source_hash=hash OR source_url=url);
  IF FOUND THEN result:=jsonb_build_object('item_id',item.id,'duplicate',true);
  ELSE
   IF (SELECT count(*) FROM public.recipe_discovery_items WHERE user_id=u)>=2000 THEN RAISE EXCEPTION 'ITEM_LIMIT';END IF;
   INSERT INTO public.recipe_discovery_items(user_id,creator_id,source_url,canonical_url,source_hash,title,description)
    VALUES(u,creator.id,url,canonical,hash,coalesce(nullif(btrim(p->>'title'),''),'Recette à compléter'),p->>'description')
    RETURNING * INTO item;
   result:=jsonb_build_object('item_id',item.id,'duplicate',false);
   -- An explicit new manual link refreshes the current selection. Historical batches stay intact.
   DELETE FROM public.recipe_discovery_batches WHERE user_id=u AND selection_key=
    to_char(now() AT TIME ZONE 'Europe/Paris','IYYY-IW')||CASE WHEN extract(isodow FROM now() AT TIME ZONE 'Europe/Paris')>=4 THEN '-b' ELSE '-a' END;
  END IF;
 ELSIF op IN ('decision','feedback','prepare_import') THEN
  SELECT * INTO item FROM public.recipe_discovery_items WHERE id=(p->>'itemId')::uuid AND user_id=u FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND';END IF;
  IF op='prepare_import' AND item.import_id IS NOT NULL THEN
   result:=jsonb_build_object('item_id',item.id,'import_id',item.import_id,'replayed',true);
  ELSE
    IF jsonb_typeof(p->'expectedVersion') IS DISTINCT FROM 'number' OR coalesce(p->>'expectedVersion','') !~ '^[1-9][0-9]*$' THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
    expected:=(p->>'expectedVersion')::integer;
   IF expected IS NULL OR item.version<>expected THEN RAISE EXCEPTION 'VERSION_CONFLICT';END IF;
   IF op='decision' THEN
    IF (p-'itemId'-'expectedVersion'-'decision')<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
    decision:=p->>'decision';
    IF decision IS NULL OR decision NOT IN ('keep','pass','not_today') THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
    IF item.import_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.social_recipe_imports WHERE id=item.import_id AND user_id=u AND recipe_id IS NOT NULL) THEN RAISE EXCEPTION 'ALREADY_ADDED';END IF;
    UPDATE public.recipe_discovery_items SET status=CASE decision WHEN 'keep' THEN 'kept' WHEN 'pass' THEN 'passed' ELSE 'snoozed' END,
     snoozed_until=CASE WHEN decision='not_today' THEN now()+interval '3 days' ELSE NULL END,version=version+1,updated_at=now() WHERE id=item.id;
    INSERT INTO public.recipe_discovery_events(user_id,item_id,kind) VALUES(u,item.id,decision);
    result:=jsonb_build_object('item_id',item.id);
   ELSIF op='feedback' THEN
    IF (p-'itemId'-'expectedVersion'-'feedback'-'cooked')<>'{}'::jsonb OR p->'cooked' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'COOKING_REQUIRED';END IF;
    feedback:=p->>'feedback';
    IF feedback IS NULL OR feedback NOT IN ('repeat','dislike','too_long') THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
    IF item.import_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.social_recipe_imports WHERE id=item.import_id AND user_id=u AND recipe_id IS NOT NULL) THEN RAISE EXCEPTION 'RECIPE_REQUIRED';END IF;
    INSERT INTO public.recipe_discovery_events(user_id,item_id,kind,cooked) VALUES(u,item.id,feedback,true);
    UPDATE public.recipe_discovery_items SET version=version+1,updated_at=now() WHERE id=item.id;
    result:=jsonb_build_object('item_id',item.id);
   ELSE
    IF (p-'itemId'-'expectedVersion'-'activeImportCap')<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
    IF item.status<>'kept' THEN RAISE EXCEPTION 'KEEP_REQUIRED';END IF;
    -- The common import quota trigger serializes every capture path and reads
    -- premium entitlement in the DB. activeImportCap cannot change that policy.
    SELECT * INTO imp FROM public.social_recipe_imports WHERE user_id=u AND
     (source_hash=item.source_hash OR private.discovery_url_identity(source_url)=private.discovery_url_identity(item.canonical_url))
     ORDER BY created_at,id LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN
     INSERT INTO public.social_recipe_imports(user_id,platform,source_url,canonical_url,source_hash,status,title,author_name,metadata)
      VALUES(u,CASE WHEN item.source_url ~ '^https?://([a-z0-9-]+\.)?instagram\.com/' THEN 'instagram' WHEN item.source_url ~ '^https?://([a-z0-9-]+\.)?tiktok\.com/' THEN 'tiktok' ELSE 'web' END,
       item.source_url,item.canonical_url,item.source_hash,'captured',item.title,
       (SELECT name FROM public.recipe_discovery_creators WHERE id=item.creator_id AND user_id=u),
       jsonb_build_object('discovery_item_id',item.id,'access_mode','manual','media_rights','none')) RETURNING * INTO imp;
     new_import:=true;
    END IF;
    SELECT * INTO draft FROM public.imported_recipe_drafts WHERE import_id=imp.id AND user_id=u AND is_current FOR UPDATE;
    IF NOT FOUND THEN
     source:=jsonb_build_object('platform',imp.platform,'sourceUrl',imp.source_url,'canonicalUrl',imp.canonical_url,
      'authorName',coalesce(imp.author_name,''),'originalTitle',coalesce(imp.title,item.title),
      'importedAt',to_char(imp.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'extractionMethod','metadata');
     draft_json:=jsonb_build_object('title',item.title,'ingredients','[]'::jsonb,'instructions','[]'::jsonb,'tags','[]'::jsonb,
      'source',source,'confidence',0,'extractionWarnings',jsonb_build_array('Lien conservé sans extraction. Complétez et vérifiez les ingrédients et les étapes sur la source.'));
     INSERT INTO public.imported_recipe_drafts(import_id,user_id,draft_json,version,is_current,source_extraction_method,cost_usd_estimate)
      VALUES(imp.id,u,draft_json,1,true,'metadata',0) RETURNING * INTO draft;
     UPDATE public.social_recipe_imports SET status='needs_review',confidence=0,updated_at=now() WHERE id=imp.id;
    END IF;
    UPDATE public.recipe_discovery_items SET import_id=imp.id,version=version+1,updated_at=now() WHERE id=item.id;
    result:=jsonb_build_object('item_id',item.id,'import_id',imp.id,'duplicate',NOT new_import);
   END IF;
  END IF;
 ELSIF op='selection' THEN
  IF (p-'key'-'itemIds')<>'{}'::jsonb OR jsonb_typeof(p->'itemIds') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'itemIds')>5 THEN RAISE EXCEPTION 'INVALID_COMMAND';END IF;
  key:=to_char(now() AT TIME ZONE 'Europe/Paris','IYYY-IW')||CASE WHEN extract(isodow FROM now() AT TIME ZONE 'Europe/Paris')>=4 THEN '-b' ELSE '-a' END;
  IF p->>'key' IS DISTINCT FROM key THEN RAISE EXCEPTION 'SELECTION_WINDOW_CHANGED';END IF;
  ids:=p->'itemIds';
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(ids) v WHERE NOT EXISTS(SELECT 1 FROM public.recipe_discovery_items i JOIN public.recipe_discovery_creators c ON c.id=i.creator_id AND c.user_id=u WHERE i.id=v::uuid AND i.user_id=u AND NOT c.paused)) THEN RAISE EXCEPTION 'ITEM_NOT_FOUND';END IF;
  INSERT INTO public.recipe_discovery_batches(user_id,selection_key,item_ids) VALUES(u,key,ids)
   ON CONFLICT(user_id,selection_key) DO NOTHING;
  -- Selection changes only at the next window, except an empty batch can be filled.
  UPDATE public.recipe_discovery_batches SET item_ids=ids,selected_at=now() WHERE user_id=u AND selection_key=key AND item_ids='[]'::jsonb AND ids<>'[]'::jsonb;
  SELECT jsonb_build_object('item_ids',item_ids,'selected_at',selected_at) INTO result FROM public.recipe_discovery_batches WHERE user_id=u AND selection_key=key;
  RETURN result;
 ELSE RAISE EXCEPTION 'INVALID_COMMAND';
 END IF;
 INSERT INTO private.recipe_discovery_receipts(user_id,command_id,command,result) VALUES(u,cid,p_command,result);
 RETURN result;
END $fn$;
REVOKE ALL ON FUNCTION private.execute_recipe_discovery(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.execute_recipe_discovery(jsonb) TO authenticated;
CREATE FUNCTION public.execute_recipe_discovery(p_command jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=''
 AS $$ SELECT private.execute_recipe_discovery(p_command) $$;
REVOKE ALL ON FUNCTION public.execute_recipe_discovery(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.execute_recipe_discovery(jsonb) TO authenticated;

-- A save through either canonical alias emits one "added" event in the same transaction.
CREATE FUNCTION private.discovery_import_saved() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NEW.recipe_id IS NOT NULL AND OLD.recipe_id IS DISTINCT FROM NEW.recipe_id THEN
  INSERT INTO public.recipe_discovery_events(user_id,item_id,kind)
   SELECT user_id,id,'added' FROM public.recipe_discovery_items WHERE import_id=NEW.id AND user_id=NEW.user_id
   ON CONFLICT(user_id,item_id) WHERE kind='added' DO NOTHING;
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION private.discovery_import_saved() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER discovery_import_saved AFTER UPDATE OF recipe_id ON public.social_recipe_imports
 FOR EACH ROW EXECUTE FUNCTION private.discovery_import_saved();
NOTIFY pgrst,'reload schema';
COMMIT;
