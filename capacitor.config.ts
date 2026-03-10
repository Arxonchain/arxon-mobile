import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'xyz.arxonchain.app',
  appName: 'Arxon Mining',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,
      statsUrl: '',
      channelUrl: 'https://api.capgo.app/channel_self',
      updateUrl: 'https://api.capgo.app/updates',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
