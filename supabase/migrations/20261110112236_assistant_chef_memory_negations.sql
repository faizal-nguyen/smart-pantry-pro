-- Reclassify new commands and confirmations only; existing memories are not rewritten.
CREATE OR REPLACE FUNCTION private.classify_memory(t text, hint text, explicit boolean) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE n text; field text; val jsonb; operation text='add'; subject text; dest text='memory';
  kind text=COALESCE(hint,'preference'); sensitive text='normal'; content text=t; m text[]; payload jsonb;
BEGIN
  n=trim(regexp_replace(lower(translate(t,'àâäéèêëîïôöùûüç’''-','aaaeeeeiioouuuc   ')),'\s+',' ','g'));
  -- Third-party statements must never become this account's durable profile.
  IF n ~ '^(?:(?:souviens toi|retiens|memorise) (?:que )?)?(?:mon|ma|mes|son|sa|ses|ton|ta|tes) \S+ (?:est|sont|aime|adore|prefere)\M' THEN
    RETURN jsonb_build_object('destination','session','kind','habit','content',t,'subject','third_party',
      'payload',jsonb_build_object('type','note','subject','third_party','value',t),'sensitivity','normal','status','candidate');
  END IF;
  -- A retraction requires a manual profile review, never an additive positive diet.
  IF n ~ '\m(pas|plus|jamais|non)\s+(?:\S+\s+)?(vegan\w*|vegetari\w*|halal|casher|kosher|allergique|intolerant\w*)\M' THEN
    RETURN jsonb_build_object('destination','profile','kind',CASE WHEN n ~ '(allerg|intoleran)' THEN 'constraint' ELSE 'preference' END,'content',t,'subject','health:'||n,
      'payload',jsonb_build_object('type','profile','field',NULL,'operation',NULL,'value',NULL,'subject','health'),
      'sensitivity',CASE WHEN n ~ '(allerg|intoleran)' THEN 'health_sensitive' ELSE 'normal' END,'status','candidate');
  END IF;
  IF n ~ '(\m(pas|jamais)\M.{0,24}\m(doux|douce)\M|\m(n|ne) \w+(?: \w+){0,2} plus\M.{0,24}\m(doux|douce)\M)' AND n ~ '(prefere|aime|plats|cuisine)' THEN
    RETURN jsonb_build_object('destination','memory','kind','preference','content',t,'subject','spiciness_review',
      'payload',jsonb_build_object('type','note','subject','spiciness_review','value',t),'sensitivity','normal','status','candidate');
  END IF;
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
    IF n ~ '(doux|douce)' OR n ~ '(\m(pas|jamais|peu|moins)\M.{0,24}\m(epice\w*|piquant\w*)\M|\m(n|ne) \w+(?: \w+){0,2} plus\M.{0,24}\m(epice\w*|piquant\w*)\M)' THEN val='"mild"';content='Je préfère les plats doux.';
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
  IF dest='profile' AND field='diets' THEN
    SELECT jsonb_agg(code ORDER BY ord) INTO val FROM (VALUES
      (1,'vegan','\mvegan\M'),(2,'vegetarian','\mvegetari\w*\M'),
      (3,'gluten_free','sans gluten'),(4,'lactose_free','sans lactose'),
      (5,'halal','\mhalal\M'),(6,'kosher','\m(casher|kosher)\M'),
      (7,'no_pork','sans porc'),(8,'no_alcohol','sans alcool')
    ) AS diets(ord,code,pattern) WHERE n ~ pattern;
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
REVOKE ALL ON FUNCTION private.classify_memory(text,text,boolean) FROM PUBLIC,anon,authenticated;

-- Accent-insensitive literal search over every authorized retained conversation.
CREATE OR REPLACE FUNCTION private.assistant_search_text(t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT regexp_replace(lower(translate(replace(replace(t,'œ','oe'),'æ','ae'),
    'àâäéèêëîïôöùûüç’''','aaaeeeeiioouuuc  ')),'\s+',' ','g')
$$;
REVOKE ALL ON FUNCTION private.assistant_search_text(text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.search_assistant_model_history(p_user_id uuid,p_revision bigint,p_query text,p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE floor_revision bigint; current_revision bigint; enabled boolean;
BEGIN
  IF p_user_id IS NULL OR (auth.uid() IS NOT NULL AND auth.uid()<>p_user_id) OR
    (auth.uid() IS NULL AND COALESCE(current_setting('request.jwt.claim.role',true),'')<>'service_role'
      AND current_setting('role',true)<>'service_role') THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  SELECT revision,history_floor INTO current_revision,floor_revision FROM public.assistant_memory_state WHERE user_id=p_user_id;
  SELECT COALESCE(settings->'saveHistory'='true'::jsonb,false) INTO enabled FROM public.user_privacy_settings WHERE user_id=p_user_id;
  IF enabled IS DISTINCT FROM true OR current_revision IS DISTINCT FROM p_revision OR length(trim(p_query))<1 OR length(p_query)>200 THEN RETURN '[]'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('source',source,'record',record) ORDER BY created_at DESC,id DESC) FROM (
    SELECT 'message' AS source,to_jsonb(m) AS record,m.created_at,m.id
    FROM public.assistant_messages m JOIN public.assistant_conversations c ON c.id=m.conversation_id AND c.user_id=m.user_id
    WHERE m.user_id=p_user_id AND c.status<>'deleted' AND (c.expires_at IS NULL OR c.expires_at>now())
      AND (m.expires_at IS NULL OR m.expires_at>now()) AND m.policy_revision BETWEEN floor_revision AND current_revision
      AND strpos(private.assistant_search_text(m.content),private.assistant_search_text(p_query))>0
    UNION ALL
    SELECT 'summary',to_jsonb(s),s.created_at,s.id
    FROM public.assistant_conversation_summaries s JOIN public.assistant_conversations c ON c.id=s.conversation_id AND c.user_id=s.user_id
    WHERE s.user_id=p_user_id AND c.status<>'deleted' AND (c.expires_at IS NULL OR c.expires_at>now())
      AND s.policy_revision BETWEEN floor_revision AND current_revision
      AND strpos(private.assistant_search_text(s.summary),private.assistant_search_text(p_query))>0
    ORDER BY created_at DESC,id DESC LIMIT least(100,greatest(1,p_limit))
  ) found),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.search_assistant_model_history(uuid,bigint,text,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_assistant_model_history(uuid,bigint,text,int) TO service_role;
