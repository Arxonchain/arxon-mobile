import { CapacitorConfig } from '@capacitor/cli';

/** Production OTA host used by Play Store / release builds (never localhost). */
const REMOTE_URL = 'https://arxon-mobile.pages.dev';

/**
 * Default (release / Play Store / CI): load UI from Cloudflare OTA (REMOTE_URL).
 * Opt-in offline/local-bundle only: set CAPACITOR_BUNDLE_LOCAL=true before `cap sync`
 * so the WebView origin becomes https://localhost and ships bundled dist/.
 * USB live reload: set CAPACITOR_LIVE_USB=true before `cap sync` so the debug APK
 * loads http://127.0.0.1:8080 through `adb reverse`. Never set this for store AAB.
 * Do NOT enable CAPACITOR_BUNDLE_LOCAL for store AAB/APK workflows.
 */
const liveUsb = process.env.CAPACITOR_LIVE_USB === 'true';
const bundleLocal = !liveUsb && process.env.CAPACITOR_BUNDLE_LOCAL === 'true';
const LIVE_URL = process.env.CAPACITOR_LIVE_URL || 'http://127.0.0.1:8080';

/** Domains the WebView may navigate / frame for auth + Turnstile challenges. */
const ALLOW_NAVIGATION = [
  'localhost',
  '*.localhost',
  '127.0.0.1',
  'challenges.cloudflare.com',
  '*.challenges.cloudflare.com',
  '*.cloudflare.com',
  'arxon-mobile.pages.dev',
  'arxonchain.xyz',
  'www.arxonchain.xyz',
  '*.supabase.co',
  'rpc-test.arxon.io',
  'scan.arxon.io',
  'accounts.google.com',
  '*.google.com',
  '*.googleapis.com',
  'googleapis.com',
];

const config: CapacitorConfig = {
  appId: 'xyz.arxonchain.app',
  appName: 'Arxon',
  webDir: 'dist',
  server: liveUsb
    ? {
        // Debug APK only. Phone localhost is this laptop via `adb reverse tcp:8080 tcp:8080`.
        androidScheme: 'http',
        url: LIVE_URL,
        cleartext: true,
        allowNavigation: ALLOW_NAVIGATION,
      }
    : bundleLocal
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
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#050505',
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
