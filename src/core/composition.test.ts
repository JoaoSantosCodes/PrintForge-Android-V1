import { describe, expect, it } from 'vitest';
import { costComposition, dominantSlice } from './composition';
import type { QuoteBreakdown } from './types';

const breakdown = (partes: Partial<QuoteBreakdown>): QuoteBreakdown => ({
  filament: 0, energy: 0, machine: 0, labor: 0, maintenance: 0, packaging: 0,
  totalCost: 0, profit: 0, salePrice: 0, ...partes,
});

describe('costComposition', () => {
  it('devolve lista vazia sem resultado', () => {
    expect(costComposition(null)).toEqual([]);
  });

  it('devolve lista vazia quando o custo é zero — evita divisão por zero', () => {
    expect(costComposition(breakdown({ totalCost: 0 }))).toEqual([]);
  });

  it('os percentuais exibidos somam 100, mesmo quando arredondar cada um separadamente somaria 101', () => {
    // Os números vieram de um orcamento real: 59,7 + 23,7 + 11,9 + 3,1 + 1,6.
    // Arredondados um a um dariam 60 + 24 + 12 + 3 + 2 = 101.
    const fatias = costComposition(breakdown({
      machine: 3875,
      filament: 1536,
      maintenance: 775,
      packaging: 200,
      energy: 101,
      totalCost: 6487,
    }));
    expect(fatias.reduce((soma, f) => soma + f.percentLabel, 0)).toBe(100);
  });

  it('dá o ponto que sobra a quem tem a maior fração descartada', () => {
    // 33,333% três vezes: dois inteiros de 33 e um de 34, nunca 33 três vezes.
    const fatias = costComposition(breakdown({ filament: 1, labor: 1, machine: 1, totalCost: 3 }));
    expect(fatias.map((f) => f.percentLabel).sort()).toEqual([33, 33, 34]);
  });

  it('mantém o percentual exato para a largura da barra', () => {
    const fatias = costComposition(breakdown({ filament: 1, labor: 2, totalCost: 3 }));
    const filamento = fatias.find((f) => f.key === 'filament');
    expect(filamento?.percent).toBeCloseTo(33.3333, 3);
    expect(filamento?.percentLabel).toBe(33);
  });

  it('calcula percentuais que somam 100', () => {
    const fatias = costComposition(breakdown({ filament: 25, labor: 75, totalCost: 100 }));
    expect(fatias.reduce((soma, f) => soma + f.percent, 0)).toBeCloseTo(100, 6);
  });

  it('ordena da maior fatia para a menor', () => {
    const fatias = costComposition(breakdown({ filament: 10, labor: 60, machine: 30, totalCost: 100 }));
    expect(fatias.map((f) => f.key)).toEqual(['labor', 'machine', 'filament']);
  });

  it('omite componentes zerados — fatia invisível só polui a legenda', () => {
    const fatias = costComposition(breakdown({ filament: 50, labor: 50, packaging: 0, totalCost: 100 }));
    expect(fatias.map((f) => f.key)).not.toContain('packaging');
  });
});

describe('dominantSlice', () => {
  it('aponta a fatia dominante acima do limiar', () => {
    const fatias = costComposition(breakdown({ labor: 70, filament: 30, totalCost: 100 }));
    expect(dominantSlice(fatias)?.key).toBe('labor');
  });

  it('não aponta nada quando o custo está distribuído', () => {
    const fatias = costComposition(breakdown({ labor: 35, filament: 35, machine: 30, totalCost: 100 }));
    expect(dominantSlice(fatias)).toBeNull();
  });

  it('não aponta nada com lista vazia', () => {
    expect(dominantSlice([])).toBeNull();
  });
});
