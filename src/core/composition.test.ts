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
