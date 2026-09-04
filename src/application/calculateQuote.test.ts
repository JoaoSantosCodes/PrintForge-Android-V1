import { describe, expect, it } from 'vitest';
import { calculateQuote } from './calculateQuote';
import type { Material, Printer, QuoteInput } from '../core/types';

const material: Material = {
  id: 'pla',
  name: 'PLA',
  pricePerKg: 120,
  density: 1.24,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const printer: Printer = {
  id: 'a1-mini',
  name: 'Bambu Lab A1 Mini',
  powerWatts: 130,
  machineCostPerHour: 5,
  maintenancePerHour: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const input: QuoteInput = {
  title: 'Suporte F1',
  materialId: material.id,
  printerId: printer.id,
  weightGrams: 42,
  printTimeMinutes: 135,
  energyPricePerKwh: 1,
  laborCostPerHour: 0,
  packaging: 2,
  marginPercent: 40,
};

describe('calculateQuote', () => {
  it('integra o snapshot de material e impressora ao cálculo', () => {
    const result = calculateQuote(input, material, printer);

    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.salePrice).toBeGreaterThan(result.totalCost);
    expect(result.profit).toBeCloseTo(result.salePrice - result.totalCost, 2);
  });
});
