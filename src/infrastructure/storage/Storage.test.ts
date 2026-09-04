import { afterEach, describe, expect, it } from 'vitest';
import { createStorageRepository } from './Storage';

type LocalStorageMock = {
  data: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const storage: LocalStorageMock = {
  data: new Map(),
  getItem(key) { return this.data.get(key) ?? null; },
  setItem(key, value) { this.data.set(key, value); },
  removeItem(key) { this.data.delete(key); },
};

afterEach(() => storage.data.clear());

describe('StorageRepository', () => {
  it('recupera o fallback quando o JSON está corrompido', () => {
    globalThis.localStorage = storage as unknown as Storage;
    storage.setItem('corrupt', '{not-json');
    const repository = createStorageRepository('corrupt', { ready: false });
    expect(repository.get()).toEqual({ ready: false });
    expect(storage.getItem('corrupt')).toBeNull();
  });

  it('recupera o fallback quando o schema não passa no validador', () => {
    globalThis.localStorage = storage as unknown as Storage;
    storage.setItem('validated', JSON.stringify({ value: 'texto' }));
    const repository = createStorageRepository('validated', { value: 0 }, (value): value is { value: number } => Boolean(value && typeof value === 'object' && typeof (value as { value?: unknown }).value === 'number'));
    expect(repository.get()).toEqual({ value: 0 });
  });

  it('persiste, lê e limpa valores válidos', () => {
    globalThis.localStorage = storage as unknown as Storage;
    const repository = createStorageRepository('valid', [], (value): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string'));
    repository.set(['PLA', 'PETG']);
    expect(repository.get()).toEqual(['PLA', 'PETG']);
    repository.clear();
    expect(repository.get()).toEqual([]);
  });
});
