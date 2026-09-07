import { describe, expect, it } from 'vitest';
import { appendCalculation, HISTORY_LIMIT } from './history';
import type { CalculationRecord } from './types';

const record = (id: string): CalculationRecord => ({
  id,
  createdAt: `2026-09-0${(Number(id) % 9) + 1}T12:00:00.000Z`,
  input: { title: `Peça ${id}`, materialId: 'pla', printerId: 'a1', weightGrams: 100, printTimeMinutes: 120, energyPricePerKwh: 1, laborCostPerHour: 25, packaging: 2, marginPercent: 30 },
  material: { id: 'pla', name: 'PLA', pricePerKg: 120, density: 1.24, createdAt: '2026-01-01T00:00:00.000Z' },
  printer: { id: 'a1', name: 'A1 Mini', powerWatts: 130, machineCostPerHour: 5, maintenancePerHour: 1, createdAt: '2026-01-01T00:00:00.000Z' },
  breakdown: { filament: 12, energy: 0.3, machine: 10, labor: 50, maintenance: 2, packaging: 2, totalCost: 76.3, profit: 32.7, salePrice: 109 },
});

const listOf = (n: number) => Array.from({ length: n }, (_, i) => record(String(i)));

describe('appendCalculation', () => {
  it('coloca o novo cálculo no topo', () => {
    const { list } = appendCalculation(listOf(3), record('novo'));
    expect(list[0].id).toBe('novo');
    expect(list).toHaveLength(4);
  });

  it('não descarta nada abaixo do teto', () => {
    const { dropped } = appendCalculation(listOf(10), record('novo'), 500);
    expect(dropped).toBe(0);
  });

  it('descarta o mais antigo ao encostar no teto', () => {
    const { list, dropped } = appendCalculation(listOf(5), record('novo'), 5);
    expect(dropped).toBe(1);
    expect(list).toHaveLength(5);
    expect(list[0].id).toBe('novo');
    expect(list.some((item) => item.id === '4')).toBe(false);
  });

  it('nunca cresce além do teto, mesmo partindo de uma lista já estourada', () => {
    const { list, dropped } = appendCalculation(listOf(20), record('novo'), 5);
    expect(list).toHaveLength(5);
    expect(dropped).toBe(16);
  });

  it('não altera a lista original', () => {
    const original = listOf(3);
    appendCalculation(original, record('novo'), 3);
    expect(original).toHaveLength(3);
    expect(original[0].id).toBe('0');
  });

  it('preserva a cópia de material e impressora — o histórico é instantâneo, não referência', () => {
    const antigo = record('antigo');
    antigo.material.pricePerKg = 80;
    const { list } = appendCalculation([antigo], record('novo'));
    expect(list[1].material.pricePerKg).toBe(80);
  });

  it('o teto padrão cabe na cota do localStorage', () => {
    // ~750 bytes por registro; 500 registros ficam perto de 365 kB.
    expect(HISTORY_LIMIT * 750).toBeLessThan(1024 * 1024);
  });
});
