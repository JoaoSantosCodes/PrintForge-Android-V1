import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Style, StatusBar } from '@capacitor/status-bar';
import type { ResolvedTheme } from '../../core/theme';

/** Mesma cor de `--bg` em cada tema, para a barra não destoar do topo da tela. */
const CHROME_BACKGROUND: Record<ResolvedTheme, string> = {
  dark: '#080d19',
  light: '#eef2f8',
};

const isNative = (): boolean => Capacitor.getPlatform() !== 'web';

/**
 * Alinha a barra de status ao tema atual.
 *
 * `Style.Dark` significa "conteúdo claro sobre fundo escuro" na API do Capacitor — o
 * nome se refere ao tema, não à cor dos ícones. Errar isso deixa ícones pretos sobre
 * fundo quase preto.
 */
export async function applyThemeToNativeChrome(theme: ResolvedTheme): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: CHROME_BACKGROUND[theme] });
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
}
