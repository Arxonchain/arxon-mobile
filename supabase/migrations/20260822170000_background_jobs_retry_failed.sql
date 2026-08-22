-- Retry failed background jobs when re-enqueued with the same idempotency key.

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
      SET
        job_type = EXCLUDED.job_type,
        payload = EXCLUDED.payload,
        status = CASE
          WHEN background_jobs.status = 'failed' THEN 'pending'
          WHEN background_jobs.status = 'completed' THEN background_jobs.status
          ELSE background_jobs.status
        END,
        run_after = CASE
          WHEN background_jobs.status = 'failed' THEN now()
          ELSE background_jobs.run_after
        END,
        last_error = CASE
          WHEN background_jobs.status = 'failed' THEN NULL
          ELSE background_jobs.last_error
        END,
        locked_at = CASE
          WHEN background_jobs.status = 'failed' THEN NULL
          ELSE background_jobs.locked_at
        END,
        locked_by = CASE
          WHEN background_jobs.status = 'failed' THEN NULL
          ELSE background_jobs.locked_by
        END,
        updated_at = now()
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
