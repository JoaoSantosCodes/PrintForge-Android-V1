/**
 * PrintForge Financial Core — puro, determinístico e independente da UI.
 * Valores monetários são representados como inteiros em centavos.
 * Tempo é representado em minutos; massa, em gramas.
 */

export type PricingInput = {
  filamentPriceCentsPerKg: bigint;
  weightGrams: bigint;
  printTimeMinutes: bigint;
  energyPriceCentsPerKwh: bigint;
  printerPowerWatts: bigint;
  machineCostCentsPerHour: bigint;
  laborCostCentsPerHour: bigint;
  maintenanceCentsPerHour: bigint;
  packagingCents: bigint;
  marginPercent: bigint;
  /** Peças do pedido. Nunca menor que 1. */
  quantity: bigint;
};

/**
 * As linhas são sempre o total do pedido, não o valor de uma peça: é o que a soma exibida
 * precisa fechar. Os valores unitários vêm separados, e são derivados.
 */
export type PricingBreakdown = {
  filamentCents: bigint;
  energyCents: bigint;
  machineCents: bigint;
  laborCents: bigint;
  maintenanceCents: bigint;
  packagingCents: bigint;
  costCents: bigint;
  profitCents: bigint;
  salePriceCents: bigint;
  quantity: bigint;
  /**
   * Preço de uma peça, arredondado.
   *
   * Derivado do total, e não o contrário: com a embalagem cobrada uma vez por pedido, o
   * total não é múltiplo exato do unitário, e multiplicar de volta pode dar um centavo de
   * diferença. O número que vale é o do pedido — é o que o cliente paga.
   */
  unitSalePriceCents: bigint;
  unitCostCents: bigint;
};

function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('Divisor must be positive');
  return (numerator + denominator / 2n) / denominator;
}

export function calculatePrice(input: PricingInput): PricingBreakdown {
  if (input.weightGrams < 0n || input.printTimeMinutes < 0n) {
    throw new Error('Invalid physical inputs');
  }
  if (input.filamentPriceCentsPerKg < 0n || input.energyPriceCentsPerKwh < 0n) {
    throw new Error('Invalid energy or material inputs');
  }
  if (
    input.printerPowerWatts < 0n ||
    input.machineCostCentsPerHour < 0n ||
    input.laborCostCentsPerHour < 0n ||
    input.maintenanceCentsPerHour < 0n ||
    input.packagingCents < 0n
  ) {
    throw new Error('Invalid operating costs');
  }
  if (input.marginPercent < 0n || input.marginPercent >= 100n) {
    throw new Error('Margin must be between 0 and 99%');
  }
  if (input.quantity < 1n) {
    throw new Error('Quantity must be at least 1');
  }

  // Cada linha é arredondada por peça e só então multiplicada, e não o contrário: assim o
  // valor de uma peça é exato e o total é múltiplo dele, sem centavo aparecendo do nada
  // quando o cliente confere a conta multiplicando.
  const unitFilamentCents = divRound(
    input.filamentPriceCentsPerKg * input.weightGrams,
    1000n,
  );
  const unitEnergyCents = divRound(
    input.energyPriceCentsPerKwh * input.printerPowerWatts * input.printTimeMinutes,
    60_000n,
  );
  const unitMachineCents = divRound(
    input.machineCostCentsPerHour * input.printTimeMinutes,
    60n,
  );
  const unitLaborCents = divRound(
    input.laborCostCentsPerHour * input.printTimeMinutes,
    60n,
  );
  const unitMaintenanceCents = divRound(
    input.maintenanceCentsPerHour * input.printTimeMinutes,
    60n,
  );

  const filamentCents = unitFilamentCents * input.quantity;
  const energyCents = unitEnergyCents * input.quantity;
  const machineCents = unitMachineCents * input.quantity;
  const laborCents = unitLaborCents * input.quantity;
  const maintenanceCents = unitMaintenanceCents * input.quantity;

  // A embalagem entra uma vez por pedido: cinco chaveiros vão no mesmo saquinho. É também
  // o que faz o preço unitário cair conforme a quantidade sobe, que é o que justifica
  // desconto por lote.
  const costCents =
    filamentCents +
    energyCents +
    machineCents +
    laborCents +
    maintenanceCents +
    input.packagingCents;

  // A margem é um percentual do preço de venda: preço = custo / (1 - margem).
  const denominator = 100n - input.marginPercent;
  const salePriceCents = divRound(costCents * 100n, denominator);
  const profitCents = salePriceCents - costCents;

  return {
    filamentCents,
    energyCents,
    machineCents,
    laborCents,
    maintenanceCents,
    packagingCents: input.packagingCents,
    costCents,
    profitCents,
    salePriceCents,
    quantity: input.quantity,
    unitSalePriceCents: divRound(salePriceCents, input.quantity),
    unitCostCents: divRound(costCents, input.quantity),
  };
}
