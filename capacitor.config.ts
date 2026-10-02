import { CapacitorConfig } from '@capacitor/cli';

/** Production OTA host used by Play Store / release builds (never localhost). */
const REMOTE_URL = 'https://arxon-mobile.pages.dev';

/**
 * Default (release / Play Store / CI): load UI from Cloudflare OTA (REMOTE_URL).
 * Opt-in offline/local-bundle only: set CAPACITOR_BUNDLE_LOCAL=true before `cap sync`
 * so the WebView origin becomes https://localhost and ships bundled dist/.
 * Do NOT enable CAPACITOR_BUNDLE_LOCAL for store AAB/APK workflows.
 */
const bundleLocal = process.env.CAPACITOR_BUNDLE_LOCAL === 'true';

/** Domains the WebView may navigate / frame for auth + Turnstile challenges. */
const ALLOW_NAVIGATION = [
  'localhost',
  '*.localhost',
  'challenges.cloudflare.com',
  '*.challenges.cloudflare.com',
  '*.cloudflare.com',
  'arxon-mobile.pages.dev',
  'arxonchain.xyz',
  'www.arxonchain.xyz',
  '*.supabase.co',
  'rpc-test.arxon.io',
  'scan.arxon.io',
];

const config: CapacitorConfig = {
  appId: 'xyz.arxonchain.app',
  appName: 'Arxon',
  webDir: 'dist',
  server: bundleLocal
    ? {
        // Bundled WebView origin is https://localhost — add `localhost` in Turnstile hostnames.
        androidScheme: 'https',
        hostname: 'localhost',
        cleartext: false,
        allowNavigation: ALLOW_NAVIGATION,
      }
    : {
        // OTA loads https://arxon-mobile.pages.dev — that hostname must be on the Turnstile allowlist.
        androidScheme: 'https',
        url: REMOTE_URL,
        cleartext: false,
        allowNavigation: ALLOW_NAVIGATION,
      },
  plugins: {
    SplashScreen: {
      // Native splash only; Play Store rebuild required to change. Keep short so OTA WebView can paint sooner.
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#07080f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_arxon',
      iconColor: '#6B9FD4',
    },
  },
};

export default config;
