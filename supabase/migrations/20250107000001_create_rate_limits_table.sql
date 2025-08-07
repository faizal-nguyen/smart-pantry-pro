-- Create rate limits table for API rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start BIGINT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);

-- Add cleanup policy to remove old entries (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < (EXTRACT(EPOCH FROM NOW()) * 1000 - 86400000);
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run every hour
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *', -- Every hour
  'SELECT cleanup_old_rate_limits();'
);