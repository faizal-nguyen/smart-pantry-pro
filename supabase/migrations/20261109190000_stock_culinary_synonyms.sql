-- Match culinary synonyms consistently in previews and stock withdrawals.
-- No stock data is rewritten. SECURITY INVOKER and existing grants are preserved.
BEGIN;

CREATE OR REPLACE FUNCTION public.stock_ingredient_match_rank(p_ingredient text,p_product text) RETURNS integer
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_same text:=public.stock_normalize_name(p_ingredient);
  v_a text[]:=public.stock_name_tokens(p_ingredient); v_b text[]:=public.stock_name_tokens(p_product); v_extra text[];
  v_alias text[];
BEGIN
  IF v_same<>'' AND v_same=public.stock_normalize_name(p_product) THEN RETURN 1; END IF;
  -- Only the synonym prefix changes; product forms and descriptive suffixes remain.
  FOREACH v_alias SLICE 1 IN ARRAY ARRAY[ARRAY['oignon','vert'],ARRAY['spring','onion']] LOOP
    IF v_a[1:2]=v_alias THEN v_a:=ARRAY['oignon','nouveau'] || v_a[3:cardinality(v_a)]; END IF;
    IF v_b[1:2]=v_alias THEN v_b:=ARRAY['oignon','nouveau'] || v_b[3:cardinality(v_b)]; END IF;
  END LOOP;
  IF cardinality(v_a)=0 OR cardinality(v_a)>cardinality(v_b) THEN RETURN 0; END IF;
  IF v_a=v_b THEN RETURN 1; END IF;
  IF cardinality(v_a)=cardinality(v_b) OR v_b[1:cardinality(v_a)] IS DISTINCT FROM v_a THEN RETURN 0; END IF;
  v_extra:=v_b[cardinality(v_a)+1:cardinality(v_b)];
  IF v_extra[1]=ANY(ARRAY['de','d','du','des','a','au','aux','en','l','la','le','les'])
    AND NOT array_to_string(v_a || v_extra[1:2],' ')=ANY(ARRAY['sel de mer','sel de guerande','sucre en poudre','sucre de canne','poivre en grain']) THEN RETURN 0; END IF;
  IF v_extra && ARRAY['concentre','sucree','seche','sechee','deshydrate','deshydratee','fume','fumee',
    'semoule','caramelise','caramelisee','moulu','moulue','granule','granulee','confit','confite','frit','frite'] THEN RETURN 0; END IF;
  RETURN 2;
END $$;

COMMIT;
