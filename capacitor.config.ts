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
      backgroundColor: '#100d0b',
      androidSpinnerStyle: 'small',
      spinnerColor: '#fb8b3c'
    },
    /*
     * So o Google entra no pacote.
     *
     * O plugin traz os quatro provedores ligados por padrao, e cada um arrasta o proprio
     * SDK. Isso e configuracao, nao otimizacao: descobri pelo build, que falhava porque o
     * bloco do Apple puxa androidx.browser:1.9.0 — dependencia que exige AGP 8.9.1
     * enquanto este projeto esta no 8.7.2. Desligar e mais barato e menos arriscado que
     * subir o AGP no meio de um teste fechado.
     *
     * O Facebook sai pelo mesmo movimento, e esse ganho e por si so: sem isto, o SDK de
     * login do Facebook viajaria dentro de um aplicativo de orcamento de impressao 3D.
     *
     * `false` aqui vira `compileOnly` no Gradle — o codigo compila, o SDK nao embarca.
     */
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false }
    }
  }
};

export default config;
