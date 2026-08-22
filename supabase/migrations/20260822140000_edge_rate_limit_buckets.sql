-- P1: Durable edge rate limits (Postgres-backed; shared across isolates).

CREATE TABLE IF NOT EXISTS public.edge_rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  window_start_ms bigint NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edge_rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_edge_rate_limit_buckets_updated
  ON public.edge_rate_limit_buckets (updated_at);

CREATE OR REPLACE FUNCTION public.check_edge_rate_limit(
  p_bucket_key text,
  p_max_requests integer,
  p_window_ms bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_ms bigint;
  v_window_start bigint;
  v_count integer;
  v_reset_at bigint;
BEGIN
  IF p_bucket_key IS NULL OR length(trim(p_bucket_key)) = 0 THEN
    RAISE EXCEPTION 'bucket_key required';
  END IF;

  v_now_ms := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;

  SELECT window_start_ms, hit_count
  INTO v_window_start, v_count
  FROM public.edge_rate_limit_buckets
  WHERE bucket_key = p_bucket_key
  FOR UPDATE;

  IF NOT FOUND OR (v_now_ms - v_window_start) >= p_window_ms THEN
    v_window_start := v_now_ms;
    v_count := 0;
    INSERT INTO public.edge_rate_limit_buckets (bucket_key, window_start_ms, hit_count, updated_at)
    VALUES (p_bucket_key, v_window_start, 0, now())
    ON CONFLICT (bucket_key) DO UPDATE
      SET window_start_ms = EXCLUDED.window_start_ms,
          hit_count = 0,
          updated_at = now();
  END IF;

  v_reset_at := v_window_start + p_window_ms;

  IF v_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_reset_at,
      'retry_after_ms', GREATEST(0, v_reset_at - v_now_ms)
    );
  END IF;

  UPDATE public.edge_rate_limit_buckets
  SET hit_count = hit_count + 1, updated_at = now()
  WHERE bucket_key = p_bucket_key;

  v_count := v_count + 1;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, p_max_requests - v_count),
    'reset_at', v_reset_at,
    'retry_after_ms', GREATEST(0, v_reset_at - v_now_ms)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_edge_rate_limit(text, integer, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_edge_rate_limit(text, integer, bigint) TO service_role;

REVOKE ALL ON TABLE public.edge_rate_limit_buckets FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.edge_rate_limit_buckets TO service_role;
