-- Incident fix (2026-08-08): cron.job_run_details had grown unbounded to 214MB / 115k+ rows
-- (going back to May), forcing expensive autovacuum I/O that contributed to the project's
-- disk I/O budget exhaustion and CPU/RAM saturation. Pruned historical rows directly via
-- the SQL editor during the incident; this migration just codifies the ongoing retention job
-- so the table can never bloat like this again.

SELECT cron.schedule(
  'cron-job-run-details-cleanup',
  '17 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE start_time < now() - interval '3 days';$$
);
