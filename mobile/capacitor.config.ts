import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sonora.app',
  appName: 'Sonora',
  webDir: '../frontend/dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
