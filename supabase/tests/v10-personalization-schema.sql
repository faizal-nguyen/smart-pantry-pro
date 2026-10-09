-- Isolated fixtures reconstructed from the existing migrations, never a remote dump.
\ir v10-schema.sql
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END $$;
GRANT USAGE ON SCHEMA public,auth TO service_role;
DROP TABLE public.recipe_recommendation_cache;
\ir ../migrations/20260517100000_recommendation_engine_tables.sql
CREATE TABLE public.user_meal_preferences(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id),
  allergies text[] DEFAULT '{}',dietary_restrictions text[] DEFAULT '{}',cuisine_preferences text[] DEFAULT '{}',
  cooking_skill_level text,max_prep_time integer,max_cook_time integer,family_size integer,equipment_available text[] DEFAULT '{}');
ALTER TABLE public.user_meal_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY preferences_own ON public.user_meal_preferences TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE TABLE public.assistant_memory_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL,content text NOT NULL,status text DEFAULT 'active',sensitivity text DEFAULT 'normal',created_at timestamptz DEFAULT now());
ALTER TABLE public.assistant_memory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_own ON public.assistant_memory_items TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE TABLE public.assistant_action_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),tool text NOT NULL,result jsonb);
ALTER TABLE public.assistant_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY action_receipt_read_own ON public.assistant_action_log FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE TABLE public.scan_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id));
CREATE TABLE public.analytics_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id));
\ir ../migrations/20260517081500_process_deletion_requests.sql
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.user_meal_preferences,public.assistant_memory_items TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.recommendation_events,public.recipe_interactions,public.recipe_recommendation_cache TO authenticated;
GRANT SELECT,INSERT ON public.data_deletion_requests TO authenticated;
