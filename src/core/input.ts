/**
 * Normalização de entrada numérica vinda da UI.
 * Puro e independente de React — o campo de texto entrega string, o domínio exige número válido.
 */
import type { QuoteInput, StoredSettings } from './types';

export type NumericFieldKey = keyof QuoteInput | keyof StoredSettings;

/**
 * Converte texto do usuário em número não-negativo.
 * Aceita vírgula como separador decimal; texto inválido vira 0.
 */
export function numberValue(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/**
 * Aplica o limite superior específico do campo.
 * Margem é percentual e precisa ficar abaixo de 100 — calculatePrice rejeita >= 100.
 */
export function clampNumericField(key: NumericFieldKey, value: number): number {
  if (key === 'marginPercent') return Math.min(99, value);
  // Pedido de zero peça não é pedido, e o núcleo recusaria o cálculo.
  if (key === 'quantity') return Math.max(1, Math.floor(value));
  return value;
}

/**
 * Filtra o que o usuário digita num campo numérico.
 *
 * Aceita estados intermediários — vazio, `"1,"`, `"0."` — porque o campo é
 * `type="text"` justamente para permitir digitar `1,5` sem que o `,` seja engolido.
 * Rejeita qualquer outra coisa devolvendo o texto anterior, para que letras não
 * apareçam no campo enquanto o valor por baixo já virou zero.
 */
const DECIMAL_SHAPE = /^\d*[.,]?\d*$/;

export function maskDecimal(raw: string, previous: string): string {
  return DECIMAL_SHAPE.test(raw) ? raw : previous;
}

/**
 * Filtra campos que só aceitam inteiros — horas e minutos.
 *
 * Separador decimal não faz sentido aqui: meia hora se digita como 30 no campo de
 * minutos, não como `0,5` no de horas. Deixar a vírgula passar criava um estado em
 * que o campo mostrava `"1,5"` enquanto o tempo já valia zero.
 */
const INTEGER_SHAPE = /^\d*$/;

export function maskInteger(raw: string, previous: string): string {
  return INTEGER_SHAPE.test(raw) ? raw : previous;
}
