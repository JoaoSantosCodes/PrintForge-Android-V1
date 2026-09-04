export type Material = {
  id: string;
  name: string;
  pricePerKg: number;
  density: number;
  createdAt: string;
};

export type Printer = {
  id: string;
  name: string;
  powerWatts: number;
  machineCostPerHour: number;
  maintenancePerHour: number;
  createdAt: string;
};

export type QuoteInput = {
  title: string;
  materialId: string;
  printerId: string;
  weightGrams: number;
  printTimeMinutes: number;
  energyPricePerKwh: number;
  laborCostPerHour: number;
  packaging: number;
  marginPercent: number;
};

export type QuoteBreakdown = {
  filament: number;
  energy: number;
  machine: number;
  labor: number;
  maintenance: number;
  packaging: number;
  totalCost: number;
  profit: number;
  salePrice: number;
};

/** Registro imutável: input, material e impressora são snapshots do momento do cálculo. */
export type CalculationRecord = {
  id: string;
  createdAt: string;
  input: QuoteInput;
  material: Material;
  printer: Printer;
  breakdown: QuoteBreakdown;
};

export type StoredSettings = {
  energyPricePerKwh: number;
  laborCostPerHour: number;
  packaging: number;
  marginPercent: number;
};
