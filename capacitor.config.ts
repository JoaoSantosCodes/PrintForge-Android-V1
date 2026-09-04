import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.printforge.app',
  appName: 'PrintForge',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
