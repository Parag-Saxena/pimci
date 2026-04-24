-- Re-schedule the publish-due cron job with the new x-cron-secret header.
-- Uses Vault to read the CRON_SECRET that the user just set.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any prior version of this job (ignore if it doesn't exist yet).
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'publish-due-posts';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

-- Schedule a new version that sends the cron secret header.
SELECT cron.schedule(
  'publish-due-posts',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--677ca6d3-5807-4393-a79e-f69705e1daf2.lovable.app/api/public/cron/publish-due',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);