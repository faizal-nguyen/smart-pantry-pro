-- V10-03C. Existing rows are deliberately not opted in or repaired.
-- All commands and consent/profile changes serialize on the existing owner lock.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE public.assistant_memory_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.assistant_memory_commands (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, command_id uuid NOT NULL,
  request_hash text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, command_id)
);
CREATE TABLE public.assistant_memory_tombstones (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, semantic_key text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, semantic_key)
);
CREATE TABLE public.assistant_summary_claims (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  revision bigint NOT NULL, coverage_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, conversation_id, revision, coverage_hash)
);
ALTER TABLE public.assistant_memory_items
  ADD COLUMN version bigint NOT NULL DEFAULT 0 CHECK(version >= 0),
  ADD COLUMN destination text CHECK(destination IN ('memory','profile','feedback','session')),
  ADD COLUMN payload jsonb,
  ADD COLUMN semantic_key text,
  ADD COLUMN policy_revision bigint,
  ADD COLUMN profile_version bigint;
CREATE UNIQUE INDEX assistant_memory_semantic_unique ON public.assistant_memory_items(user_id,semantic_key)
  WHERE semantic_key IS NOT NULL AND status IN ('active','candidate');
ALTER TABLE public.assistant_conversations ADD COLUMN policy_revision bigint, ADD COLUMN expires_at timestamptz;
ALTER TABLE public.assistant_messages ADD COLUMN policy_revision bigint, ADD COLUMN expires_at timestamptz;
ALTER TABLE public.assistant_session_context ADD COLUMN policy_revision bigint;
ALTER TABLE public.assistant_conversation_summaries ADD COLUMN policy_revision bigint, ADD COLUMN coverage_hash text;
CREATE UNIQUE INDEX assistant_summary_coverage_unique ON public.assistant_conversation_summaries(user_id,conversation_id,policy_revision,coverage_hash)
  WHERE coverage_hash IS NOT NULL;
CREATE INDEX assistant_messages_policy_recent ON public.assistant_messages(user_id,conversation_id,policy_revision,created_at);
CREATE INDEX assistant_memory_expiration ON public.assistant_memory_items(user_id,expires_at) WHERE version>0;
CREATE INDEX assistant_conversation_expiration ON public.assistant_conversations(user_id,expires_at) WHERE policy_revision IS NOT NULL;
CREATE INDEX assistant_message_expiration ON public.assistant_messages(user_id,expires_at) WHERE policy_revision IS NOT NULL;

ALTER TABLE public.assistant_memory_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_memory_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_memory_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_summary_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_state_own ON public.assistant_memory_state FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
CREATE POLICY memory_commands_own ON public.assistant_memory_commands FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
CREATE POLICY memory_tombstones_own ON public.assistant_memory_tombstones FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
CREATE POLICY summary_claims_own ON public.assistant_summary_claims FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
REVOKE ALL ON public.assistant_memory_state,public.assistant_memory_commands,public.assistant_memory_tombstones,public.assistant_summary_claims FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.assistant_memory_state,public.assistant_memory_commands,public.assistant_memory_tombstones,public.assistant_summary_claims TO authenticated;
GRANT ALL ON public.assistant_memory_state,public.assistant_memory_commands,public.assistant_memory_tombstones,public.assistant_summary_claims TO service_role;
REVOKE ALL ON public.assistant_memory_items,public.assistant_conversations,public.assistant_messages,public.assistant_conversation_summaries,public.assistant_session_context FROM PUBLIC,anon;
REVOKE INSERT,UPDATE,DELETE ON public.assistant_memory_items FROM authenticated;
-- Keep the existing profile command contract while moving its privileged body
-- behind an invoker wrapper. Profile clear no longer needs direct client DELETE.
DO $$
DECLARE definition text;
BEGIN
  definition=pg_get_functiondef('public.write_nutrition_profile(jsonb)'::regprocedure);
  definition=replace(definition,'FUNCTION public.write_nutrition_profile(', 'FUNCTION private.write_nutrition_profile(');
  EXECUTE definition;
END $$;
ALTER FUNCTION private.write_nutrition_profile(jsonb) SECURITY DEFINER SET search_path='';
CREATE OR REPLACE FUNCTION public.write_nutrition_profile(p_command jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.write_nutrition_profile(p_command) $$;
REVOKE ALL ON FUNCTION private.write_nutrition_profile(jsonb),public.write_nutrition_profile(jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.write_nutrition_profile(jsonb),public.write_nutrition_profile(jsonb) TO authenticated;
DROP POLICY IF EXISTS v10_memory_delete_own ON public.assistant_memory_items;
GRANT SELECT ON public.assistant_memory_items,public.assistant_conversations,public.assistant_messages,public.assistant_conversation_summaries,public.assistant_session_context TO authenticated;
GRANT ALL ON public.assistant_memory_items,public.assistant_conversations,public.assistant_messages,public.assistant_conversation_summaries,public.assistant_session_context TO service_role;

CREATE FUNCTION private.memory_revision(u uuid) RETURNS bigint
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT COALESCE((SELECT revision FROM public.assistant_memory_state WHERE user_id=u),0)
$$;
CREATE FUNCTION private.bump_memory_revision(u uuid) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  INSERT INTO public.assistant_memory_state(user_id,revision) VALUES(u,1)
    ON CONFLICT(user_id) DO UPDATE SET revision=public.assistant_memory_state.revision+1,updated_at=now()
    RETURNING revision INTO r;
  DELETE FROM public.assistant_conversation_summaries WHERE user_id=u;
  DELETE FROM public.assistant_summary_claims WHERE user_id=u;
  DELETE FROM public.assistant_session_context WHERE user_id=u;
  DELETE FROM public.recipe_recommendation_cache WHERE user_id=u;
  RETURN r;
END $$;
-- Explicit deadlines for new data only. Legacy rows are never implicitly repaired.
CREATE FUNCTION private.memory_retention_days(u uuid) RETURNS integer
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT COALESCE(CASE WHEN COALESCE(settings->>'autoDeleteAfter','') ~ '^[0-9]{1,3}$' THEN
      CASE WHEN (settings->>'autoDeleteAfter')::integer BETWEEN 1 AND 365 THEN (settings->>'autoDeleteAfter')::integer END END,
    CASE WHEN settings->>'dataRetention'='full' THEN NULL
      WHEN settings->>'dataRetention'='minimal' THEN 7 ELSE 30 END)
  FROM (SELECT COALESCE((SELECT settings FROM public.user_privacy_settings WHERE user_id=u),'{}'::jsonb) settings) s
$$;
CREATE FUNCTION private.memory_deadline(u uuid) RETURNS timestamptz
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT now()+make_interval(days=>private.memory_retention_days(u))
$$;
CREATE FUNCTION private.expire_memory_data(u uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE removed integer; changed boolean=false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  DELETE FROM public.assistant_memory_items WHERE user_id=u AND version>0 AND expires_at<=now();
  -- The memory deletion trigger already invalidates its derived contexts.
  DELETE FROM public.assistant_messages WHERE user_id=u AND policy_revision IS NOT NULL AND expires_at<=now();
  GET DIAGNOSTICS removed=ROW_COUNT; changed=removed>0;
  DELETE FROM public.assistant_conversations WHERE user_id=u AND policy_revision IS NOT NULL AND expires_at<=now();
  GET DIAGNOSTICS removed=ROW_COUNT; changed=changed OR removed>0;
  DELETE FROM public.assistant_session_context WHERE user_id=u AND policy_revision IS NOT NULL AND expires_at<=now();
  IF changed THEN PERFORM private.bump_memory_revision(u); END IF;
END $$;
CREATE FUNCTION private.memory_policy(u uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE privacy jsonb; profile jsonb; pv bigint;
BEGIN
  PERFORM private.expire_memory_data(u);
  SELECT settings INTO privacy FROM public.user_privacy_settings WHERE user_id=u;
  SELECT settings,version INTO profile,pv FROM public.nutrition_profiles WHERE user_id=u;
  RETURN jsonb_build_object('userId',u,'revision',private.memory_revision(u),
    'memoryEnabled',COALESCE(privacy->'assistantMemoryEnabled'='true'::jsonb,false),
    'saveHistory',COALESCE(privacy->'saveHistory'='true'::jsonb,false),
    'shareProfile',COALESCE(profile->'consent'='true'::jsonb AND profile->'shareWithAssistant'='true'::jsonb,false),
    'profileVersion',COALESCE(pv,0));
END $$;
CREATE FUNCTION private.read_memory_policy(u uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF u IS NULL OR (auth.uid() IS NOT NULL AND auth.uid()<>u) OR
    (auth.uid() IS NULL AND COALESCE(current_setting('request.jwt.claim.role',true),'')<>'service_role'
      AND current_setting('role',true)<>'service_role') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501';
  END IF;
  RETURN private.memory_policy(u);
END $$;
CREATE FUNCTION public.read_assistant_memory_policy(p_user_id uuid DEFAULT auth.uid()) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.read_memory_policy(p_user_id) $$;

CREATE FUNCTION private.invalidate_assistant_context() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.user_id<>NEW.user_id THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF TG_TABLE_NAME='nutrition_profiles' OR TG_OP='DELETE' OR TG_OP='INSERT'
    OR (OLD.settings->'assistantMemoryEnabled' IS DISTINCT FROM NEW.settings->'assistantMemoryEnabled'
      OR OLD.settings->'saveHistory' IS DISTINCT FROM NEW.settings->'saveHistory'
      OR OLD.settings->'dataRetention' IS DISTINCT FROM NEW.settings->'dataRetention'
      OR OLD.settings->'autoDeleteAfter' IS DISTINCT FROM NEW.settings->'autoDeleteAfter') THEN
    PERFORM private.bump_memory_revision(COALESCE(NEW.user_id,OLD.user_id));
  END IF;
  IF TG_TABLE_NAME='user_privacy_settings' AND TG_OP<>'DELETE' AND private.memory_retention_days(NEW.user_id) IS NOT NULL THEN
    -- A shorter setting can shorten existing deadlines; it never extends them.
    UPDATE public.assistant_memory_items SET expires_at=least(expires_at,private.memory_deadline(NEW.user_id))
      WHERE user_id=NEW.user_id AND version>0 AND (expires_at IS NULL OR expires_at>private.memory_deadline(NEW.user_id));
    UPDATE public.assistant_messages SET expires_at=least(expires_at,private.memory_deadline(NEW.user_id))
      WHERE user_id=NEW.user_id AND policy_revision IS NOT NULL AND (expires_at IS NULL OR expires_at>private.memory_deadline(NEW.user_id));
    UPDATE public.assistant_conversations SET expires_at=least(expires_at,private.memory_deadline(NEW.user_id))
      WHERE user_id=NEW.user_id AND policy_revision IS NOT NULL AND (expires_at IS NULL OR expires_at>private.memory_deadline(NEW.user_id));
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER assistant_privacy_revision AFTER INSERT OR UPDATE OR DELETE ON public.user_privacy_settings
  FOR EACH ROW EXECUTE FUNCTION private.invalidate_assistant_context();
CREATE TRIGGER assistant_profile_revision AFTER INSERT OR UPDATE OR DELETE ON public.nutrition_profiles
  FOR EACH ROW EXECUTE FUNCTION private.invalidate_assistant_context();
CREATE FUNCTION private.memory_deleted() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF OLD.semantic_key IS NOT NULL THEN
    INSERT INTO public.assistant_memory_tombstones(user_id,semantic_key) VALUES(OLD.user_id,OLD.semantic_key)
      ON CONFLICT(user_id,semantic_key) DO UPDATE SET deleted_at=now();
  END IF;
  PERFORM private.bump_memory_revision(OLD.user_id);
  RETURN OLD;
END $$;
CREATE TRIGGER assistant_memory_direct_delete BEFORE DELETE ON public.assistant_memory_items
  FOR EACH ROW EXECUTE FUNCTION private.memory_deleted();

-- Database classifier is authoritative, including for calls bypassing the API.
CREATE FUNCTION private.classify_memory(t text, hint text, explicit boolean) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE n text; field text; val jsonb; operation text='add'; subject text; dest text='memory';
  kind text=COALESCE(hint,'preference'); sensitive text='normal'; content text=t; m text[]; payload jsonb;
BEGIN
  n=trim(regexp_replace(lower(translate(t,'àâäéèêëîïôöùûüç’''-','aaaeeeeiioouuuc   ')),'\s+',' ','g'));
  IF n ~ '(allerg|intoleran|diabet|maladie|medicament|traitement|enceinte|grossesse|diagnostic|asthme|hypertension|sante|poids|sans (gluten|lactose))' THEN
    dest='profile'; sensitive='health_sensitive'; kind='constraint';
    m=regexp_match(n,'(?:allergique|allergie) (?:a la |a l |aux? |au |a )(.+)');
    IF m IS NOT NULL AND n !~ '(pas allergique|ne suis pas)' THEN field='allergies'; val=jsonb_build_array(trim(regexp_replace(m[1],'[.!?;].*$','')));
    ELSE
      m=regexp_match(n,'intoleran(?:t|te|ce) (?:a la |a l |aux? |au |a )(.+)');
      IF m IS NOT NULL THEN field='excludedIngredients'; val=jsonb_build_array(trim(regexp_replace(m[1],'[.!?;].*$','')));
      ELSIF n ~ 'sans gluten' THEN field='diets';val='["gluten_free"]';
      ELSIF n ~ 'sans lactose' THEN field='diets';val='["lactose_free"]';
      END IF;
    END IF;
  ELSIF n ~ '(ce soir|aujourd hui|maintenant|pour ce repas|ce midi|demain)' THEN
    dest='session'; kind='habit'; subject='meal_context';
  ELSIF n ~ '(a refaire|trop long|cette recette|ce plat)' AND n ~ '(a refaire|trop long|aime|adore)' THEN
    dest='feedback'; kind='recipe_feedback'; subject='recipe_feedback';
  ELSIF n ~ '(epice|doux|douce|piquant)' AND n ~ '(prefere|aime|plats|cuisine)' THEN
    subject='taste:spiciness';
    IF n ~ '(doux|douce|pas epice|peu epice|pas piquant)' THEN val='"mild"';content='Je préfère les plats doux.';
    ELSE val='"spicy"';content='Je préfère les plats épicés.'; END IF;
    kind='preference';payload=jsonb_build_object('type','taste','subject','spiciness','value',val);
  ELSE
    IF n ~ '\mvegan\M' THEN field='diets';val='["vegan"]';
    ELSIF n ~ 'vegetari' THEN field='diets';val='["vegetarian"]';
    ELSIF n ~ '\mhalal\M' THEN field='diets';val='["halal"]';
    ELSIF n ~ '(casher|kosher)' THEN field='diets';val='["kosher"]';
    ELSIF n ~ 'sans porc' THEN field='diets';val='["no_pork"]';
    ELSIF n ~ 'sans alcool' THEN field='diets';val='["no_alcohol"]';
    ELSE
      m=regexp_match(n,'(?:habituellement|en general|d habitude|souvent).*?([0-9]{1,3}) (?:minutes|min)\M');
      IF m IS NOT NULL AND m[1]::int BETWEEN 1 AND 600 THEN field='usualTimeMinutes';val=to_jsonb(m[1]::int);operation='set';
      ELSE
        m=regexp_match(n,'(?:habituellement|en general|d habitude|souvent).*?([0-9]{1,2}) (?:personnes|portions)\M');
        IF m IS NOT NULL AND m[1]::int BETWEEN 1 AND 20 THEN field='usualServings';val=to_jsonb(m[1]::int);operation='set';
        ELSE
          m=regexp_match(n,'(?:je n aime pas|je ne veux pas|ne me repropose pas|je veux eviter) (.+)');
          IF m IS NOT NULL THEN field='avoidedIngredients';
          ELSE
            m=regexp_match(n,'(?:j aime|je prefere|j adore) (?:la |les )?cuisines? (.+)');
            IF m IS NOT NULL THEN field='cuisines';
            ELSE
              m=regexp_match(n,'(?:j aime|j adore) (.+)');
              IF m IS NOT NULL THEN field='likedIngredients'; END IF;
            END IF;
          END IF;
          IF m IS NOT NULL THEN val=jsonb_build_array(trim(regexp_replace(m[1],'[.!?;].*$','')));
          ELSE
            m=regexp_match(n,'(?:j ai|je possede|je dispose).*?\m(four|robot|air fryer|airfryer|micro ondes|mixeur|blender)\M');
            IF m IS NOT NULL THEN field='equipment';val=jsonb_build_array(m[1]);
            ELSIF n ~ 'proteine' THEN field='goals';val='["protein"]';
            ELSIF n ~ 'fibre' THEN field='goals';val='["more_fiber"]';
            ELSIF n ~ 'plus de legumes' THEN field='goals';val='["vegetables"]';
            ELSIF n ~ '(anti gaspi|moins gaspiller)' THEN field='goals';val='["anti_waste"]';
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
    IF field IS NOT NULL THEN dest='profile'; END IF;
  END IF;
  IF dest='profile' THEN
    IF jsonb_typeof(val)='array' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(val) x WHERE length(x)>80 OR x ~ ' et (je|j |aussi)'
      OR (sensitive='health_sensitive' AND x ~ '\m(et|ou)\M|,')) THEN
      field=NULL;val=NULL;operation=NULL;
    END IF;
    IF field='goals' THEN kind='diet_goal'; END IF;
    subject=COALESCE(field,'health')||':'||CASE WHEN operation='set' THEN 'usual' ELSE COALESCE(val::text,n) END;
    payload=jsonb_build_object('type','profile','field',field,'operation',CASE WHEN field IS NULL THEN NULL ELSE operation END,'value',val,'subject',COALESCE(field,'health'));
  ELSIF payload IS NULL AND hint IN ('constraint','diet_goal') THEN
    dest='profile';sensitive='health_sensitive';subject='health:'||n;
    payload=jsonb_build_object('type','profile','field',NULL,'operation',NULL,'value',NULL,'subject','health');
  ELSIF payload IS NULL THEN
    subject=COALESCE(subject,CASE WHEN kind='response_style' THEN kind ELSE n END);
    payload=jsonb_build_object('type','note','subject',left(subject,200),'value',t);
  END IF;
  RETURN jsonb_build_object('destination',dest,'kind',kind,'content',content,'payload',payload,'subject',subject,
    'sensitivity',sensitive,'status',CASE WHEN dest='profile' OR dest='feedback' OR NOT explicit THEN 'candidate' ELSE 'active' END);
END $$;

CREATE FUNCTION private.execute_memory_command(c jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid=auth.uid(); cid uuid; op text; expected bigint; revision bigint; fingerprint text;
  previous public.assistant_memory_commands%ROWTYPE; item public.assistant_memory_items%ROWTYPE;
  fact jsonb; key text; p jsonb; outcome text='saved'; reason text; memory_id uuid; v bigint;
  dest text; confirmed_profile_version bigint; settings jsonb; field text; new_value jsonb; written jsonb; explicit boolean;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR c-ARRAY['command_id','expected_version','expected_revision','operation','memory_id','expected_profile_version','payload']<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_MEMORY_COMMAND'; END IF;
  cid=(c->>'command_id')::uuid;expected=(c->>'expected_version')::bigint;revision=(c->>'expected_revision')::bigint;op=c->>'operation';
  IF cid IS NULL OR expected IS NULL OR expected<0 OR revision IS NULL OR revision<0 OR op IS NULL OR op NOT IN ('save','correct','confirm','forget','reject') THEN RAISE EXCEPTION 'INVALID_MEMORY_COMMAND'; END IF;
  IF op IN ('save','correct') AND (jsonb_typeof(c->'payload') IS DISTINCT FROM 'object'
    OR c->'payload'->>'content' IS NULL OR length(c->'payload'->>'content') NOT BETWEEN 1 AND 2000
    OR c->'payload'->>'source' IS NULL OR c->'payload'->>'source' NOT IN ('user_explicit','assistant_inferred')
    OR (c->'payload')-ARRAY['content','kind','source','evidence']<>'{}'::jsonb) THEN RAISE EXCEPTION 'INVALID_MEMORY_COMMAND'; END IF;
  IF op IN ('save','correct') AND c->'payload'->>'kind' IS NOT NULL AND c->'payload'->>'kind' NOT IN ('preference','negative_preference','habit','cooking_style','diet_goal','constraint','recipe_feedback','shopping_pattern','response_style') THEN RAISE EXCEPTION 'INVALID_MEMORY_COMMAND'; END IF;
  IF op IN ('save','correct') AND COALESCE(c->'payload'->'evidence','{}')-ARRAY['message_id','channel','pattern']<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_MEMORY_COMMAND'; END IF;
  IF op IN ('save','correct') AND c->'payload' ? 'evidence' THEN
    IF jsonb_typeof(c->'payload'->'evidence') IS DISTINCT FROM 'object'
      OR (c->'payload'->'evidence' ? 'channel' AND c->'payload'->'evidence'->>'channel' NOT IN ('text','voice','manual','tool'))
      OR (c->'payload'->'evidence' ? 'pattern' AND (jsonb_typeof(c->'payload'->'evidence'->'pattern') IS DISTINCT FROM 'string' OR length(c->'payload'->'evidence'->>'pattern')>80))
      THEN RAISE EXCEPTION 'INVALID_MEMORY_COMMAND'; END IF;
    IF c->'payload'->'evidence'->>'message_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.assistant_messages
      WHERE user_id=u AND id=(c->'payload'->'evidence'->>'message_id')::uuid) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  END IF;
  fingerprint=md5(c::text);
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  SELECT * INTO previous FROM public.assistant_memory_commands WHERE user_id=u AND command_id=cid;
  IF FOUND THEN
    IF previous.request_hash<>fingerprint THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
    RETURN previous.result||'{"replayed":true}'::jsonb;
  END IF;
  p=private.memory_policy(u);
  IF (p->>'revision')::bigint<>revision THEN RAISE EXCEPTION 'MEMORY_REVISION_CONFLICT'; END IF;
  IF op<>'save' THEN
    SELECT * INTO item FROM public.assistant_memory_items WHERE user_id=u AND id=(c->>'memory_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'MEMORY_NOT_FOUND'; END IF;
    IF item.version<>expected THEN RAISE EXCEPTION 'MEMORY_VERSION_CONFLICT'; END IF;
    IF op IN ('correct','confirm') AND item.status NOT IN ('active','candidate') THEN RAISE EXCEPTION 'MEMORY_NOT_FOUND'; END IF;
    memory_id=item.id;dest=item.destination;v=item.version;
  END IF;
  IF op IN ('forget','reject') THEN
    IF item.semantic_key IS NOT NULL THEN
      INSERT INTO public.assistant_memory_tombstones(user_id,semantic_key) VALUES(u,item.semantic_key)
        ON CONFLICT(user_id,semantic_key) DO UPDATE SET deleted_at=now();
    END IF;
    revision=private.bump_memory_revision(u);
    UPDATE public.assistant_memory_items SET status=CASE WHEN op='forget' THEN 'deleted' ELSE 'rejected' END,
      content='',normalized_content=NULL,evidence='{}',payload=NULL,deleted_at=now(),version=version+1,policy_revision=revision
      WHERE user_id=u AND id=memory_id RETURNING version INTO v;
  ELSIF p->>'memoryEnabled'<>'true' THEN outcome='disabled';reason='memory_disabled';
  ELSE
    IF op IN ('save','correct') THEN
      explicit=c->'payload'->>'source'='user_explicit';
      fact=private.classify_memory(c->'payload'->>'content',c->'payload'->>'kind',explicit);
      dest=fact->>'destination';
      key=md5(u::text||':'||dest||':'||(fact->>'kind')||':'||(fact->>'subject'));
      IF dest='session' THEN outcome='not_saved';reason='temporary_context';
      ELSIF dest='feedback' THEN outcome='not_saved';reason='use_recipe_feedback';
      ELSIF NOT explicit AND EXISTS(SELECT 1 FROM public.assistant_memory_tombstones WHERE user_id=u AND semantic_key=key) THEN outcome='not_saved';reason='previously_rejected';
      ELSE
        IF op='save' THEN
          SELECT * INTO item FROM public.assistant_memory_items WHERE user_id=u AND semantic_key=key AND status IN ('active','candidate');
          IF FOUND THEN
            memory_id=item.id;v=item.version;
            IF item.content=fact->>'content' AND item.source=c->'payload'->>'source' THEN
              outcome=CASE WHEN item.status='candidate' THEN 'awaiting_confirmation' ELSE 'saved' END;
            ELSIF item.version<>expected THEN RAISE EXCEPTION 'MEMORY_VERSION_CONFLICT';
            ELSE op='correct'; END IF;
          ELSIF expected<>0 THEN RAISE EXCEPTION 'MEMORY_VERSION_CONFLICT'; END IF;
        END IF;
        IF memory_id IS NULL OR op='correct' THEN
          IF op='correct' AND EXISTS(SELECT 1 FROM public.assistant_memory_items WHERE user_id=u AND semantic_key=key AND status IN ('active','candidate') AND id<>memory_id) THEN RAISE EXCEPTION 'MEMORY_SEMANTIC_CONFLICT'; END IF;
          IF memory_id IS NULL AND (SELECT count(*) FROM public.assistant_memory_items WHERE user_id=u AND status IN ('active','candidate'))>=200 THEN RAISE EXCEPTION 'MEMORY_QUOTA_EXCEEDED'; END IF;
          revision=private.bump_memory_revision(u);
          IF memory_id IS NULL THEN
            INSERT INTO public.assistant_memory_items(user_id,kind,content,normalized_content,status,sensitivity,source,evidence,
              destination,payload,semantic_key,version,policy_revision,approved_at,expires_at)
            VALUES(u,fact->>'kind',fact->>'content',NULL,fact->>'status',fact->>'sensitivity',c->'payload'->>'source',
              COALESCE(c->'payload'->'evidence','{}'),dest,fact->'payload',key,1,revision,
              CASE WHEN fact->>'status'='active' THEN now() END,private.memory_deadline(u)) RETURNING id,version INTO memory_id,v;
          ELSE
            IF item.semantic_key IS DISTINCT FROM key AND item.semantic_key IS NOT NULL THEN
              INSERT INTO public.assistant_memory_tombstones(user_id,semantic_key) VALUES(u,item.semantic_key) ON CONFLICT DO NOTHING;
            END IF;
            UPDATE public.assistant_memory_items SET kind=fact->>'kind',content=fact->>'content',status=fact->>'status',
              sensitivity=fact->>'sensitivity',source=c->'payload'->>'source',evidence=COALESCE(c->'payload'->'evidence','{}'),
              normalized_content=NULL,destination=dest,payload=fact->'payload',semantic_key=key,version=version+1,
              profile_version=NULL,policy_revision=revision,deleted_at=NULL,expires_at=private.memory_deadline(u),
              approved_at=CASE WHEN fact->>'status'='active' THEN now() END
              WHERE id=memory_id AND user_id=u RETURNING version INTO v;
          END IF;
          outcome=CASE WHEN fact->>'status'='candidate' THEN 'awaiting_confirmation' ELSE 'saved' END;
        END IF;
      END IF;
    ELSIF op='confirm' THEN
      -- Legacy rows are reclassified on confirmation; never blindly promoted.
      fact=private.classify_memory(item.content,item.kind,true);dest=fact->>'destination';
      IF dest='profile' THEN
        SELECT n.settings,n.version INTO settings,confirmed_profile_version FROM public.nutrition_profiles n WHERE user_id=u;
        field=fact->'payload'->>'field';
        IF field IS NULL THEN outcome='awaiting_confirmation';reason='open_profile';
        ELSIF settings IS NULL OR settings->>'consent'<>'true' THEN outcome='awaiting_confirmation';reason='profile_consent_required';
        ELSE
          IF c->>'expected_profile_version' IS NULL OR (c->>'expected_profile_version')::bigint<>confirmed_profile_version THEN RAISE EXCEPTION 'PROFILE_VERSION_CONFLICT'; END IF;
          IF fact->'payload'->>'operation'='set' THEN new_value=fact->'payload'->'value';
          ELSE
            SELECT jsonb_agg(value ORDER BY value) INTO new_value FROM
              (SELECT DISTINCT value FROM jsonb_array_elements((settings->field) || (fact->'payload'->'value'))) values_set;
          END IF;
          settings=jsonb_set(settings,ARRAY[field],new_value);
          written=public.write_nutrition_profile(jsonb_build_object('command_id',cid,'expected_version',confirmed_profile_version,'operation','save','settings',settings,'origin','explicit'));
          confirmed_profile_version=(written->>'version')::bigint;
        END IF;
      ELSIF dest IN ('session','feedback') THEN outcome='not_saved';reason='use_destination';
      END IF;
      IF outcome='saved' THEN
        revision=private.bump_memory_revision(u);
        key=md5(u::text||':'||dest||':'||(fact->>'kind')||':'||(fact->>'subject'));
        IF EXISTS(SELECT 1 FROM public.assistant_memory_items WHERE user_id=u AND semantic_key=key AND status IN ('active','candidate') AND id<>memory_id) THEN RAISE EXCEPTION 'MEMORY_SEMANTIC_CONFLICT'; END IF;
        UPDATE public.assistant_memory_items SET status='active',source='user_explicit',approved_at=now(),version=version+1,
          destination=dest,payload=fact->'payload',semantic_key=key,sensitivity=fact->>'sensitivity',expires_at=private.memory_deadline(u),
          policy_revision=revision,profile_version=confirmed_profile_version
          WHERE id=memory_id AND user_id=u RETURNING version INTO v;
      END IF;
    END IF;
  END IF;
  written=jsonb_build_object('command_id',cid,'operation',c->>'operation','status',outcome,'memory_id',memory_id,
    'version',v,'destination',dest,'policy_revision',private.memory_revision(u),'profile_version',confirmed_profile_version,'reason',reason);
  INSERT INTO public.assistant_memory_commands(user_id,command_id,request_hash,result) VALUES(u,cid,fingerprint,written);
  RETURN written;
END $$;
CREATE FUNCTION public.execute_assistant_memory_command(p_command jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.execute_memory_command(p_command) $$;

-- Awaited service-only artifact writes recheck consent/revision inside the owner lock.
CREATE FUNCTION private.persist_memory_artifact(u uuid,r bigint,k text,p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE policy jsonb; row_json jsonb; conv uuid; ids uuid[]; coverage text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  policy=private.memory_policy(u);
  IF policy->>'saveHistory'<>'true' OR (policy->>'revision')::bigint<>r THEN RETURN NULL; END IF;
  IF k='conversation' THEN
    INSERT INTO public.assistant_conversations(user_id,title,mode,metadata,policy_revision,expires_at)
      VALUES(u,p->>'title',COALESCE(p->>'mode','general'),COALESCE(p->'metadata','{}'),r,private.memory_deadline(u))
      RETURNING to_jsonb(assistant_conversations.*) INTO row_json;
    RETURN row_json;
  END IF;
  conv=(p->>'conversation_id')::uuid;
  IF conv IS NULL OR NOT EXISTS(SELECT 1 FROM public.assistant_conversations WHERE id=conv AND user_id=u AND status<>'deleted') THEN RAISE EXCEPTION 'MEMORY_NOT_FOUND'; END IF;
  IF k='message' THEN
    SELECT to_jsonb(m) INTO row_json FROM public.assistant_messages m WHERE id=(p->>'id')::uuid;
    IF row_json IS NOT NULL THEN
      IF row_json->>'user_id'<>u::text OR row_json->>'conversation_id'<>conv::text OR row_json->>'role'<>p->>'role'
        OR row_json->>'content'<>p->>'content' THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
      RETURN row_json;
    END IF;
    INSERT INTO public.assistant_messages(id,conversation_id,user_id,role,content,content_format,metadata,policy_revision,tool_calls,action_log_ids,expires_at)
      VALUES(COALESCE((p->>'id')::uuid,gen_random_uuid()),conv,u,p->>'role',p->>'content',COALESCE(p->>'content_format','text'),
        COALESCE(p->'metadata','{}'),r,COALESCE(p->'tool_calls','[]'),
        COALESCE(ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(p->'action_log_ids')),'{}'::uuid[]),private.memory_deadline(u))
      RETURNING to_jsonb(assistant_messages.*) INTO row_json;
    UPDATE public.assistant_conversations SET expires_at=private.memory_deadline(u) WHERE id=conv AND user_id=u;
    RETURN row_json;
  ELSIF k='session' THEN
    DELETE FROM public.assistant_session_context WHERE user_id=u AND conversation_id=conv AND key=p->>'key';
    INSERT INTO public.assistant_session_context(user_id,conversation_id,key,value,expires_at,policy_revision)
      VALUES(u,conv,p->>'key',p->'value',least((p->>'expires_at')::timestamptz,now()+interval '24 hours'),r)
      RETURNING to_jsonb(assistant_session_context.*) INTO row_json;
    RETURN row_json;
  ELSIF k IN ('summary_claim','summary') THEN
    SELECT array_agg(value::uuid ORDER BY value::uuid) INTO ids FROM jsonb_array_elements_text(p->'covered_message_ids');
    IF COALESCE(cardinality(ids),0)=0 OR cardinality(ids)>100 OR
      (SELECT count(*) FROM public.assistant_messages WHERE user_id=u AND conversation_id=conv AND id=ANY(ids) AND policy_revision=r)<>cardinality(ids) THEN RAISE EXCEPTION 'INVALID_SUMMARY_COVERAGE'; END IF;
    coverage=md5(array_to_string(ids,','));
    IF k='summary_claim' THEN
      INSERT INTO public.assistant_summary_claims(user_id,conversation_id,revision,coverage_hash)
        VALUES(u,conv,r,coverage) ON CONFLICT DO NOTHING RETURNING jsonb_build_object('claimed',true,'coverage_hash',coverage) INTO row_json;
    ELSE
      IF NOT EXISTS(SELECT 1 FROM public.assistant_summary_claims WHERE user_id=u AND conversation_id=conv AND revision=r AND coverage_hash=coverage)
        OR length(p->>'summary')>1600 THEN RAISE EXCEPTION 'INVALID_SUMMARY_COVERAGE'; END IF;
      INSERT INTO public.assistant_conversation_summaries(user_id,conversation_id,summary,covered_message_ids,model_used,policy_revision,coverage_hash)
        VALUES(u,conv,p->>'summary',ids,p->>'model_used',r,coverage) ON CONFLICT DO NOTHING
        RETURNING to_jsonb(assistant_conversation_summaries.*) INTO row_json;
    END IF;
    RETURN row_json;
  END IF;
  RAISE EXCEPTION 'INVALID_MEMORY_ARTIFACT';
END $$;
CREATE FUNCTION public.persist_assistant_memory_artifact(p_user_id uuid,p_revision bigint,p_kind text,p_payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.persist_memory_artifact(p_user_id,p_revision,p_kind,p_payload) $$;

CREATE FUNCTION private.patch_privacy(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid=auth.uid(); merged jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p)<>'object' OR p-ARRAY['hasConsent','consentDate','allowAnalytics','saveHistory','assistantMemoryEnabled','allowImageProcessing','shareAnonymizedData','batterySaver','autoDeleteAfter','dataRetention']<>'{}'::jsonb
    OR EXISTS(SELECT 1 FROM jsonb_each(p) WHERE key IN ('hasConsent','allowAnalytics','saveHistory','assistantMemoryEnabled','allowImageProcessing','shareAnonymizedData','batterySaver') AND jsonb_typeof(value)<>'boolean')
    THEN RAISE EXCEPTION 'INVALID_PRIVACY'; END IF;
  IF (p ? 'dataRetention' AND p->>'dataRetention' NOT IN ('minimal','standard','full'))
    OR (p ? 'autoDeleteAfter' AND (jsonb_typeof(p->'autoDeleteAfter')<>'number' OR p->>'autoDeleteAfter' !~ '^[0-9]{1,3}$' OR (p->>'autoDeleteAfter')::integer NOT BETWEEN 0 AND 365))
    THEN RAISE EXCEPTION 'INVALID_PRIVACY'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  INSERT INTO public.user_privacy_settings(user_id,settings,consent_date) VALUES(u,p,CASE WHEN p->>'hasConsent'='true' THEN now() END)
    ON CONFLICT(user_id) DO UPDATE SET settings=public.user_privacy_settings.settings||p,
      consent_date=CASE WHEN p->>'hasConsent'='true' THEN COALESCE(public.user_privacy_settings.consent_date,now()) ELSE public.user_privacy_settings.consent_date END
    RETURNING settings INTO merged;
  RETURN merged;
END $$;
CREATE FUNCTION public.patch_assistant_privacy_settings(p_patch jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.patch_privacy(p_patch) $$;

-- The recipe interaction and journal entry share one transaction and retry identity.
ALTER TABLE public.cooking_journal_entries ADD COLUMN feedback_command_id uuid, ADD COLUMN feedback_request_hash text;
CREATE UNIQUE INDEX cooking_journal_feedback_identity ON public.cooking_journal_entries(user_id,feedback_command_id)
  WHERE feedback_command_id IS NOT NULL;
CREATE FUNCTION private.record_assistant_recipe_feedback(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid=auth.uid(); cid uuid; prior public.cooking_journal_entries%ROWTYPE;
  entry public.cooking_journal_entries%ROWTYPE; kind text; interaction jsonb; ref jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR p-ARRAY['command_id','recipe_id','recipe_source','recipe_title','outcome','rating','notes','would_cook_again']<>'{}'::jsonb
    OR jsonb_typeof(p->'recipe_title') IS DISTINCT FROM 'string' OR length(p->>'recipe_title') NOT BETWEEN 1 AND 300
    OR (p ? 'outcome' AND p->>'outcome' NOT IN ('loved','liked','ok','disliked','failed'))
    OR (p ? 'rating' AND (jsonb_typeof(p->'rating')<>'number' OR p->>'rating' !~ '^[1-5]$'))
    OR (p ? 'notes' AND (jsonb_typeof(p->'notes')<>'string' OR length(p->>'notes')>2000))
    OR (p ? 'would_cook_again' AND jsonb_typeof(p->'would_cook_again')<>'boolean')
    OR (p ? 'recipe_source' AND p->>'recipe_source' NOT IN ('recipes','user_recipes','recipes_catalog'))
    THEN RAISE EXCEPTION 'INVALID_RECIPE_FEEDBACK'; END IF;
  cid=(p->>'command_id')::uuid;
  IF cid IS NULL THEN RAISE EXCEPTION 'INVALID_RECIPE_FEEDBACK'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  SELECT * INTO prior FROM public.cooking_journal_entries WHERE user_id=u AND feedback_command_id=cid;
  IF FOUND THEN
    IF prior.feedback_request_hash<>md5(p::text) THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
    RETURN jsonb_build_object('status','saved','journal_id',prior.id,'affects_suggestions',prior.adjustments ? 'feedback','replayed',true);
  END IF;
  kind=CASE WHEN lower(COALESCE(p->>'notes','')) ~ 'trop long' THEN 'too_long'
    WHEN p->>'outcome'='disliked' OR p->>'would_cook_again'='false' OR (p->>'rating')::integer<=2 THEN 'dislike'
    WHEN p->>'outcome' IN ('loved','liked') OR p->>'would_cook_again'='true' OR (p->>'rating')::integer>=4 THEN 'repeat' END;
  IF p->>'recipe_id' IS NOT NULL THEN
    ref=jsonb_build_object('id',(p->>'recipe_id')::uuid,'source',COALESCE(p->>'recipe_source','recipes'));
    IF public.resolve_stock_recipe((p->>'recipe_id')::uuid,ref->>'source') IS NULL THEN RAISE EXCEPTION 'RECIPE_NOT_FOUND'; END IF;
    IF kind IS NOT NULL THEN
      interaction=public.record_recommendation_feedback(jsonb_build_object('command_id',cid,'recipe',ref,'feedback',kind));
    END IF;
  END IF;
  INSERT INTO public.cooking_journal_entries(user_id,recipe_id,recipe_title,outcome,rating,notes,would_cook_again,adjustments,feedback_command_id,feedback_request_hash)
    VALUES(u,CASE WHEN ref->>'source'='recipes' THEN (p->>'recipe_id')::uuid END,p->>'recipe_title',p->>'outcome',
      (p->>'rating')::integer,p->>'notes',(p->>'would_cook_again')::boolean,
      CASE WHEN ref IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('recipe_reference',ref) END ||
        CASE WHEN interaction IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('feedback',kind,'interaction_id',interaction->>'id') END,cid,md5(p::text)) RETURNING * INTO entry;
  RETURN jsonb_build_object('status','saved','journal_id',entry.id,'affects_suggestions',interaction IS NOT NULL,'interaction_id',interaction->>'id');
END $$;
CREATE FUNCTION public.record_assistant_recipe_feedback(p_feedback jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.record_assistant_recipe_feedback(p_feedback) $$;
REVOKE ALL ON FUNCTION private.record_assistant_recipe_feedback(jsonb),public.record_assistant_recipe_feedback(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.record_assistant_recipe_feedback(jsonb),public.record_assistant_recipe_feedback(jsonb) TO authenticated;

-- Serialize cache persistence with forget/revocation; a late write cannot retain a stale preference.
CREATE FUNCTION private.guard_memory_cache_version() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.cache_key LIKE 'v10-03c:%' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||NEW.user_id::text,0));
    IF NEW.result_json->>'memory_revision' IS DISTINCT FROM private.memory_revision(NEW.user_id)::text THEN
      RAISE EXCEPTION 'MEMORY_REVISION_CONFLICT';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_memory_cache_version() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER memory_cache_version BEFORE INSERT OR UPDATE ON public.recipe_recommendation_cache
  FOR EACH ROW EXECUTE FUNCTION private.guard_memory_cache_version();

CREATE FUNCTION private.export_assistant_memory() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid=auth.uid(); result jsonb='{}'; t text; rows jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  PERFORM private.expire_memory_data(u);
  FOREACH t IN ARRAY ARRAY['assistant_memory_items','assistant_conversations','assistant_messages','assistant_conversation_summaries',
    'assistant_session_context','assistant_memory_state','assistant_memory_commands','assistant_memory_tombstones','assistant_summary_claims','cooking_journal_entries'] LOOP
    EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM public.%I t WHERE user_id=$1',t) INTO rows USING u;
    result=result||jsonb_build_object(t,rows);
  END LOOP;
  RETURN result;
END $$;
CREATE FUNCTION public.export_assistant_memory() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.export_assistant_memory() $$;
CREATE FUNCTION private.delete_completed_assistant_memory() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    DELETE FROM public.assistant_memory_items WHERE user_id=NEW.user_id;
    DELETE FROM public.assistant_conversations WHERE user_id=NEW.user_id;
    DELETE FROM public.assistant_session_context WHERE user_id=NEW.user_id;
    DELETE FROM public.cooking_journal_entries WHERE user_id=NEW.user_id;
    DELETE FROM public.assistant_memory_commands WHERE user_id=NEW.user_id;
    DELETE FROM public.assistant_memory_tombstones WHERE user_id=NEW.user_id;
    DELETE FROM public.assistant_memory_state WHERE user_id=NEW.user_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_delete_completed_assistant_memory BEFORE UPDATE OF status ON public.data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION private.delete_completed_assistant_memory();

-- No implicit function privileges, including privileged trigger helpers.
REVOKE ALL ON FUNCTION private.memory_revision(uuid),private.bump_memory_revision(uuid),private.memory_policy(uuid),
  private.memory_retention_days(uuid),private.memory_deadline(uuid),private.expire_memory_data(uuid),
  private.read_memory_policy(uuid),private.invalidate_assistant_context(),private.memory_deleted(),
  private.classify_memory(text,text,boolean),private.execute_memory_command(jsonb),
  private.persist_memory_artifact(uuid,bigint,text,jsonb),private.patch_privacy(jsonb),private.export_assistant_memory(),
  private.delete_completed_assistant_memory() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.read_assistant_memory_policy(uuid),public.execute_assistant_memory_command(jsonb),
  public.persist_assistant_memory_artifact(uuid,bigint,text,jsonb),public.patch_assistant_privacy_settings(jsonb),
  public.export_assistant_memory() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.read_memory_policy(uuid),public.read_assistant_memory_policy(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.execute_memory_command(jsonb),public.execute_assistant_memory_command(jsonb),
  private.patch_privacy(jsonb),public.patch_assistant_privacy_settings(jsonb),
  private.export_assistant_memory(),public.export_assistant_memory() TO authenticated;
GRANT EXECUTE ON FUNCTION private.persist_memory_artifact(uuid,bigint,text,jsonb),public.persist_assistant_memory_artifact(uuid,bigint,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
