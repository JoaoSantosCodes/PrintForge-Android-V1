import type { CalculationRecord } from './types';

/**
 * Teto de registros no histórico.
 *
 * Cada registro serializa em ~750 bytes, então 500 ocupam cerca de 365 kB — folgado
 * dentro da cota do localStorage numa WebView, com espaço de sobra para materiais,
 * impressoras e ajustes. Sem teto, o histórico cresce até a cota estourar.
 */
export const HISTORY_LIMIT = 500;

export type AppendResult = {
  list: CalculationRecord[];
  /** Quantos registros antigos foram descartados para caber no teto. */
  dropped: number;
};

/**
 * Insere um cálculo no topo do histórico, descartando os mais antigos além do teto.
 *
 * Cada registro guarda cópias do material e da impressora de propósito: o histórico é
 * um instantâneo do que foi orçado. Trocar isso por referência de id faria um orçamento
 * antigo mudar de valor sozinho quando o preço do filamento fosse reajustado.
 */
export function appendCalculation(
  list: CalculationRecord[],
  record: CalculationRecord,
  limit: number = HISTORY_LIMIT,
): AppendResult {
  const next = [record, ...list];
  if (next.length <= limit) return { list: next, dropped: 0 };
  return { list: next.slice(0, limit), dropped: next.length - limit };
}
