-- Discovery test supplement to v10-schema.sql. Disposable local DB only.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'service_role')
$$;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated,anon;
ALTER TABLE public.products ADD COLUMN normalized_name text;
UPDATE public.products SET normalized_name=lower(unaccent(name));
\ir ../migrations/20260507000000_create_social_recipe_imports.sql
\ir ../migrations/20260507120000_recipes_source_columns.sql
GRANT SELECT,INSERT,UPDATE,DELETE ON public.social_recipe_imports,public.imported_recipe_drafts TO authenticated;
