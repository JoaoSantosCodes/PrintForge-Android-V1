import { describe, expect, it } from 'vitest';
import { calculatePrice, type PricingInput } from './pricing';

const baseInput: PricingInput = {
  filamentPriceCentsPerKg: 12000n,
  weightGrams: 100n,
  printTimeMinutes: 120n,
  energyPriceCentsPerKwh: 100n,
  printerPowerWatts: 100n,
  machineCostCentsPerHour: 500n,
  laborCostCentsPerHour: 0n,
  maintenanceCentsPerHour: 100n,
  packagingCents: 200n,
  marginPercent: 30n,
};

const withInput = (changes: Partial<PricingInput>): PricingInput => ({ ...baseInput, ...changes });

describe('PrintForge pricing core', () => {
  it('calcula de forma determinística usando inteiros em centavos', () => {
    expect(calculatePrice(baseInput)).toEqual(calculatePrice(baseInput));
  });
  it('calcula filamento por grama', () => expect(calculatePrice(withInput({ filamentPriceCentsPerKg: 10000n, weightGrams: 100n })).filamentCents).toBe(1000n));
  it('calcula energia por potência e tempo', () => expect(calculatePrice(withInput({ energyPriceCentsPerKwh: 100n, printerPowerWatts: 1000n, printTimeMinutes: 60n })).energyCents).toBe(100n));
  it('calcula máquina proporcionalmente ao tempo', () => expect(calculatePrice(withInput({ machineCostCentsPerHour: 600n, printTimeMinutes: 30n })).machineCents).toBe(300n));
  it('calcula mão de obra proporcionalmente ao tempo', () => expect(calculatePrice(withInput({ laborCostCentsPerHour: 600n, printTimeMinutes: 30n })).laborCents).toBe(300n));
  it('calcula manutenção proporcionalmente ao tempo', () => expect(calculatePrice(withInput({ maintenanceCentsPerHour: 600n, printTimeMinutes: 30n })).maintenanceCents).toBe(300n));
  it('inclui embalagem no custo total', () => { const result = calculatePrice(withInput({ packagingCents: 777n })); expect(result.costCents).toBe(result.filamentCents + result.energyCents + result.machineCents + result.laborCents + result.maintenanceCents + 777n); });
  it('aplica margem sobre o preço de venda', () => { const result = calculatePrice(withInput({ marginPercent: 40n })); expect(result.salePriceCents).toBe((result.costCents * 100n + 30n) / 60n); });
  it('gera lucro positivo com margem maior que zero', () => expect(calculatePrice(baseInput).profitCents).toBeGreaterThan(0n));
  it('gera preço igual ao custo com margem zero', () => { const result = calculatePrice(withInput({ marginPercent: 0n })); expect(result.salePriceCents).toBe(result.costCents); expect(result.profitCents).toBe(0n); });
  it('arredonda frações para o centavo mais próximo', () => expect(calculatePrice(withInput({ filamentPriceCentsPerKg: 1n, weightGrams: 500n })).filamentCents).toBe(1n));
  it('aceita tempo zero', () => { const result = calculatePrice(withInput({ printTimeMinutes: 0n })); expect(result.energyCents).toBe(0n); expect(result.machineCents).toBe(0n); expect(result.laborCents).toBe(0n); expect(result.maintenanceCents).toBe(0n); });
  it('aceita peso zero', () => expect(calculatePrice(withInput({ weightGrams: 0n })).filamentCents).toBe(0n));
  it('rejeita peso negativo', () => expect(() => calculatePrice(withInput({ weightGrams: -1n }))).toThrow('Invalid physical inputs'));
  it('rejeita tempo negativo', () => expect(() => calculatePrice(withInput({ printTimeMinutes: -1n }))).toThrow('Invalid physical inputs'));
  it('rejeita margem negativa', () => expect(() => calculatePrice(withInput({ marginPercent: -1n }))).toThrow('Margin must be between 0 and 99%'));
  it('rejeita margem igual a cem', () => expect(() => calculatePrice(withInput({ marginPercent: 100n }))).toThrow('Margin must be between 0 and 99%'));
  it('rejeita divisor financeiro não aplicável a margem cem', () => expect(() => calculatePrice(withInput({ marginPercent: 100n }))).toThrow());
  it('rejeita custos negativos', () => expect(() => calculatePrice(withInput({ packagingCents: -1n }))).toThrow('Invalid operating costs'));
  it('mantém todos os componentes como bigint', () => { const result = calculatePrice(baseInput); Object.values(result).forEach((value) => expect(typeof value).toBe('bigint')); });
});
