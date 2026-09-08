import { describe, expect, it } from 'vitest';
import { backupFileName, BACKUP_VERSION, createBackup, readBackup, type BackupContents } from './backup';

const contents: BackupContents = {
  settings: { energyPricePerKwh: 1, laborCostPerHour: 25, packaging: 2, marginPercent: 30 },
  materials: [{ id: 'pla', name: 'PLA', pricePerKg: 120, density: 1.24, createdAt: '2026-01-01T00:00:00.000Z' }],
  printers: [{ id: 'a1', name: 'A1 Mini', powerWatts: 130, machineCostPerHour: 5, maintenancePerHour: 1, createdAt: '2026-01-01T00:00:00.000Z' }],
  calculations: [],
  spools: [{ id: 'bobina-1', materialId: 'pla', color: 'Preto', brand: 'Voolt', nominalGrams: 1000, baselineGrams: 1000, createdAt: '2026-09-01T00:00:00.000Z' }],
  stockMovements: [{ id: 'mov-1', spoolId: 'bobina-1', kind: 'out', grams: 128, createdAt: '2026-09-07T00:00:00.000Z', note: 'Case Raspberry Pi' }],
};

const round = (value: BackupContents) => readBackup(JSON.stringify(createBackup(value)));

describe('createBackup', () => {
  it('carimba app, versão e data', () => {
    const backup = createBackup(contents);
    expect(backup.app).toBe('printforge');
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(Date.parse(backup.exportedAt)).not.toBeNaN();
  });
});

describe('backupFileName', () => {
  it('inclui a data para distinguir arquivos', () => {
    expect(backupFileName(new Date('2026-09-07T15:00:00.000Z'))).toBe('printforge-backup-2026-09-07.json');
  });
});

describe('readBackup', () => {
  it('faz ida e volta preservando o conteúdo', () => {
    const result = round(contents);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.materials).toEqual(contents.materials);
    expect(result.backup.printers).toEqual(contents.printers);
    expect(result.backup.settings).toEqual(contents.settings);
  });

  /**
   * A versão 1 do backup é anterior ao estoque. Recusar esses arquivos puniria quem
   * exportou antes da funcionalidade existir — justamente as pessoas que o backup
   * deveria proteger.
   */
  it('aceita um backup da versão 1, que não tinha estoque', () => {
    const v1 = {
      app: 'printforge',
      version: 1,
      exportedAt: '2026-09-04T10:00:00.000Z',
      settings: contents.settings,
      materials: contents.materials,
      printers: contents.printers,
      calculations: [],
    };
    const result = readBackup(JSON.stringify(v1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.spools).toEqual([]);
    expect(result.backup.stockMovements).toEqual([]);
    expect(result.backup.materials).toEqual(contents.materials);
  });

  it('preserva bobinas e extrato na ida e volta', () => {
    const result = round(contents);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.spools).toEqual(contents.spools);
    expect(result.backup.stockMovements).toEqual(contents.stockMovements);
  });

  it('recusa bobinas malformadas com mensagem própria', () => {
    const quebrado = { ...createBackup(contents), spools: [{ id: 'x' }] };
    const result = readBackup(JSON.stringify(quebrado));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('bobinas');
  });

  it('recusa extrato malformado com mensagem própria', () => {
    const quebrado = { ...createBackup(contents), stockMovements: [{ id: 'x', spoolId: 'y', kind: 'entrada' }] };
    const result = readBackup(JSON.stringify(quebrado));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('extrato');
  });

  it('rejeita JSON inválido explicando o que fazer', () => {
    const result = readBackup('{quebrado');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('JSON');
  });

  it('rejeita arquivo de outro aplicativo', () => {
    const result = readBackup(JSON.stringify({ app: 'outro', version: 1 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('não é um backup do PrintForge');
  });

  it('rejeita backup de versão futura', () => {
    const result = readBackup(JSON.stringify({ ...createBackup(contents), version: BACKUP_VERSION + 1 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('versão mais nova');
  });

  it('rejeita material com preço em texto', () => {
    const quebrado = { ...createBackup(contents), materials: [{ id: 'x', name: 'X', pricePerKg: '120', density: 1.2, createdAt: 'a' }] };
    const result = readBackup(JSON.stringify(quebrado));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('materiais');
  });

  it('rejeita ajustes faltando campo', () => {
    const quebrado = { ...createBackup(contents), settings: { energyPricePerKwh: 1 } };
    const result = readBackup(JSON.stringify(quebrado));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('ajustes');
  });

  it('rejeita null sem lançar', () => {
    expect(readBackup('null').ok).toBe(false);
  });
});
