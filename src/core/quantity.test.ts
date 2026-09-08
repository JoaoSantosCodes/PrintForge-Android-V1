import { describe, expect, it } from 'vitest';
import { pieces } from './quantity';

describe('pieces', () => {
  it('trata orçamento antigo, sem o campo, como uma peça', () => {
    expect(pieces(undefined)).toBe(1);
  });

  it('nunca desce abaixo de uma peça', () => {
    expect(pieces(0)).toBe(1);
    expect(pieces(-3)).toBe(1);
  });

  it('descarta a fração: não existe meia peça', () => {
    expect(pieces(2.9)).toBe(2);
  });

  it('rejeita valores não finitos', () => {
    expect(pieces(Number.NaN)).toBe(1);
    expect(pieces(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it('preserva a quantidade válida', () => {
    expect(pieces(5)).toBe(5);
  });
});
