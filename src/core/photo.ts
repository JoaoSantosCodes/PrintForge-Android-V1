/**
 * Regras da foto do orçamento, sem tocar em disco nem em canvas.
 *
 * A foto existe para o cliente ver a peça pronta junto do preço, então ela é
 * apresentação: não entra em cálculo algum e não pode custar caro em armazenamento.
 */

/**
 * Maior lado da imagem guardada, em pixels.
 *
 * 1280 é o ponto em que uma foto de peça ainda mostra acabamento e camada num celular,
 * e uma foto de 12 MP sai de vários megabytes para algumas centenas de kB. Guardar o
 * original não serviria a ninguém: a imagem só vai ser vista nesta tela e no aplicativo
 * de mensagem do outro lado.
 */
export const MAX_PHOTO_EDGE = 1280;

/** Qualidade do JPEG. Acima disso o arquivo cresce sem diferença visível na tela. */
export const PHOTO_QUALITY = 0.8;

/**
 * Só JPEG na saída, mesmo que a entrada seja PNG ou HEIC.
 *
 * Foto de peça é imagem contínua, e PNG guarda isso em três a cinco vezes o tamanho sem
 * ganho nenhum. A conversão acontece de graça, já que a imagem passa pelo canvas.
 */
export const PHOTO_MIME = 'image/jpeg';

/** Dimensão de destino, preservando proporção e nunca ampliando. */
export function fitWithin(width: number, height: number, edge = MAX_PHOTO_EDGE): { width: number; height: number } {
  const maior = Math.max(width, height);
  if (!Number.isFinite(maior) || maior <= 0) return { width: 0, height: 0 };
  if (maior <= edge) return { width: Math.round(width), height: Math.round(height) };

  const escala = edge / maior;
  return { width: Math.max(1, Math.round(width * escala)), height: Math.max(1, Math.round(height * escala)) };
}

/**
 * Nome do arquivo de uma foto.
 *
 * Derivado do id do registro para que apagar o orçamento saiba qual arquivo remover sem
 * precisar de um índice à parte — o vínculo fica no próprio nome.
 */
export function photoFileName(calculationId: string): string {
  return `foto-${calculationId}.jpg`;
}

/** Extrai o base64 puro de um data URL, que é o formato que o Filesystem grava. */
export function base64FromDataUrl(dataUrl: string): string {
  const virgula = dataUrl.indexOf(',');
  return virgula === -1 ? dataUrl : dataUrl.slice(virgula + 1);
}

export function dataUrlFromBase64(base64: string): string {
  return `data:${PHOTO_MIME};base64,${base64}`;
}

/**
 * Tamanho aproximado, em bytes, do binário por trás de um base64.
 *
 * Serve para a tela poder dizer quanto a foto ocupa antes de gravar. Base64 carrega 6
 * bits por caractere e completa com `=`, daí o 3/4 e o desconto do preenchimento.
 */
export function approximateBytes(base64: string): number {
  const preenchimento = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - preenchimento);
}
