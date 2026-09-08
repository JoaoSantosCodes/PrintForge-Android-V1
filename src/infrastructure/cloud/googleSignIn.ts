/**
 * Login com o Google, pelo caminho nativo do Android.
 *
 * **Por que não `signInWithOAuth`.** Aquele caminho abriria a página de contas do Google
 * dentro da WebView do aplicativo, e o Google recusa isso desde julho de 2023 — a
 * política "use secure browsers" cita `android.webkit.WebView` pelo nome, que é
 * exatamente a WebView que o Capacitor usa. O usuário receberia `disallowed_useragent` e
 * mais nada. O caminho que funciona é o Credential Manager do sistema, que devolve um ID
 * token para o aplicativo trocar por sessão no Supabase.
 *
 * O `import()` é dinâmico pela mesma razão do cliente do Supabase: quem nunca abre a
 * seção de conta não deveria pagar o peso na abertura do aplicativo.
 */

import { classifyGoogleError } from '../../core/googleError';
import { createNonce } from '../../core/nonce';

const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

/** Se esta compilação tem com que falar com o Google. */
export function googleConfigured(): boolean {
  return typeof WEB_CLIENT_ID === 'string' && WEB_CLIENT_ID !== '';
}

export type GoogleToken =
  | { ok: true; idToken: string; nonce: string }
  /** A pessoa fechou a folha de contas. Não é falha, e não merece alarme na tela. */
  | { ok: false; cancelado: true }
  | { ok: false; cancelado: false; reason: string };

let iniciado = false;

/**
 * O `initialize` é idempotente do lado do plugin, mas guardamos o estado assim mesmo:
 * chamá-lo a cada toque no botão seria trabalho nativo repetido por nada.
 */
async function plugin() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  if (!iniciado) {
    await SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID as string, mode: 'online' } });
    iniciado = true;
  }
  return SocialLogin;
}

/**
 * Pede um ID token ao Google.
 *
 * Devolve o nonce cru junto do token de propósito: quem chamar precisa dos dois na mesma
 * troca, e o Supabase recusa o token se receber o nonce de outra tentativa.
 */
export async function googleIdToken(): Promise<GoogleToken> {
  if (!googleConfigured()) {
    return { ok: false, cancelado: false, reason: 'O login com o Google não está configurado nesta versão do aplicativo.' };
  }

  try {
    const SocialLogin = await plugin();
    const nonce = await createNonce();
    const { result } = await SocialLogin.login({
      provider: 'google',
      options: { scopes: ['email', 'profile'], nonce: nonce.paraOGoogle },
    });

    // O modo `offline` devolve um código de autorização em vez de token. Pedimos
    // `online`, então isto não deve acontecer — mas o tipo permite, e um `as` aqui
    // esconderia uma troca de modo feita sem querer.
    if (result.responseType !== 'online') {
      return { ok: false, cancelado: false, reason: 'O Google respondeu num formato inesperado. Tente de novo.' };
    }
    if (!result.idToken) {
      return { ok: false, cancelado: false, reason: 'O Google não devolveu a credencial. Tente de novo.' };
    }

    return { ok: true, idToken: result.idToken, nonce: nonce.paraOSupabase };
  } catch (erro) {
    const falha = classifyGoogleError(erro instanceof Error ? erro.message : String(erro));
    return falha.cancelado
      ? { ok: false, cancelado: true }
      : { ok: false, cancelado: false, reason: falha.reason };
  }
}

/**
 * Encerra a sessão do lado do Google.
 *
 * Sem isto, o Credential Manager guarda a conta escolhida e o próximo login entra
 * direto — o que parece que "sair da conta" não funcionou.
 */
export async function googleSignOut(): Promise<void> {
  if (!googleConfigured() || !iniciado) return;
  try {
    const SocialLogin = await plugin();
    await SocialLogin.logout({ provider: 'google' });
  } catch {
    // Sair da sessão do Supabase é o que importa; falhar aqui não pode impedir aquilo.
  }
}
