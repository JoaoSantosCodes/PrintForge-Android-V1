import type { SupabaseClient } from '@supabase/supabase-js';
import { googleConfigured } from './googleSignIn';

/**
 * Cliente do Supabase, carregado sob demanda.
 *
 * O `import()` dinâmico existe por peso: a biblioteca acrescenta dezenas de kB ao pacote,
 * e a nuvem é opcional — quem nunca abre a seção de conta não deveria pagar por ela no
 * tempo de abertura do aplicativo, que é justamente o que a Fase 4 mediu.
 *
 * As chaves vêm de variáveis de ambiente e não do código. A chave anônima é pública por
 * definição, mas ainda assim não se escreve credencial no repositório: quem compila a
 * partir do código-fonte sem chave nenhuma continua com um aplicativo inteiro, só sem a
 * seção de nuvem.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Se a nuvem está configurada nesta compilação.
 *
 * Exige as três coisas, e não só as duas do Supabase: sem o identificador do cliente do
 * Google não há como entrar, e a tela apareceria com um botão que falha ao ser tocado.
 * Sumir por inteiro é melhor que oferecer o que não funciona.
 */
export function cloudConfigured(): boolean {
  return typeof URL === 'string' && URL !== ''
    && typeof ANON_KEY === 'string' && ANON_KEY !== ''
    && googleConfigured();
}

let cliente: SupabaseClient | null = null;

export async function getClient(): Promise<SupabaseClient | null> {
  if (!cloudConfigured()) return null;
  if (cliente) return cliente;

  const { createClient } = await import('@supabase/supabase-js');
  cliente = createClient(URL as string, ANON_KEY as string, {
    auth: {
      // A sessão fica no localStorage e é renovada sozinha: o app é usado em rajadas
      // curtas, e pedir senha a cada abertura tornaria o backup na nuvem um estorvo.
      persistSession: true,
      autoRefreshToken: true,
      // O login não passa por redirecionamento: o Credential Manager do Android devolve
      // um ID token direto ao aplicativo, e a sessão nasce de `signInWithIdToken`. Não há
      // esquema de URL registrado, e não precisa haver.
      detectSessionInUrl: false,
    },
  });
  return cliente;
}
