import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Style, StatusBar } from '@capacitor/status-bar';
import type { ResolvedTheme } from '../../core/theme';

/** Mesma cor de `--bg` em cada tema, para a barra não destoar do topo da tela. */
const CHROME_BACKGROUND: Record<ResolvedTheme, string> = {
  dark: '#100d0b',
  light: '#f7f4f1',
};

const isNative = (): boolean => Capacitor.getPlatform() !== 'web';

/** Último tema aplicado, para o `hideSplash` saber o que repor. */
let lastTheme: ResolvedTheme | null = null;

/**
 * Alinha a barra de status ao tema atual.
 *
 * `Style.Dark` significa "conteúdo claro sobre fundo escuro" na API do Capacitor — o
 * nome se refere ao tema, não à cor dos ícones. Errar isso deixa ícones pretos sobre
 * fundo quase preto.
 */
export async function applyThemeToNativeChrome(theme: ResolvedTheme): Promise<void> {
  if (!isNative()) return;
  lastTheme = theme;

  // A ordem não é indiferente, e custou um bug visível no aparelho. O
  // `setBackgroundColor` do plugin mexe nas flags da janela para chamar o
  // `setStatusBarColor`, e mexer nas flags depois do `setStyle` desfaz a aparência que
  // o `setStyle` acabou de definir — no tema claro isso deixava os ícones brancos sobre
  // fundo claro, praticamente invisíveis. A cor vem primeiro, o estilo por último.
  //
  // Os dois try/catch são separados de propósito: a partir do Android 15 (targetSdk 35+)
  // o `setStatusBarColor` é ignorado, e num único bloco uma falha dele levaria junto o
  // `setStyle`, que é justamente o que ainda funciona.
  try {
    await StatusBar.setBackgroundColor({ color: CHROME_BACKGROUND[theme] });
  } catch {
    // Em Android 15+ a cor da barra vem do que o app desenha atrás dela, não daqui.
  }

  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
  } catch {
    // Barra de status indisponível não impede o app de rodar.
  }
}

/**
 * Derruba a splash depois que o React pintou a primeira tela.
 *
 * A cor da barra fica por conta de `applyThemeToNativeChrome`, chamado pelo hook de
 * tema assim que ele resolve a preferência — antes disso não há tema para aplicar.
 */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  try {
    await SplashScreen.hide();
  } catch {
    // Se a splash não existir, não há o que esconder.
  }

  // A saída da splash devolve a aparência da barra de status ao padrão da janela, o que
  // desfazia o que o tema tinha acabado de aplicar. Trocar de tema com o app aberto
  // funcionava; abrir o app no tema claro deixava os ícones brancos sobre fundo claro,
  // porque ali o `hideSplash` vinha depois. Repor é a última palavra na inicialização.
  if (lastTheme) await applyThemeToNativeChrome(lastTheme);
}
