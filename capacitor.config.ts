import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'xyz.arxonchain.app',
  appName: 'Arxon',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Live updates — app loads UI from Cloudflare Pages on every open.
    // Every GitHub push rebuilds Cloudflare and all users get updates instantly.
    url: 'https://arxon-mobile.pages.dev',
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
  },
};

export default config;
