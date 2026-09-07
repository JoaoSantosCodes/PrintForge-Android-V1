import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.printforge.app',
  appName: 'PrintForge',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      // Escondida por setupNativeChrome assim que o React pinta. O auto-hide fica
      // ligado como rede de segurança: se aquela chamada falhar, a splash sai sozinha
      // em vez de travar o app numa tela estática.
      launchAutoHide: true,
      launchShowDuration: 3000,
      backgroundColor: '#080d19',
      androidSpinnerStyle: 'small',
      spinnerColor: '#38bdf8'
    }
  }
};

export default config;
