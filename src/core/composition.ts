import type { QuoteBreakdown } from './types';

export type CostSlice = {
  key: string;
  label: string;
  value: number;
  /** Fatia do custo total, de 0 a 100. Exata — é ela que dá a largura da barra. */
  percent: number;
  /**
   * O mesmo percentual já inteiro, para exibir.
   *
   * Existe separado porque arredondar cada fatia por conta própria produz somas que não
   * fecham: 59,7 + 23,7 + 11,9 + 3,1 + 1,6 vira 60 + 24 + 12 + 3 + 2 = 101. Numa
   * ferramenta que promete precisão de custo, uma legenda que soma 101% é pior que
   * inútil — é um motivo para desconfiar do resto.
   */
  percentLabel: number;
};

/** Ordem fixa, para a barra não dançar a cada tecla digitada. */
const COMPONENTS: ReadonlyArray<{ key: keyof QuoteBreakdown; label: string }> = [
  { key: 'filament', label: 'Filamento' },
  { key: 'labor', label: 'Mão de obra' },
  { key: 'machine', label: 'Máquina' },
  { key: 'energy', label: 'Energia' },
  { key: 'maintenance', label: 'Manutenção' },
  { key: 'packaging', label: 'Embalagem' },
];

/**
 * Reparte o custo em fatias proporcionais.
 *
 * Serve à pergunta que um orçamento isolado não responde: *o que está pesando aqui?*
 * Ver que a mão de obra é 70% do custo muda a decisão de preço; ver seis números
 * empilhados, não.
 *
 * Componentes zerados saem da lista — uma fatia invisível na barra só faria a legenda
 * crescer sem dizer nada.
 */
export function costComposition(breakdown: QuoteBreakdown | null): CostSlice[] {
  if (!breakdown || breakdown.totalCost <= 0) return [];

  const bruto = COMPONENTS
    .map(({ key, label }) => {
      const value = breakdown[key];
      return {
        key: String(key),
        label,
        value,
        percent: (value / breakdown.totalCost) * 100,
      };
    })
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);

  return withWholePercents(bruto);
}

/**
 * Arredonda o conjunto pelo método do maior resto.
 *
 * Cada fatia leva a parte inteira do seu percentual; a diferença que falta para 100 é
 * distribuída, um ponto por vez, para quem tinha a maior fração descartada. É o mesmo
 * critério usado para repartir cadeiras em eleições proporcionais, e pela mesma razão:
 * o total é fixo e precisa ser respeitado.
 */
function withWholePercents(slices: Omit<CostSlice, 'percentLabel'>[]): CostSlice[] {
  const inteiros = slices.map((slice) => Math.floor(slice.percent));
  const somaInteiros = inteiros.reduce((soma, valor) => soma + valor, 0);

  // Limitado ao número de fatias: erro de ponto flutuante não pode virar ponto extra.
  const sobra = Math.max(0, Math.min(slices.length, 100 - somaInteiros));

  const porMaiorResto = slices
    .map((slice, indice) => ({ indice, resto: slice.percent - Math.floor(slice.percent) }))
    .sort((a, b) => b.resto - a.resto);

  const ganhaUm = new Set(porMaiorResto.slice(0, sobra).map((item) => item.indice));

  return slices.map((slice, indice) => ({
    ...slice,
    percentLabel: inteiros[indice] + (ganhaUm.has(indice) ? 1 : 0),
  }));
}

/** A fatia dominante, quando há uma clara o bastante para valer o destaque. */
export function dominantSlice(slices: CostSlice[], threshold = 40): CostSlice | null {
  const [maior] = slices;
  if (!maior || maior.percent < threshold) return null;
  return maior;
}
