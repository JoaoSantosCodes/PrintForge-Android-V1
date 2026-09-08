/**
 * Traduz o endereço que a pessoa colou para um que devolva a imagem.
 *
 * Quem manda uma foto manda o link de compartilhar, não o link do arquivo — e o link de
 * compartilhar do Drive é uma página HTML com um visualizador dentro. Baixar aquilo e
 * tentar desenhar num canvas falha de um jeito que não explica nada. Converter aqui é o
 * que faz a diferença entre "não funcionou" e funcionar.
 */

export type UrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/** Teto do que se aceita baixar. Foto de celular não passa disso; página HTML, sim. */
export const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024;

const DRIVE_ARQUIVO = /^https?:\/\/drive\.google\.com\/file\/d\/([\w-]+)/i;
const DRIVE_ABRIR = /^https?:\/\/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/i;
const DRIVE_PASTA = /^https?:\/\/drive\.google\.com\/drive\/folders\//i;
const DROPBOX = /^https?:\/\/(?:www\.)?dropbox\.com\//i;

/**
 * Endereço do Drive que serve o binário da imagem.
 *
 * `lh3.googleusercontent.com/d/ID` em vez de `drive.google.com/uc?export=download`: o
 * segundo responde com uma página de aviso quando o arquivo passa do tamanho da
 * verificação de vírus, e essa página tem status 200 — ou seja, chegaria aqui como
 * "sucesso" e só quebraria na hora de decodificar.
 */
const driveDireto = (id: string) => `https://lh3.googleusercontent.com/d/${id}`;

export function normalizeImageUrl(raw: string): UrlResult {
  const texto = raw.trim();
  if (texto === '') {
    return { ok: false, reason: 'Cole o endereço da imagem.' };
  }

  let alvo: URL;
  try {
    alvo = new URL(texto);
  } catch {
    return { ok: false, reason: 'Isso não parece um endereço. Um link começa com https://' };
  }

  if (alvo.protocol !== 'http:' && alvo.protocol !== 'https:') {
    return { ok: false, reason: 'Só funciona com endereços http ou https.' };
  }

  if (DRIVE_PASTA.test(texto)) {
    return { ok: false, reason: 'Esse link é de uma pasta do Drive. Abra a imagem e copie o link dela.' };
  }

  const arquivo = texto.match(DRIVE_ARQUIVO) ?? texto.match(DRIVE_ABRIR);
  if (arquivo) {
    return { ok: true, url: driveDireto(arquivo[1]) };
  }

  if (DROPBOX.test(texto)) {
    // O Dropbox serve a página do visualizador por padrão; `raw=1` serve o arquivo.
    alvo.searchParams.delete('dl');
    alvo.searchParams.set('raw', '1');
    return { ok: true, url: alvo.toString() };
  }

  return { ok: true, url: alvo.toString() };
}

/**
 * Decide se o que voltou é mesmo uma imagem.
 *
 * O `content-type` sozinho não basta: um arquivo privado do Drive responde 200 com a
 * página de login, e um servidor mal configurado manda `application/octet-stream` para
 * um JPEG legítimo. Então o tipo declarado é uma pista, e os primeiros bytes são a
 * prova — eles não mentem sobre o formato.
 */
export function looksLikeImage(contentType: string | undefined, bytes: Uint8Array): boolean {
  if (contentType && contentType.toLowerCase().startsWith('text/')) return false;
  return sniffImage(bytes) !== null;
}

/** Formato reconhecido pelos bytes iniciais, ou `null` se não for imagem conhecida. */
export function sniffImage(bytes: Uint8Array): 'jpeg' | 'png' | 'gif' | 'webp' | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';

  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';

  // RIFF....WEBP
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (riff && webp) return 'webp';

  return null;
}

/**
 * Mensagem para quando baixou algo que não é imagem.
 *
 * Separada porque a causa mais comum tem conserto conhecido, e dizer "não é uma imagem"
 * para quem colou um link privado do Drive não ajuda ninguém.
 */
export function naoEhImagem(url: string): string {
  if (/googleusercontent\.com|drive\.google\.com/i.test(url)) {
    return 'O Drive respondeu com uma página em vez da imagem. Isso costuma ser permissão: no Drive, deixe o arquivo visível para quem tem o link.';
  }
  return 'O endereço respondeu, mas o que veio não é uma imagem.';
}
