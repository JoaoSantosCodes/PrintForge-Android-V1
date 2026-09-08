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
  quantity: 1n,
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

describe('quantidade', () => {
  it('multiplica as linhas por peça e mantém a embalagem uma vez por pedido', () => {
    const uma = calculatePrice(baseInput);
    const cinco = calculatePrice(withInput({ quantity: 5n }));

    expect(cinco.filamentCents).toBe(uma.filamentCents * 5n);
    expect(cinco.energyCents).toBe(uma.energyCents * 5n);
    expect(cinco.machineCents).toBe(uma.machineCents * 5n);
    expect(cinco.maintenanceCents).toBe(uma.maintenanceCents * 5n);
    expect(cinco.packagingCents).toBe(uma.packagingCents);
  });

  /**
   * A consequência que justifica a decisão: com a embalagem diluída no pedido, cinco
   * peças custam menos que cinco vezes uma. É o que permite dar desconto por lote sem
   * inventar número.
   */
  it('o preço por peça cai conforme a quantidade sobe', () => {
    const uma = calculatePrice(baseInput);
    const cinco = calculatePrice(withInput({ quantity: 5n }));
    expect(cinco.unitSalePriceCents).toBeLessThan(uma.salePriceCents);
    expect(cinco.salePriceCents).toBeLessThan(uma.salePriceCents * 5n);
  });

  it('a soma das linhas continua fechando com o custo do pedido', () => {
    const r = calculatePrice(withInput({ quantity: 7n }));
    expect(r.costCents).toBe(
      r.filamentCents + r.energyCents + r.machineCents + r.laborCents + r.maintenanceCents + r.packagingCents,
    );
  });

  it('quantidade 1 dá exatamente o mesmo resultado de antes do campo existir', () => {
    const r = calculatePrice(baseInput);
    expect(r.unitSalePriceCents).toBe(r.salePriceCents);
    expect(r.unitCostCents).toBe(r.costCents);
  });

  it('recusa quantidade menor que 1', () => {
    expect(() => calculatePrice(withInput({ quantity: 0n }))).toThrow();
    expect(() => calculatePrice(withInput({ quantity: -1n }))).toThrow();
  });

  it('não perde centavo ao escalar: a linha é múltiplo exato do valor de uma peça', () => {
    // 3 pecas de um filamento cujo valor unitario nao e redondo.
    const r = calculatePrice(withInput({ filamentPriceCentsPerKg: 12345n, weightGrams: 37n, quantity: 3n }));
    expect(r.filamentCents % 3n).toBe(0n);
  });
});
