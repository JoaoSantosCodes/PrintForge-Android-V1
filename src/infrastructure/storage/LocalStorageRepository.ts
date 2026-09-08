import type { CalculationRecord, Material, Printer, StoredSettings } from '../../core/types';
import type { Spool, StockMovement } from '../../core/stock';
import { createStorageRepository, type StorageValidator } from './Storage';

export const STORAGE_KEYS = {
  settings: 'printforge.settings',
  materials: 'printforge.materials',
  printers: 'printforge.printers',
  calculations: 'printforge.calculations',
  spools: 'printforge.spools',
  stockMovements: 'printforge.stockMovements',
} as const;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const isSettings: StorageValidator<StoredSettings> = (value): value is StoredSettings => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return isFiniteNumber(item.energyPricePerKwh) && isFiniteNumber(item.laborCostPerHour) && isFiniteNumber(item.packaging) && isFiniteNumber(item.marginPercent);
};
const isMaterial: StorageValidator<Material> = (value): value is Material => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.name === 'string' && isFiniteNumber(item.pricePerKg) && isFiniteNumber(item.density) && typeof item.createdAt === 'string';
};
const isPrinter: StorageValidator<Printer> = (value): value is Printer => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.name === 'string' && isFiniteNumber(item.powerWatts) && isFiniteNumber(item.machineCostPerHour) && isFiniteNumber(item.maintenancePerHour) && typeof item.createdAt === 'string';
};
const isCalculation: StorageValidator<CalculationRecord> = (value): value is CalculationRecord => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.createdAt === 'string' && !!item.input && !!item.material && !!item.printer && !!item.breakdown;
};

const isSpool: StorageValidator<Spool> = (value): value is Spool => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.materialId === 'string'
    && typeof item.color === 'string' && typeof item.brand === 'string'
    && isFiniteNumber(item.nominalGrams) && isFiniteNumber(item.baselineGrams)
    && typeof item.createdAt === 'string';
};
const isMovement: StorageValidator<StockMovement> = (value): value is StockMovement => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.spoolId === 'string'
    && (item.kind === 'out' || item.kind === 'adjust')
    && isFiniteNumber(item.grams) && typeof item.createdAt === 'string'
    && typeof item.note === 'string';
};

export const isMaterialList: StorageValidator<Material[]> = (value): value is Material[] => Array.isArray(value) && value.every(isMaterial);
export const isSpoolList: StorageValidator<Spool[]> = (value): value is Spool[] => Array.isArray(value) && value.every(isSpool);
export const isMovementList: StorageValidator<StockMovement[]> = (value): value is StockMovement[] => Array.isArray(value) && value.every(isMovement);
export const isPrinterList: StorageValidator<Printer[]> = (value): value is Printer[] => Array.isArray(value) && value.every(isPrinter);
export const isCalculationList: StorageValidator<CalculationRecord[]> = (value): value is CalculationRecord[] => Array.isArray(value) && value.every(isCalculation);

const settingsFallback: StoredSettings = {
  energyPricePerKwh: 1,
  laborCostPerHour: 0,
  packaging: 2,
  marginPercent: 40,
};

function migrateLegacySettings(): StoredSettings | null {
  try {
    const raw = localStorage.getItem('printforge-values');
    if (!raw) return null;
    const legacy = JSON.parse(raw) as Record<string, unknown>;
    const migrated: StoredSettings = {
      energyPricePerKwh: isFiniteNumber(legacy.kwh) ? legacy.kwh : settingsFallback.energyPricePerKwh,
      laborCostPerHour: isFiniteNumber(legacy.laborHour) ? legacy.laborHour : settingsFallback.laborCostPerHour,
      packaging: isFiniteNumber(legacy.packaging) ? legacy.packaging : settingsFallback.packaging,
      marginPercent: isFiniteNumber(legacy.margin) ? Math.min(99, Math.max(0, legacy.margin)) : settingsFallback.marginPercent,
    };
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(migrated));
    localStorage.removeItem('printforge-values');
    return migrated;
  } catch {
    return null;
  }
}

const settingsBase = createStorageRepository(STORAGE_KEYS.settings, settingsFallback, isSettings);
export const settingsRepository = {
  ...settingsBase,
  get() {
    try {
      if (localStorage.getItem(STORAGE_KEYS.settings)) return settingsBase.get();
    } catch { /* segue para a configuração padrão */ }
    return migrateLegacySettings() ?? settingsFallback;
  },
};

export const materialsRepository = createStorageRepository<Material[]>(STORAGE_KEYS.materials, [], isMaterialList);
export const printersRepository = createStorageRepository<Printer[]>(STORAGE_KEYS.printers, [], isPrinterList);
export const calculationsRepository = createStorageRepository<CalculationRecord[]>(STORAGE_KEYS.calculations, [], isCalculationList);
export const spoolsRepository = createStorageRepository<Spool[]>(STORAGE_KEYS.spools, [], isSpoolList);
export const stockMovementsRepository = createStorageRepository<StockMovement[]>(STORAGE_KEYS.stockMovements, [], isMovementList);
