import { describe, expect, it } from 'vitest';
import {
  approximateBytes,
  base64FromDataUrl,
  dataUrlFromBase64,
  fitWithin,
  MAX_PHOTO_EDGE,
  photoFileName,
} from './photo';

describe('fitWithin', () => {
  it('não amplia imagem menor que o limite', () => {
    expect(fitWithin(400, 300)).toEqual({ width: 400, height: 300 });
  });

  it('reduz pelo maior lado, preservando a proporção', () => {
    const { width, height } = fitWithin(4000, 3000);
    expect(width).toBe(MAX_PHOTO_EDGE);
    expect(height).toBe(960);
    expect(width / height).toBeCloseTo(4000 / 3000, 5);
  });

  it('funciona igual em retrato', () => {
    const { width, height } = fitWithin(3000, 4000);
    expect(height).toBe(MAX_PHOTO_EDGE);
    expect(width).toBe(960);
  });

  it('nunca devolve dimensão zero para imagem muito estreita', () => {
    const { width } = fitWithin(10000, 3);
    expect(width).toBe(MAX_PHOTO_EDGE);
    expect(fitWithin(10000, 3).height).toBeGreaterThanOrEqual(1);
  });

  it('devolve zero para entrada inválida em vez de propagar NaN', () => {
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(Number.NaN, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe('photoFileName', () => {
  it('deriva o nome do id do orçamento, para apagar sem índice à parte', () => {
    expect(photoFileName('calc-9')).toBe('foto-calc-9.jpg');
  });
});

describe('data URL', () => {
  it('extrai o base64 do data URL', () => {
    expect(base64FromDataUrl('data:image/jpeg;base64,AAAA')).toBe('AAAA');
  });

  it('aceita base64 puro, sem prefixo', () => {
    expect(base64FromDataUrl('AAAA')).toBe('AAAA');
  });

  it('faz o caminho de volta', () => {
    expect(base64FromDataUrl(dataUrlFromBase64('AAAA'))).toBe('AAAA');
  });
});

describe('approximateBytes', () => {
  it('estima o binário a três quartos do texto', () => {
    expect(approximateBytes('AAAA')).toBe(3);
  });

  it('desconta o preenchimento', () => {
    expect(approximateBytes('AAA=')).toBe(2);
    expect(approximateBytes('AA==')).toBe(1);
  });

  it('não devolve número negativo para entrada curta', () => {
    expect(approximateBytes('')).toBe(0);
  });
});
