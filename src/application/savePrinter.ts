import type { Printer } from '../core/types';
import { printersRepository } from '../infrastructure/storage/LocalStorageRepository';

export type PrinterDraft = Omit<Printer, 'id' | 'createdAt'>;

export function savePrinter(draft: PrinterDraft): Printer {
  const name = draft.name.trim();
  if (!name) throw new Error('Informe o nome da impressora.');
  if (draft.powerWatts < 0 || draft.machineCostPerHour < 0 || draft.maintenancePerHour < 0) {
    throw new Error('Os custos e a potência não podem ser negativos.');
  }

  const printer: Printer = {
    ...draft,
    name,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  printersRepository.set([...printersRepository.get(), printer]);
  return printer;
}

export function deletePrinter(id: string): void {
  printersRepository.set(printersRepository.get().filter((printer) => printer.id !== id));
}
