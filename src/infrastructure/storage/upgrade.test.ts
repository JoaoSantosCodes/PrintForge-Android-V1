/**
 * O que acontece com os dados de quem pula da v1.0.1 para a 1.3.0.
 *
 * Este teste existe por uma situação concreta: doze testadores do teste fechado estavam
 * na v1.0.1 (versionCode 5) enquanto o desenvolvimento seguia até a 1.3.0. Entre uma e
 * outra, `QuoteInput` ganhou `quantity` e `modelUrl`, `CalculationRecord` ganhou
 * `hasPhoto`, `Material` ganhou `purchaseUrl`, e nasceram duas chaves de estoque.
 *
 * O risco não é teórico. `createStorageRepository.get()` **apaga a chave** quando o
 * validador recusa o conteúdo — é o que protege contra dado corrompido. Se algum
 * validador passasse a exigir um campo que a v1.0.1 não gravava, atualizar o aplicativo
 * apagaria em silêncio o catálogo e o histórico de doze pessoas reais.
 *
 * Os formatos abaixo foram tirados de `git show c4658de:src/core/types.ts`, o commit da
 * v1.0.1 — não de memória, nem do tipo atual com campos removidos à mão.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  calculationsRepository,
  materialsRepository,
  printersRepository,
  settingsRepository,
  spoolsRepository,
  stockMovementsRepository,
} from './LocalStorageRepository';
import { pieces } from '../../core/quantity';

const memoria = new Map<string, string>();
const falso = {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => { memoria.set(k, v); },
  removeItem: (k: string) => { memoria.delete(k); },
  clear: () => memoria.clear(),
};

// Um aparelho que rodou a v1.0.1: catálogo mexido, dois orçamentos no histórico,
// e nenhuma das chaves que só passaram a existir depois.
const MATERIAL_V101 = {
  id: 'material-pla',
  name: 'PLA',
  pricePerKg: 118,
  density: 1.24,
  createdAt: '2026-09-05T12:00:00.000Z',
};
const IMPRESSORA_V101 = {
  id: 'printer-a1-mini',
  name: 'Bambu Lab A1 Mini',
  powerWatts: 130,
  machineCostPerHour: 5,
  maintenancePerHour: 1,
  createdAt: '2026-09-05T12:00:00.000Z',
};
const ORCAMENTO_V101 = {
  id: 'calc-1',
  createdAt: '2026-09-05T13:30:00.000Z',
  // Sem `quantity` e sem `modelUrl`: nao existiam.
  input: {
    title: 'Chaveiro',
    materialId: 'material-pla',
    printerId: 'printer-a1-mini',
    weightGrams: 12,
    printTimeMinutes: 48,
    energyPricePerKwh: 0.92,
    laborCostPerHour: 20,
    packaging: 2,
    marginPercent: 45,
  },
  material: MATERIAL_V101,
  printer: IMPRESSORA_V101,
  breakdown: {
    filament: 1.42, energy: 0.09, machine: 4, labor: 16,
    maintenance: 0.8, packaging: 2, totalCost: 24.31, profit: 19.89, salePrice: 44.2,
  },
  // Sem `hasPhoto`: nao existia.
};

beforeEach(() => {
  memoria.clear();
  globalThis.localStorage = falso as unknown as Storage;
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({
    energyPricePerKwh: 0.92, laborCostPerHour: 20, packaging: 2, marginPercent: 45,
  }));
  localStorage.setItem(STORAGE_KEYS.materials, JSON.stringify([MATERIAL_V101]));
  localStorage.setItem(STORAGE_KEYS.printers, JSON.stringify([IMPRESSORA_V101]));
  localStorage.setItem(STORAGE_KEYS.calculations, JSON.stringify([ORCAMENTO_V101]));
  // As chaves de estoque nao existem num aparelho vindo da v1.0.1.
});

afterEach(() => memoria.clear());

describe('atualizacao da v1.0.1 para a 1.3.0', () => {
  it('o catalogo sobrevive: material sem purchaseUrl continua valido', () => {
    const materiais = materialsRepository.get();
    expect(materiais).toHaveLength(1);
    expect(materiais[0].name).toBe('PLA');
    expect(materiais[0].pricePerKg).toBe(118);
    // A chave continua no lugar — nao foi apagada pelo validador.
    expect(localStorage.getItem(STORAGE_KEYS.materials)).not.toBeNull();
  });

  it('a impressora sobrevive', () => {
    expect(printersRepository.get()).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEYS.printers)).not.toBeNull();
  });

  it('os ajustes sobrevivem, com o valor que o usuario tinha escolhido', () => {
    expect(settingsRepository.get().marginPercent).toBe(45);
  });

  it('o historico sobrevive: orcamento sem quantity nem hasPhoto continua valido', () => {
    const historico = calculationsRepository.get();
    expect(historico).toHaveLength(1);
    expect(historico[0].input.title).toBe('Chaveiro');
    expect(historico[0].breakdown.salePrice).toBe(44.2);
    expect(localStorage.getItem(STORAGE_KEYS.calculations)).not.toBeNull();
  });

  it('orcamento antigo vale uma peca, e nao zero', () => {
    // O que a baixa de estoque multiplica. Zero aqui daria baixa de 0 g.
    const [antigo] = calculationsRepository.get();
    expect(antigo.input.quantity).toBeUndefined();
    expect(pieces(antigo.input.quantity)).toBe(1);
  });

  it('orcamento antigo nao alega ter foto que nao existe', () => {
    // `hasPhoto` ausente e falso: o cartao nao tenta ler um arquivo inexistente.
    expect(calculationsRepository.get()[0].hasPhoto).toBeFalsy();
  });

  it('o estoque comeca vazio, sem apagar nada e sem quebrar', () => {
    expect(spoolsRepository.get()).toEqual([]);
    expect(stockMovementsRepository.get()).toEqual([]);
  });

  it('nenhuma chave da v1.0.1 foi removida durante a leitura', () => {
    // Le tudo, como o App faz na partida, e so entao confere o que sobrou gravado.
    settingsRepository.get(); materialsRepository.get(); printersRepository.get();
    calculationsRepository.get(); spoolsRepository.get(); stockMovementsRepository.get();

    for (const chave of [STORAGE_KEYS.settings, STORAGE_KEYS.materials, STORAGE_KEYS.printers, STORAGE_KEYS.calculations]) {
      expect(localStorage.getItem(chave), chave).not.toBeNull();
    }
  });
});
