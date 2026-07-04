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
        androidScheme: 'https',
        cleartext: false,
      }
    : {
        androidScheme: 'https',
        url: REMOTE_URL,
        cleartext: false,
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
