/**
 * Normaliza a quantidade de peças de um orçamento.
 *
 * Aceita `undefined` de propósito: orçamentos gravados antes de o campo existir não o
 * têm, e o histórico é imutável — não há migração que os conserte sem reescrever
 * registros que deveriam ser fatos encerrados. Um pedido sem quantidade é um pedido de
 * uma peça, que é o que ele era quando foi salvo.
 */
export function pieces(value: number | undefined): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value as number));
}
