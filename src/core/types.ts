export type Material = {
  id: string;
  name: string;
  pricePerKg: number;
  density: number;
  /**
   * Onde recomprar. Opcional, e ausente em catálogos anteriores ao campo — o validador
   * não o exige, então backup antigo continua entrando.
   */
  purchaseUrl?: string;
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
  /**
   * Peças do pedido. Orçamentos gravados antes deste campo existir não o têm — use
   * `pieces()` ao ler um registro do histórico, nunca o valor cru.
   */
  quantity: number;
  /** De onde veio o modelo. Não acompanha o texto compartilhado com o cliente. */
  modelUrl?: string;
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
  quantity: number;
  unitSalePrice: number;
  unitCost: number;
};

/** Registro imutável: input, material e impressora são snapshots do momento do cálculo. */
export type CalculationRecord = {
  id: string;
  createdAt: string;
  input: QuoteInput;
  material: Material;
  printer: Printer;
  breakdown: QuoteBreakdown;
  /**
   * Marca que este orçamento tem foto. O arquivo mora no sistema de arquivos, sob um
   * nome derivado do `id` — aqui fica só a marca, porque uma imagem em base64 dentro do
   * `localStorage` estouraria a cota que o catálogo e o histórico dividem.
   *
   * Ausente nos registros anteriores à funcionalidade, e nos que não têm foto.
   */
  hasPhoto?: boolean;
};

export type StoredSettings = {
  energyPricePerKwh: number;
  laborCostPerHour: number;
  packaging: number;
  marginPercent: number;
};
