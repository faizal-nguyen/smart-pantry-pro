-- The assistant keeps the thread of a conversation (audit 2026-11-04).
-- Every memory, profile or retention change still raises the revision, which
-- invalidates caches derived from memory. Only a revocation (a memory forgotten
-- or rejected, history or memory switched off, profile sharing withdrawn,
-- settings deleted) raises the history floor: messages, summaries and session
-- context written before the floor are no longer used. Before, every saved
-- preference hid the whole conversation and dropped the reply of its own turn.
-- Mirrors apps/api/src/services/assistant/MemoryPolicy.ts. Idempotent.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND table_name='assistant_memory_state' AND column_name='history_floor') THEN
    ALTER TABLE public.assistant_memory_state ADD COLUMN history_floor bigint NOT NULL DEFAULT 0;
    -- What is hidden today stays hidden: existing rows start at their revision.
    UPDATE public.assistant_memory_state SET history_floor=revision;
    ALTER TABLE public.assistant_memory_state ADD CONSTRAINT assistant_memory_state_history_floor
      CHECK (history_floor BETWEEN 0 AND revision);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.bump_memory_revision(u uuid,p_revoke boolean) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  INSERT INTO public.assistant_memory_state(user_id,revision,history_floor) VALUES(u,1,CASE WHEN p_revoke THEN 1 ELSE 0 END)
    ON CONFLICT(user_id) DO UPDATE SET revision=public.assistant_memory_state.revision+1,
      history_floor=CASE WHEN p_revoke THEN public.assistant_memory_state.revision+1 ELSE public.assistant_memory_state.history_floor END,
      updated_at=now()
    RETURNING revision INTO r;
  IF p_revoke THEN
    DELETE FROM public.assistant_conversation_summaries WHERE user_id=u;
    DELETE FROM public.assistant_summary_claims WHERE user_id=u;
    DELETE FROM public.assistant_session_context WHERE user_id=u;
  END IF;
  DELETE FROM public.recipe_recommendation_cache WHERE user_id=u;
  RETURN r;
END $$;
-- Callers that do not say otherwise revoke (the previous behaviour).
CREATE OR REPLACE FUNCTION private.bump_memory_revision(u uuid) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  RETURN private.bump_memory_revision(u,true);
END $$;

-- Retention is not a revocation: the conversation in progress stays usable.
CREATE OR REPLACE FUNCTION private.expire_memory_data(u uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE removed integer; changed boolean=false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  PERFORM set_config('smart.memory_expiry','on',true);
  DELETE FROM public.assistant_memory_items WHERE user_id=u AND version>0 AND expires_at<=now();
  PERFORM set_config('smart.memory_expiry','',true);
  DELETE FROM public.assistant_messages WHERE user_id=u AND policy_revision IS NOT NULL AND expires_at<=now();
  GET DIAGNOSTICS removed=ROW_COUNT; changed=removed>0;
  DELETE FROM public.assistant_conversations WHERE user_id=u AND policy_revision IS NOT NULL AND expires_at<=now();
  GET DIAGNOSTICS removed=ROW_COUNT; changed=changed OR removed>0;
  DELETE FROM public.assistant_session_context WHERE user_id=u AND policy_revision IS NOT NULL AND expires_at<=now();
  IF changed THEN
    -- A summary may quote an expired message.
    DELETE FROM public.assistant_conversation_summaries WHERE user_id=u;
    DELETE FROM public.assistant_summary_claims WHERE user_id=u;
    PERFORM private.bump_memory_revision(u,false);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.memory_policy(u uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE privacy jsonb; profile jsonb; pv bigint;
BEGIN
  PERFORM private.expire_memory_data(u);
  SELECT settings INTO privacy FROM public.user_privacy_settings WHERE user_id=u;
  SELECT settings,version INTO profile,pv FROM public.nutrition_profiles WHERE user_id=u;
  RETURN jsonb_build_object('userId',u,'revision',private.memory_revision(u),
    'historyFloor',COALESCE((SELECT history_floor FROM public.assistant_memory_state WHERE user_id=u),0),
    'memoryEnabled',COALESCE(privacy->'assistantMemoryEnabled'='true'::jsonb,false),
    'saveHistory',COALESCE(privacy->'saveHistory'='true'::jsonb,false),
    'shareProfile',COALESCE(profile->'consent'='true'::jsonb AND profile->'shareWithAssistant'='true'::jsonb,false),
    'profileVersion',COALESCE(pv,0));
END $$;

-- Profile edits keep the conversation; withdrawing sharing hides what was said
-- before. Switching history or memory off revokes; switching them on does not.
CREATE OR REPLACE FUNCTION private.invalidate_assistant_context() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.user_id<>NEW.user_id THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF TG_TABLE_NAME='nutrition_profiles' THEN
    PERFORM private.bump_memory_revision(COALESCE(NEW.user_id,OLD.user_id), TG_OP='DELETE' OR (TG_OP='UPDATE'
      AND COALESCE(OLD.settings->'consent'='true'::jsonb AND OLD.settings->'shareWithAssistant'='true'::jsonb,false)
      AND NOT COALESCE(NEW.settings->'consent'='true'::jsonb AND NEW.settings->'shareWithAssistant'='true'::jsonb,false)));
  ELSIF TG_OP='DELETE' THEN
    PERFORM private.bump_memory_revision(OLD.user_id,true);
  ELSIF TG_OP='INSERT'
    OR (OLD.settings->'assistantMemoryEnabled' IS DISTINCT FROM NEW.settings->'assistantMemoryEnabled'
      OR OLD.settings->'saveHistory' IS DISTINCT FROM NEW.settings->'saveHistory'
      OR OLD.settings->'dataRetention' IS DISTINCT FROM NEW.settings->'dataRetention'
      OR OLD.settings->'autoDeleteAfter' IS DISTINCT FROM NEW.settings->'autoDeleteAfter') THEN
    PERFORM private.bump_memory_revision(NEW.user_id, TG_OP='UPDATE' AND (
      (OLD.settings->'assistantMemoryEnabled'='true'::jsonb AND NEW.settings->'assistantMemoryEnabled' IS DISTINCT FROM 'true'::jsonb)
      OR (OLD.settings->'saveHistory'='true'::jsonb AND NEW.settings->'saveHistory' IS DISTINCT FROM 'true'::jsonb)));
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

-- A memory deleted by its retention deadline is not a revocation (see expire_memory_data).
CREATE OR REPLACE FUNCTION private.memory_deleted() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF OLD.semantic_key IS NOT NULL THEN
    INSERT INTO public.assistant_memory_tombstones(user_id,semantic_key) VALUES(OLD.user_id,OLD.semantic_key)
      ON CONFLICT(user_id,semantic_key) DO UPDATE SET deleted_at=now();
  END IF;
  PERFORM private.bump_memory_revision(OLD.user_id,COALESCE(current_setting('smart.memory_expiry',true),'')<>'on');
  RETURN OLD;
END $$;

-- Same command as 20261011184535_v10_assistant_memory.sql, except the revision
-- check and the additions (save, correct, confirm), which no longer revoke.
CREATE OR REPLACE FUNCTION private.execute_memory_command(c jsonb) RETURNS jsonb
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
  -- A command read before the last revocation is stale; later additions are not.
  IF revision<(p->>'historyFloor')::bigint OR revision>(p->>'revision')::bigint THEN RAISE EXCEPTION 'MEMORY_REVISION_CONFLICT'; END IF;
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
          revision=private.bump_memory_revision(u,false);
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
        revision=private.bump_memory_revision(u,false);
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

-- Same artifact writer, except the revision window.
CREATE OR REPLACE FUNCTION private.persist_memory_artifact(u uuid,r bigint,k text,p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE policy jsonb; row_json jsonb; conv uuid; ids uuid[]; coverage text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  policy=private.memory_policy(u);
  -- Written under a revision since the last revocation: still allowed.
  IF policy->>'saveHistory'<>'true' OR r<(policy->>'historyFloor')::bigint OR r>(policy->>'revision')::bigint THEN RETURN NULL; END IF;
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
      (SELECT count(*) FROM public.assistant_messages WHERE user_id=u AND conversation_id=conv AND id=ANY(ids)
      AND policy_revision BETWEEN (policy->>'historyFloor')::bigint AND (policy->>'revision')::bigint)<>cardinality(ids) THEN RAISE EXCEPTION 'INVALID_SUMMARY_COVERAGE'; END IF;
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

REVOKE ALL ON FUNCTION private.bump_memory_revision(uuid,boolean),private.bump_memory_revision(uuid),
  private.expire_memory_data(uuid),private.memory_policy(uuid),private.invalidate_assistant_context(),
  private.memory_deleted(),private.execute_memory_command(jsonb),private.persist_memory_artifact(uuid,bigint,text,jsonb)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.execute_memory_command(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION private.persist_memory_artifact(uuid,bigint,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';

COMMIT;
