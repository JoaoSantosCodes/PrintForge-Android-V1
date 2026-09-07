import { Share } from '@capacitor/share';

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/**
 * Compartilha um texto pelo melhor canal disponível.
 *
 * A ordem importa: na WebView do Android a Web Share API não existe, então
 * `navigator.share` sozinho sempre caía na área de transferência e o usuário nunca
 * via a folha nativa — que é o caminho natural para mandar um orçamento por WhatsApp.
 *
 * Devolve o que de fato aconteceu para que a interface diga a verdade ao usuário,
 * em vez de anunciar "copiado" quando abriu a folha, ou vice-versa.
 */
export async function shareText(title: string, text: string): Promise<ShareOutcome> {
  try {
    const { value } = await Share.canShare();
    if (value) {
      await Share.share({ title, text });
      return 'shared';
    }
  } catch {
    // Usuário cancelou a folha ou o plugin não respondeu; tenta os caminhos abaixo.
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch {
      // Idem: segue para a área de transferência.
    }
  }

  try {
    await navigator.clipboard?.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
