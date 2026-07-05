-- APP_UPDATE.sql — run in Supabase SQL Editor when you publish a new Play Store / App Store build.
-- Set min_build to the versionCode you just released; users below that see a blocking update overlay.

CREATE TABLE IF NOT EXISTS public.mobile_app_version (
  platform    text PRIMARY KEY CHECK (platform IN ('android', 'ios')),
  min_build   integer NOT NULL CHECK (min_build >= 1),
  latest_build integer NOT NULL CHECK (latest_build >= 1),
  message     text,
  store_url   text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mobile_app_version ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app version requirements" ON public.mobile_app_version;
CREATE POLICY "Anyone can read app version requirements"
  ON public.mobile_app_version FOR SELECT
  TO anon, authenticated
  USING (true);

-- Upsert defaults (adjust min_build when you ship a mandatory update)
INSERT INTO public.mobile_app_version (platform, min_build, latest_build, message, store_url)
VALUES (
  'android',
  10,
  10,
  'A new version of Arxon is available with important fixes. Please update to continue using the app.',
  'https://play.google.com/store/apps/details?id=xyz.arxonchain.app'
)
ON CONFLICT (platform) DO UPDATE SET
  min_build    = EXCLUDED.min_build,
  latest_build = EXCLUDED.latest_build,
  message      = EXCLUDED.message,
  store_url    = EXCLUDED.store_url,
  updated_at   = now();

INSERT INTO public.mobile_app_version (platform, min_build, latest_build, message, store_url)
VALUES (
  'ios',
  10,
  10,
  'A new version of Arxon is available. Please update from the App Store.',
  'https://apps.apple.com/app/id0000000000'
)
ON CONFLICT (platform) DO UPDATE SET
  min_build    = EXCLUDED.min_build,
  latest_build = EXCLUDED.latest_build,
  message      = EXCLUDED.message,
  store_url    = EXCLUDED.store_url,
  updated_at   = now();

-- ── When you release a new build, run e.g.: ──────────────────────────────────
-- UPDATE public.mobile_app_version
-- SET min_build = 11, latest_build = 11, updated_at = now()
-- WHERE platform = 'android';
