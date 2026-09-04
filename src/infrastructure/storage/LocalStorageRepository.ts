import type { CalculationRecord, Material, Printer, StoredSettings } from '../../core/types';
import { createStorageRepository, type StorageValidator } from './Storage';

export const STORAGE_KEYS = {
  settings: 'printforge.settings',
  materials: 'printforge.materials',
  printers: 'printforge.printers',
  calculations: 'printforge.calculations',
} as const;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isSettings: StorageValidator<StoredSettings> = (value): value is StoredSettings => {
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

const isMaterialList: StorageValidator<Material[]> = (value): value is Material[] => Array.isArray(value) && value.every(isMaterial);
const isPrinterList: StorageValidator<Printer[]> = (value): value is Printer[] => Array.isArray(value) && value.every(isPrinter);
const isCalculationList: StorageValidator<CalculationRecord[]> = (value): value is CalculationRecord[] => Array.isArray(value) && value.every(isCalculation);

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
