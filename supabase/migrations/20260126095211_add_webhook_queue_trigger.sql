-- Migration: Add trigger to process webhook queue immediately on INSERT
--
-- This trigger fires when a new item is added to webhook_queue and calls
-- the Vercel queue processor endpoint via pg_net (async HTTP).
--
-- Prerequisites (do these in Supabase Dashboard BEFORE deploying):
-- 1. Enable pg_net extension: Database → Extensions → pg_net
-- 2. Store secrets in Vault (SQL Editor):
--    SELECT vault.create_secret('your-cron-secret', 'cron_secret', 'Bearer token for Vercel cron');
--    SELECT vault.create_secret('https://your-app.vercel.app', 'vercel_app_url', 'Vercel URL');

-- Trigger function: calls Vercel queue processor via pg_net
CREATE OR REPLACE FUNCTION trigger_queue_processor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cron_secret TEXT;
  v_vercel_url TEXT;
BEGIN
  -- Get secrets from Vault
  SELECT decrypted_secret INTO v_cron_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  SELECT decrypted_secret INTO v_vercel_url
  FROM vault.decrypted_secrets WHERE name = 'vercel_app_url';

  -- Skip if secrets not configured (allows local dev without trigger)
  IF v_cron_secret IS NULL OR v_vercel_url IS NULL THEN
    RAISE WARNING 'Queue processor secrets not configured in Vault - skipping trigger';
    RETURN NEW;
  END IF;

  -- Fire async HTTP request (does not block the INSERT)
  PERFORM net.http_get(
    url := v_vercel_url || '/api/cron/process-queue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_cron_secret
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger on webhook_queue INSERT
CREATE TRIGGER on_webhook_queue_insert
  AFTER INSERT ON webhook_queue
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_processor();

-- Documentation
COMMENT ON FUNCTION trigger_queue_processor() IS
  'Triggers Vercel queue processor immediately when webhooks are queued. Uses pg_net for async HTTP.';
