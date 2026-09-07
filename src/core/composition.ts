import type { QuoteBreakdown } from './types';

export type CostSlice = {
  key: string;
  label: string;
  value: number;
  /** Fatia do custo total, de 0 a 100. */
  percent: number;
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

  return COMPONENTS
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
}

/** A fatia dominante, quando há uma clara o bastante para valer o destaque. */
export function dominantSlice(slices: CostSlice[], threshold = 40): CostSlice | null {
  const [maior] = slices;
  if (!maior || maior.percent < threshold) return null;
  return maior;
}
