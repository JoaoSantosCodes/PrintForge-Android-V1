/**
 * Endereços que o usuário digita e o aplicativo transforma em link clicável.
 *
 * Dois usos: onde recomprar um filamento, e de onde veio o modelo de uma peça.
 *
 * A validação aqui não é cosmética. Um endereço digitado pelo usuário que vira o `href`
 * de um link é caminho de injeção: `javascript:` num `href` executa no contexto do
 * aplicativo, com acesso ao `localStorage` onde moram catálogo, histórico e estoque. Por
 * isso o esquema é conferido com lista de permitidos, e não com lista de proibidos — uma
 * lista de proibidos esquece `vbscript:`, `data:` e o que vier depois.
 */

export type LinkResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

const ESQUEMAS_PERMITIDOS = ['http:', 'https:'];

/**
 * Valida e normaliza um endereço colado.
 *
 * Aceita sem esquema — quem copia de um site copia `voolt3d.com.br/petg`, não
 * `https://voolt3d.com.br/petg` — e completa com `https`. Exigir o prefixo seria um erro
 * de recusa que a pessoa não entende, porque o endereço que ela tem na mão está certo.
 */
export function safeExternalUrl(raw: string): LinkResult {
  const texto = raw.trim();
  if (texto === '') return { ok: false, reason: 'Cole o endereço.' };

  // Sem "//" antes do primeiro ponto ou barra, presume-se que falta o esquema. Feito
  // antes do `new URL` para "voolt3d.com.br/petg" não virar caminho relativo.
  const comEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;

  let alvo: URL;
  try {
    alvo = new URL(comEsquema);
  } catch {
    return { ok: false, reason: 'Isso não parece um endereço de site.' };
  }

  if (!ESQUEMAS_PERMITIDOS.includes(alvo.protocol)) {
    return { ok: false, reason: 'Só endereços de site (http ou https) funcionam aqui.' };
  }

  // Sem ponto no domínio não há site: "loja" viraria "https://loja", que o `new URL`
  // aceita e nenhum navegador resolve.
  if (!alvo.hostname.includes('.') || alvo.hostname.startsWith('.') || alvo.hostname.endsWith('.')) {
    return { ok: false, reason: 'Falta o domínio, como voolt3d.com.br.' };
  }

  return { ok: true, url: alvo.toString() };
}

/** Só o domínio, para caber no rótulo de um botão sem estourar a largura do cartão. */
export function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
