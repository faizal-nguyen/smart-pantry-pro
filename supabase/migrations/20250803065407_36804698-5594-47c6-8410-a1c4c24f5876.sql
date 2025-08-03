-- Enable extensions for cron functionality
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule automatic cleanup of purchased items older than 24 hours
-- Runs every day at 2 AM
SELECT cron.schedule(
  'cleanup-shopping-list-daily',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://jwoxacnflphclslpqfzs.supabase.co/functions/v1/cleanup-shopping-list',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);