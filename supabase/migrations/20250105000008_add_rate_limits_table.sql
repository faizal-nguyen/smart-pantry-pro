-- Create rate_limits table for API rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  reset_time BIGINT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for cleanup queries
CREATE INDEX idx_rate_limits_reset_time ON public.rate_limits(reset_time);

-- Add RLS policies
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create AI interactions table for analytics
CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('text', 'voice', 'visual')),
  message_length INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for analytics queries
CREATE INDEX idx_ai_interactions_user_timestamp ON public.ai_interactions(user_id, timestamp);

-- RLS for ai_interactions
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can insert their own interactions
CREATE POLICY "Users can insert own interactions" ON public.ai_interactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only service role can read interactions (for analytics)
CREATE POLICY "Service role can read all interactions" ON public.ai_interactions
  FOR SELECT TO service_role
  USING (true);

-- Function to clean up expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE reset_time < EXTRACT(EPOCH FROM NOW()) * 1000;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_expired_rate_limits();');