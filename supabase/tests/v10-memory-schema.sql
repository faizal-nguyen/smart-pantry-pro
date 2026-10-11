-- Fictitious owners only. Use in a newly created disposable database.
\ir v10-personalization-schema.sql
DROP TABLE public.assistant_memory_items;
DROP TABLE public.cooking_journal_entries;
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now();RETURN NEW;END $$;
\ir ../migrations/20260513120000_create_assistant_memory_foundation.sql
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT,DELETE ON public.assistant_memory_items TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.user_privacy_settings TO authenticated;
GRANT ALL ON public.user_privacy_settings TO service_role;
