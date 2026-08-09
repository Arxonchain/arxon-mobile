import { CapacitorConfig } from '@capacitor/cli';

const REMOTE_URL = 'https://arxon-mobile.pages.dev';

/**
 * Default: load UI from Cloudflare (instant OTA on git push).
 * Store builds with offline support: set CAPACITOR_BUNDLE_LOCAL=true before cap sync
 * so the app ships bundled dist/ and works without network.
 */
const bundleLocal = process.env.CAPACITOR_BUNDLE_LOCAL === 'true';

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
        allowNavigation: [
          'challenges.cloudflare.com',
          '*.challenges.cloudflare.com',
          'arxon-mobile.pages.dev',
          '*.supabase.co',
        ],
      }
    : {
        // OTA loads https://arxon-mobile.pages.dev — that hostname must be on the Turnstile allowlist.
        androidScheme: 'https',
        url: REMOTE_URL,
        cleartext: false,
        allowNavigation: [
          'challenges.cloudflare.com',
          '*.challenges.cloudflare.com',
          'arxon-mobile.pages.dev',
          'arxonchain.xyz',
          'www.arxonchain.xyz',
          '*.supabase.co',
        ],
      },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
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
