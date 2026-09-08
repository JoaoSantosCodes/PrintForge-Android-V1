import { calculatePrice } from '../core/pricing';
import { fromCents, toCents } from '../core/money';
import { pieces } from '../core/quantity';
import type { Material, Printer, QuoteBreakdown, QuoteInput } from '../core/types';

export function calculateQuote(
  input: QuoteInput,
  material: Material,
  printer: Printer,
): QuoteBreakdown {
  const result = calculatePrice({
    filamentPriceCentsPerKg: toCents(material.pricePerKg),
    weightGrams: BigInt(Math.max(0, Math.round(input.weightGrams))),
    printTimeMinutes: BigInt(Math.max(0, Math.round(input.printTimeMinutes))),
    energyPriceCentsPerKwh: toCents(input.energyPricePerKwh),
    printerPowerWatts: BigInt(Math.max(0, Math.round(printer.powerWatts))),
    machineCostCentsPerHour: toCents(printer.machineCostPerHour),
    laborCostCentsPerHour: toCents(input.laborCostPerHour),
    maintenanceCentsPerHour: toCents(printer.maintenancePerHour),
    packagingCents: toCents(input.packaging),
    marginPercent: BigInt(Math.min(99, Math.max(0, Math.round(input.marginPercent)))),
    quantity: BigInt(pieces(input.quantity)),
  });

  return {
    filament: fromCents(result.filamentCents),
    energy: fromCents(result.energyCents),
    machine: fromCents(result.machineCents),
    labor: fromCents(result.laborCents),
    maintenance: fromCents(result.maintenanceCents),
    packaging: fromCents(result.packagingCents),
    totalCost: fromCents(result.costCents),
    profit: fromCents(result.profitCents),
    salePrice: fromCents(result.salePriceCents),
    quantity: Number(result.quantity),
    unitSalePrice: fromCents(result.unitSalePriceCents),
    unitCost: fromCents(result.unitCostCents),
  };
}
