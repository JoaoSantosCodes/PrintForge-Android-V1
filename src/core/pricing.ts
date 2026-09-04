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
};

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

  const filamentCents = divRound(
    input.filamentPriceCentsPerKg * input.weightGrams,
    1000n,
  );
  const energyCents = divRound(
    input.energyPriceCentsPerKwh * input.printerPowerWatts * input.printTimeMinutes,
    60_000n,
  );
  const machineCents = divRound(
    input.machineCostCentsPerHour * input.printTimeMinutes,
    60n,
  );
  const laborCents = divRound(
    input.laborCostCentsPerHour * input.printTimeMinutes,
    60n,
  );
  const maintenanceCents = divRound(
    input.maintenanceCentsPerHour * input.printTimeMinutes,
    60n,
  );

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
  };
}
