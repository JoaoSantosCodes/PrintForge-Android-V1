import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import {
  looksLikeImage,
  MAX_DOWNLOAD_BYTES,
  naoEhImagem,
  normalizeImageUrl,
} from '../../core/imageUrl';
import {
  base64FromDataUrl,
  dataUrlFromBase64,
  fitWithin,
  PHOTO_MIME,
  PHOTO_QUALITY,
  photoFileName,
} from '../../core/photo';

/**
 * Pasta das fotos, dentro dos dados do aplicativo.
 *
 * `Directory.Data` e não `Cache`: cache é território que o Android pode limpar quando
 * quiser, e a foto de um orçamento antigo precisa continuar lá. Na web o plugin cai em
 * IndexedDB, então as fotos também não disputam espaço com o `localStorage` do catálogo
 * — que é justamente onde elas quebrariam tudo.
 */
const PASTA = 'fotos';

/**
 * Abre a câmera ou a galeria e devolve a foto já reduzida, como data URL.
 *
 * Usa `<input type="file" accept="image/*">` em vez de um plugin de câmera: na WebView
 * do Android isso abre o seletor do sistema com câmera e galeria juntas, funciona igual
 * no navegador, e não acrescenta permissão nenhuma ao manifesto — pedir acesso à câmera
 * para um app de orçamento é o tipo de permissão que faz gente desinstalar.
 */
export function pickPhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(await downscale(file));
      } catch {
        resolve(null);
      }
    };

    // Mesmo caso do seletor de backup: a WebView não dá evento de cancelamento
    // confiável, e a promise pendente é descartada com a tela.
    input.click();
  });
}

/**
 * Reduz a imagem antes de ela chegar perto do disco.
 *
 * A redução acontece aqui, e não na hora de gravar, porque o original de 12 MP não deve
 * existir em memória por mais tempo que o necessário — e porque assim a prévia na tela
 * já é a mesma imagem que será guardada e enviada.
 */
async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    if (width === 0 || height === 0) throw new Error('Imagem sem dimensão');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('Canvas indisponível');
    contexto.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL(PHOTO_MIME, PHOTO_QUALITY);
  } finally {
    bitmap.close();
  }
}

/** Grava a foto de um orçamento. Devolve `false` se o armazenamento recusou. */
export async function savePhoto(calculationId: string, dataUrl: string): Promise<boolean> {
  try {
    await Filesystem.writeFile({
      path: `${PASTA}/${photoFileName(calculationId)}`,
      data: base64FromDataUrl(dataUrl),
      directory: Directory.Data,
      recursive: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Lê a foto de um orçamento, ou `null` quando não existe mais. */
export async function readPhoto(calculationId: string): Promise<string | null> {
  try {
    const { data } = await Filesystem.readFile({
      path: `${PASTA}/${photoFileName(calculationId)}`,
      directory: Directory.Data,
    });
    return typeof data === 'string' ? dataUrlFromBase64(data) : null;
  } catch {
    return null;
  }
}

/**
 * Apaga a foto de um orçamento.
 *
 * Chamado ao remover o registro: sem isso o arquivo ficaria no aparelho para sempre,
 * sem nada que o referencie e sem forma de o usuário encontrá-lo.
 */
export async function deletePhoto(calculationId: string): Promise<void> {
  try {
    await Filesystem.deleteFile({
      path: `${PASTA}/${photoFileName(calculationId)}`,
      directory: Directory.Data,
    });
  } catch {
    // Já não existia, e o objetivo era esse.
  }
}

/**
 * Compartilha o orçamento com a foto anexada.
 *
 * `Share` só aceita arquivos em Android e iOS, e a partir de um caminho do sistema —
 * daí a cópia para o cache antes de abrir a folha. Devolve `false` quando não deu, para
 * quem chamou poder cair no compartilhamento só de texto em vez de falhar calado.
 */
export async function sharePhotoWithText(title: string, text: string, dataUrl: string): Promise<boolean> {
  if (Capacitor.getPlatform() === 'web') return false;

  try {
    const { Share } = await import('@capacitor/share');
    const nome = `orcamento-${Date.now()}.jpg`;
    await Filesystem.writeFile({
      path: nome,
      data: base64FromDataUrl(dataUrl),
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({ path: nome, directory: Directory.Cache });
    await Share.share({ title, text, files: [uri] });
    return true;
  } catch {
    return false;
  }
}

export type UrlPhotoResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: string };

/**
 * Baixa a imagem de um endereço e devolve já reduzida.
 *
 * **É a única requisição de saída que o aplicativo faz**, e só acontece quando alguém cola
 * um link e confirma. O servidor da imagem passa a ver o IP do aparelho, o que está dito
 * na política de privacidade — um app que se anuncia offline não pode abrir conexão em
 * silêncio.
 *
 * No Android a busca vai por `CapacitorHttp`, que faz a requisição pelo sistema e não
 * pela WebView: sem isso, quase todo host de imagem barraria por CORS. No navegador não
 * há essa saída, e a recusa por CORS é relatada como tal em vez de virar "falhou".
 */
export async function photoFromUrl(rawUrl: string): Promise<UrlPhotoResult> {
  const alvo = normalizeImageUrl(rawUrl);
  if (!alvo.ok) return { ok: false, reason: alvo.reason };

  try {
    const { bytes, contentType } = await baixar(alvo.url);

    if (bytes.length === 0) {
      return { ok: false, reason: 'O endereço respondeu vazio.' };
    }
    if (bytes.length > MAX_DOWNLOAD_BYTES) {
      return { ok: false, reason: 'A imagem é grande demais para baixar por aqui.' };
    }
    if (!looksLikeImage(contentType, bytes)) {
      return { ok: false, reason: naoEhImagem(alvo.url) };
    }

    const blob = new Blob([bytes as BlobPart], { type: contentType || 'image/jpeg' });
    return { ok: true, dataUrl: await downscale(new File([blob], 'imagem', { type: blob.type })) };
  } catch (erro) {
    return { ok: false, reason: motivoDaFalha(erro) };
  }
}

async function baixar(url: string): Promise<{ bytes: Uint8Array; contentType?: string }> {
  if (Capacitor.getPlatform() !== 'web') {
    const resposta = await CapacitorHttp.get({ url, responseType: 'arraybuffer' });
    if (resposta.status < 200 || resposta.status >= 300) {
      throw new HttpErro(resposta.status);
    }
    // O plugin devolve o corpo em base64 quando o tipo de resposta é binário.
    const binario = atob(String(resposta.data));
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
    return { bytes, contentType: cabecalho(resposta.headers, 'content-type') };
  }

  const resposta = await fetch(url);
  if (!resposta.ok) throw new HttpErro(resposta.status);
  return {
    bytes: new Uint8Array(await resposta.arrayBuffer()),
    contentType: resposta.headers.get('content-type') ?? undefined,
  };
}

/** Cabeçalhos chegam com caixa imprevisível dependendo do servidor. */
function cabecalho(headers: Record<string, string> | undefined, nome: string): string | undefined {
  if (!headers) return undefined;
  const achado = Object.keys(headers).find((chave) => chave.toLowerCase() === nome);
  return achado ? headers[achado] : undefined;
}

class HttpErro extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

function motivoDaFalha(erro: unknown): string {
  if (erro instanceof HttpErro) {
    if (erro.status === 403 || erro.status === 401) {
      return 'O servidor recusou o acesso. Se for do Drive, deixe o arquivo visível para quem tem o link.';
    }
    if (erro.status === 404) return 'Esse endereço não existe mais.';
    return `O servidor respondeu com erro ${erro.status}.`;
  }

  if (Capacitor.getPlatform() === 'web') {
    return 'O servidor da imagem não autoriza download por outro site. No aplicativo Android este link funciona.';
  }
  return 'Não foi possível baixar a imagem. Verifique a conexão e o endereço.';
}
