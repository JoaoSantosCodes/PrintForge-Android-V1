/**
 * Nonce de uso único para o login com o Google.
 *
 * Serve contra reapresentação: sem ele, um ID token capturado uma vez pode ser
 * reapresentado depois. O Google carimba o nonce dentro do token, e o Supabase confere.
 *
 * **As duas pontas recebem formas diferentes do mesmo valor**, e essa é a parte fácil de
 * errar: o Google recebe o *hash* SHA-256 em hexadecimal, e o Supabase recebe o valor
 * *cru*. Invertido, o login falha com "Nonces mismatch" — mensagem que não diz nada a
 * quem está olhando a tela.
 *
 * Por isso `createNonce` devolve os dois juntos, num objeto onde cada campo diz para
 * onde vai. Duas funções soltas convidariam a passar o valor errado no lugar errado, e
 * nenhum teste de unidade pegaria isso, porque as duas seriam strings válidas.
 */

export type Nonce = {
  /** Vai para o Supabase, em `signInWithIdToken({ nonce })`. */
  paraOSupabase: string;
  /** Vai para o Google, na opção `nonce` do pedido de credencial. */
  paraOGoogle: string;
};

/** SHA-256 em hexadecimal minúsculo, que é o formato que o Supabase compara. */
export async function sha256Hex(valor: string): Promise<string> {
  const bytes = new TextEncoder().encode(valor);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createNonce(): Promise<Nonce> {
  const cru = crypto.randomUUID();
  return { paraOSupabase: cru, paraOGoogle: await sha256Hex(cru) };
}
