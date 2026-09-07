import { describe, expect, it, vi } from 'vitest';
import { forget, mirror, restoreMissing } from './durableMirror';

/**
 * Fora do Android a plataforma é 'web' e o espelho precisa ser inerte: no navegador o
 * localStorage já é o armazenamento definitivo, e mexer nele aqui duplicaria escrita.
 */
describe('espelho durável fora do Android', () => {
  it('não grava nada ao espelhar', () => {
    const setItem = vi.fn();
    globalThis.localStorage = { setItem, getItem: () => null, removeItem: vi.fn() } as unknown as Storage;
    mirror('printforge.materials', '[]');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('não remove nada ao esquecer', () => {
    const removeItem = vi.fn();
    globalThis.localStorage = { setItem: vi.fn(), getItem: () => null, removeItem } as unknown as Storage;
    forget('printforge.materials');
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('não restaura chave alguma', async () => {
    const setItem = vi.fn();
    globalThis.localStorage = { setItem, getItem: () => null, removeItem: vi.fn() } as unknown as Storage;
    await expect(restoreMissing(['printforge.materials', 'printforge.printers'])).resolves.toEqual([]);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('resolve sem lançar mesmo com a lista vazia', async () => {
    await expect(restoreMissing([])).resolves.toEqual([]);
  });
});
