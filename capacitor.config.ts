import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lockin.lifeorganizer',
  appName: 'LockIN Life Organizer',
  webDir: 'out',

  server: {
    url: 'https://ai-ide-personal-life-organizer.vercel.app',
    cleartext: false,
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#09090b',
    preferredContentMode: 'mobile',
    allowsLinkPreview: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#09090b',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
  },
};

export default config;
