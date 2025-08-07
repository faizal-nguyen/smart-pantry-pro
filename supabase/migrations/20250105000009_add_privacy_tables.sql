-- Privacy and consent management tables

-- User privacy settings
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  settings JSONB NOT NULL DEFAULT '{
    "hasConsent": false,
    "allowAnalytics": false,
    "saveHistory": true,
    "allowImageProcessing": true,
    "shareAnonymizedData": false,
    "batterySaver": false,
    "dataRetention": "standard"
  }'::jsonb,
  consent_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan history (optional, based on user settings)
CREATE TABLE IF NOT EXISTS public.scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('single', 'multi', 'social')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events (anonymized)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  anonymized BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data deletion requests
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_privacy_settings_user ON public.user_privacy_settings(user_id);
CREATE INDEX idx_scan_history_user_date ON public.scan_history(user_id, created_at DESC);
CREATE INDEX idx_analytics_user_date ON public.analytics_events(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Privacy settings policies
CREATE POLICY "Users can view own privacy settings" ON public.user_privacy_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings" ON public.user_privacy_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings" ON public.user_privacy_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Scan history policies (only if user has enabled history)
CREATE POLICY "Users can view own scan history" ON public.scan_history
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.user_privacy_settings 
      WHERE user_id = auth.uid() 
      AND (settings->>'saveHistory')::boolean = true
    )
  );

CREATE POLICY "Users can insert own scan history" ON public.scan_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_privacy_settings 
      WHERE user_id = auth.uid() 
      AND (settings->>'saveHistory')::boolean = true
    )
  );

-- Analytics policies (anonymized only)
CREATE POLICY "Service role can insert analytics" ON public.analytics_events
  FOR INSERT TO service_role
  WITH CHECK (anonymized = true);

-- Data deletion policies
CREATE POLICY "Users can request own data deletion" ON public.data_deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own deletion requests" ON public.data_deletion_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Functions for GDPR compliance

-- Delete all user data
CREATE OR REPLACE FUNCTION delete_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete from all tables
  DELETE FROM public.inventory WHERE user_id = p_user_id;
  DELETE FROM public.recipes WHERE user_id = p_user_id;
  DELETE FROM public.shopping_list WHERE user_id = p_user_id;
  DELETE FROM public.scan_history WHERE user_id = p_user_id;
  DELETE FROM public.analytics_events WHERE user_id = p_user_id;
  DELETE FROM public.user_privacy_settings WHERE user_id = p_user_id;
  
  -- Log deletion request as completed
  UPDATE public.data_deletion_requests 
  SET status = 'completed', completed_at = NOW()
  WHERE user_id = p_user_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Export user data for GDPR
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'export_date', NOW(),
    'inventory', (SELECT jsonb_agg(row_to_json(i.*)) FROM public.inventory i WHERE i.user_id = p_user_id),
    'recipes', (SELECT jsonb_agg(row_to_json(r.*)) FROM public.recipes r WHERE r.user_id = p_user_id),
    'shopping_list', (SELECT jsonb_agg(row_to_json(s.*)) FROM public.shopping_list s WHERE s.user_id = p_user_id),
    'scan_history', (SELECT jsonb_agg(row_to_json(h.*)) FROM public.scan_history h WHERE h.user_id = p_user_id),
    'privacy_settings', (SELECT row_to_json(p.*) FROM public.user_privacy_settings p WHERE p.user_id = p_user_id)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-delete old data based on retention settings
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete scan history older than retention period
  DELETE FROM public.scan_history h
  WHERE EXISTS (
    SELECT 1 FROM public.user_privacy_settings s
    WHERE s.user_id = h.user_id
    AND (
      (s.settings->>'dataRetention' = 'minimal' AND h.created_at < NOW() - INTERVAL '7 days') OR
      (s.settings->>'dataRetention' = 'standard' AND h.created_at < NOW() - INTERVAL '30 days')
    )
  );
  
  -- Delete old analytics (90 days max)
  DELETE FROM public.analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (requires pg_cron)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');