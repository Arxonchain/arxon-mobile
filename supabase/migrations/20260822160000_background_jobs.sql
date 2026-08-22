-- P1: Durable background jobs for arena resolve and push blast (Postgres queue).

CREATE TABLE IF NOT EXISTS public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  idempotency_key text,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT background_jobs_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_pending_run
  ON public.background_jobs (run_after, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status
  ON public.background_jobs (job_type, status);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enqueue_background_job(
  p_job_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL,
  p_run_after timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_job_type IS NULL OR length(trim(p_job_type)) = 0 THEN
    RAISE EXCEPTION 'job_type required';
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    INSERT INTO public.background_jobs (job_type, payload, idempotency_key, run_after)
    VALUES (p_job_type, COALESCE(p_payload, '{}'::jsonb), p_idempotency_key, COALESCE(p_run_after, now()))
    ON CONFLICT (idempotency_key) DO UPDATE
      SET updated_at = now()
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.background_jobs WHERE idempotency_key = p_idempotency_key;
    END IF;
    RETURN v_id;
  END IF;

  INSERT INTO public.background_jobs (job_type, payload, run_after)
  VALUES (p_job_type, COALESCE(p_payload, '{}'::jsonb), COALESCE(p_run_after, now()))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_background_jobs(
  p_limit integer DEFAULT 5,
  p_worker_id text DEFAULT 'worker'
)
RETURNS SETOF public.background_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT j.id
    FROM public.background_jobs j
    WHERE j.status = 'pending'
      AND j.run_after <= now()
      AND j.attempts < j.max_attempts
    ORDER BY j.run_after ASC, j.created_at ASC
    LIMIT GREATEST(COALESCE(p_limit, 5), 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.background_jobs j
  SET
    status = 'running',
    locked_at = now(),
    locked_by = COALESCE(NULLIF(trim(p_worker_id), ''), 'worker'),
    attempts = j.attempts + 1,
    updated_at = now()
  FROM picked
  WHERE j.id = picked.id
  RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_background_job(
  p_job_id uuid,
  p_result jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.background_jobs
  SET
    status = 'completed',
    result = p_result,
    last_error = NULL,
    locked_at = NULL,
    locked_by = NULL,
    updated_at = now()
  WHERE id = p_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_background_job(
  p_job_id uuid,
  p_error text,
  p_retry_after_seconds integer DEFAULT 60
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts integer;
  v_max integer;
BEGIN
  SELECT attempts, max_attempts INTO v_attempts, v_max
  FROM public.background_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_attempts >= v_max THEN
    UPDATE public.background_jobs
    SET
      status = 'failed',
      last_error = left(COALESCE(p_error, 'unknown'), 2000),
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
    WHERE id = p_job_id;
  ELSE
    UPDATE public.background_jobs
    SET
      status = 'pending',
      last_error = left(COALESCE(p_error, 'unknown'), 2000),
      run_after = now() + make_interval(secs => GREATEST(COALESCE(p_retry_after_seconds, 60), 5)),
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
    WHERE id = p_job_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_background_job(p_job_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(j)
  FROM public.background_jobs j
  WHERE j.id = p_job_id;
$$;

CREATE OR REPLACE FUNCTION public.release_stale_background_jobs(
  p_stale_minutes integer DEFAULT 15
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.background_jobs
  SET
    status = 'pending',
    locked_at = NULL,
    locked_by = NULL,
    run_after = now(),
    last_error = COALESCE(last_error, '') || ' [stale lock released]',
    updated_at = now()
  WHERE status = 'running'
    AND locked_at IS NOT NULL
    AND locked_at < now() - make_interval(mins => GREATEST(COALESCE(p_stale_minutes, 15), 5));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON TABLE public.background_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.background_jobs TO service_role;

REVOKE ALL ON FUNCTION public.enqueue_background_job(text, jsonb, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_background_job(text, jsonb, text, timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.claim_background_jobs(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_background_jobs(integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.complete_background_job(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_background_job(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.fail_background_job(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fail_background_job(uuid, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.get_background_job(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_background_job(uuid) TO service_role, authenticated;

REVOKE ALL ON FUNCTION public.release_stale_background_jobs(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stale_background_jobs(integer) TO service_role;

-- Safety net: release stuck running jobs every 5 minutes.
SELECT cron.unschedule('release-stale-background-jobs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-stale-background-jobs');

SELECT cron.schedule(
  'release-stale-background-jobs',
  '*/5 * * * *',
  $$SELECT public.release_stale_background_jobs(15);$$
);
