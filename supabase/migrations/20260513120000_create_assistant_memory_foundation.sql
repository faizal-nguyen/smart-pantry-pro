-- PRP-223 PR1 — Assistant Memory Foundation (schema, indexes, RLS).
--
-- Creates the data layer that subsequent PRs (MemoryService, ContextBuilder,
-- MemoryExtractor, frontend hooks) will consume:
--   * assistant_conversations          (PRP-223 §6.1)
--   * assistant_messages               (§6.2, user_id denormalised for direct RLS)
--   * assistant_memory_items           (§6.3, soft-delete via status/deleted_at)
--   * assistant_conversation_summaries (§6.4)
--   * assistant_session_context        (§6.5)
--   * cooking_journal_entries          (§6.6)
--
-- Reuses the existing helper `public.update_updated_at_column()` (defined by
-- earlier migrations such as 20250803063814_*, 20250804120000_*, 20250830000002_*)
-- for the three tables that carry an `updated_at` column.
--
-- RLS pattern follows `assistant_action_log`:
--   * ENABLE ROW LEVEL SECURITY on each table.
--   * SELECT policy `auth.uid() = user_id` (denormalised user_id on each row).
--   * No INSERT/UPDATE/DELETE policy → writes happen exclusively through the
--     service-role client (`supabaseAdmin`). PR2 will wire this in MemoryService.
--
-- This migration is idempotent: `IF NOT EXISTS`, `DROP ... IF EXISTS` everywhere.
-- It introduces no runtime consumers; PR1 is purely the data layer.

-- ============================================================================
-- 1. Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  mode TEXT NOT NULL DEFAULT 'general'
    CHECK (mode IN ('general','kitchen','shopping','inventory','recipes','nutrition','cooking')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived','deleted')),
  last_message_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  content_format TEXT NOT NULL DEFAULT 'text'
    CHECK (content_format IN ('text','transcript','tool_result','summary')),
  audio_transcript TEXT,
  tool_calls JSONB NOT NULL DEFAULT '[]',
  action_log_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assistant_memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'preference',
    'negative_preference',
    'habit',
    'cooking_style',
    'diet_goal',
    'constraint',
    'recipe_feedback',
    'shopping_pattern',
    'response_style'
  )),
  scope TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global','recipe','ingredient','product','conversation','temporary')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('candidate','active','rejected','deleted')),
  -- subject_type / subject_id is intentionally not a FK: subject_type can
  -- target recipes, ingredients or products, and these live in different
  -- tables. PRP-223 §6.3 documents this as a deliberate trade-off; orphan
  -- memories after a subject delete are filtered by application code.
  subject_type TEXT,
  subject_id UUID,
  content TEXT NOT NULL,
  normalized_content TEXT,
  confidence NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  sensitivity TEXT NOT NULL DEFAULT 'normal'
    CHECK (sensitivity IN ('normal','personal','health_sensitive')),
  source TEXT NOT NULL DEFAULT 'assistant_inferred'
    CHECK (source IN ('user_explicit','assistant_inferred','recipe_feedback','imported','system')),
  evidence JSONB NOT NULL DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assistant_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  covered_message_ids UUID[] NOT NULL DEFAULT '{}',
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assistant_session_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cooking_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID,
  recipe_title TEXT NOT NULL,
  cooked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  outcome TEXT CHECK (outcome IN ('loved','liked','ok','disliked','failed')),
  notes TEXT,
  substitutions JSONB NOT NULL DEFAULT '[]',
  adjustments JSONB NOT NULL DEFAULT '{}',
  would_cook_again BOOLEAN,
  created_from_message_id UUID REFERENCES public.assistant_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Indexes (PRP-223 §7)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_recent
  ON public.assistant_conversations(user_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation_created
  ON public.assistant_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_assistant_memory_user_kind
  ON public.assistant_memory_items(user_id, kind, status);

-- Partial index for response_style memories: read on every LLM turn by
-- ContextBuilder, so worth its own narrow index.
CREATE INDEX IF NOT EXISTS idx_assistant_memory_response_style
  ON public.assistant_memory_items(user_id)
  WHERE kind = 'response_style' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_assistant_memory_user_subject
  ON public.assistant_memory_items(user_id, subject_type, subject_id)
  WHERE subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assistant_session_context_expiry
  ON public.assistant_session_context(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_cooking_journal_user_recent
  ON public.cooking_journal_entries(user_id, cooked_at DESC);

-- ============================================================================
-- 3. Triggers `updated_at` (PRP-223 §6.7)
-- ============================================================================

DROP TRIGGER IF EXISTS update_assistant_conversations_updated_at
  ON public.assistant_conversations;
CREATE TRIGGER update_assistant_conversations_updated_at
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assistant_memory_items_updated_at
  ON public.assistant_memory_items;
CREATE TRIGGER update_assistant_memory_items_updated_at
  BEFORE UPDATE ON public.assistant_memory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cooking_journal_entries_updated_at
  ON public.cooking_journal_entries;
CREATE TRIGGER update_cooking_journal_entries_updated_at
  BEFORE UPDATE ON public.cooking_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. RLS (PRP-223 §7)
-- ============================================================================
--
-- SELECT-only policies via `auth.uid() = user_id`. Writes (INSERT/UPDATE/DELETE)
-- go through `supabaseAdmin` (service-role) which bypasses RLS. PR2 (MemoryService)
-- will enforce user scoping in application code with explicit `user_id` filters.

ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assistant_conversations_select_own ON public.assistant_conversations;
CREATE POLICY assistant_conversations_select_own ON public.assistant_conversations
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assistant_messages_select_own ON public.assistant_messages;
CREATE POLICY assistant_messages_select_own ON public.assistant_messages
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.assistant_memory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assistant_memory_items_select_own ON public.assistant_memory_items;
CREATE POLICY assistant_memory_items_select_own ON public.assistant_memory_items
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.assistant_conversation_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assistant_conversation_summaries_select_own ON public.assistant_conversation_summaries;
CREATE POLICY assistant_conversation_summaries_select_own ON public.assistant_conversation_summaries
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.assistant_session_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assistant_session_context_select_own ON public.assistant_session_context;
CREATE POLICY assistant_session_context_select_own ON public.assistant_session_context
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.cooking_journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cooking_journal_entries_select_own ON public.cooking_journal_entries;
CREATE POLICY cooking_journal_entries_select_own ON public.cooking_journal_entries
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Reload PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
