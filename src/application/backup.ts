import type { CalculationRecord, Material, Printer, StoredSettings } from '../core/types';
import {
  isCalculationList,
  isMaterialList,
  isPrinterList,
  isSettings,
} from '../infrastructure/storage/LocalStorageRepository';

/** Sobe quando o formato mudar de um jeito que versões antigas não leriam. */
export const BACKUP_VERSION = 1;

export type Backup = {
  app: 'printforge';
  version: number;
  exportedAt: string;
  settings: StoredSettings;
  materials: Material[];
  printers: Printer[];
  calculations: CalculationRecord[];
};

export type BackupContents = Omit<Backup, 'app' | 'version' | 'exportedAt'>;

export type ReadResult =
  | { ok: true; backup: Backup }
  | { ok: false; reason: string };

export function createBackup(contents: BackupContents): Backup {
  return {
    app: 'printforge',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...contents,
  };
}

/** Nome com data, para o usuário distinguir backups na pasta de downloads. */
export function backupFileName(now: Date = new Date()): string {
  return `printforge-backup-${now.toISOString().slice(0, 10)}.json`;
}

/**
 * Lê e valida um backup.
 *
 * A mensagem de erro precisa dizer o que houve e o que fazer — quem importa um arquivo
 * errado está tentando recuperar dados e merece saber se pegou o arquivo de outro app
 * ou se o backup está corrompido.
 */
export function readBackup(raw: string): ReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'O arquivo não é um JSON válido. Escolha um backup exportado pelo PrintForge.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'O arquivo está vazio ou não tem o formato esperado.' };
  }

  const data = parsed as Record<string, unknown>;

  if (data.app !== 'printforge') {
    return { ok: false, reason: 'Este arquivo não é um backup do PrintForge.' };
  }

  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return { ok: false, reason: 'Este backup veio de uma versão mais nova do app. Atualize o PrintForge e tente de novo.' };
  }

  if (!isSettings(data.settings)) return { ok: false, reason: 'Os ajustes do backup estão corrompidos.' };
  if (!isMaterialList(data.materials)) return { ok: false, reason: 'A lista de materiais do backup está corrompida.' };
  if (!isPrinterList(data.printers)) return { ok: false, reason: 'A lista de impressoras do backup está corrompida.' };
  if (!isCalculationList(data.calculations)) return { ok: false, reason: 'O histórico do backup está corrompido.' };

  return {
    ok: true,
    backup: {
      app: 'printforge',
      version: data.version,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      settings: data.settings,
      materials: data.materials,
      printers: data.printers,
      calculations: data.calculations,
    },
  };
}
