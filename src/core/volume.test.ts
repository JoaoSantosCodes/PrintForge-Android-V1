import { describe, expect, it } from 'vitest';
import { gramsFromVolume, roundForField, volumeFromGrams } from './volume';

const PLA = 1.24;

describe('gramsFromVolume', () => {
  it('multiplica volume pela densidade', () => {
    expect(gramsFromVolume(100, PLA)).toBeCloseTo(124, 5);
  });

  it('trata densidade zero como zero, em vez de gerar massa inválida', () => {
    expect(gramsFromVolume(100, 0)).toBe(0);
  });

  it('trata densidade negativa como zero', () => {
    expect(gramsFromVolume(100, -1.2)).toBe(0);
  });

  it('trata volume negativo como zero', () => {
    expect(gramsFromVolume(-50, PLA)).toBe(0);
  });

  it('trata valores não finitos como zero', () => {
    expect(gramsFromVolume(Number.NaN, PLA)).toBe(0);
    expect(gramsFromVolume(100, Number.NaN)).toBe(0);
  });
});

describe('volumeFromGrams', () => {
  it('divide massa pela densidade', () => {
    expect(volumeFromGrams(124, PLA)).toBeCloseTo(100, 5);
  });

  it('nunca divide por zero', () => {
    expect(volumeFromGrams(124, 0)).toBe(0);
  });

  it('faz ida e volta sem deriva perceptível', () => {
    const original = 87.5;
    expect(volumeFromGrams(gramsFromVolume(original, PLA), PLA)).toBeCloseTo(original, 6);
  });
});

describe('roundForField', () => {
  it('mantém duas casas', () => {
    expect(roundForField(124.005)).toBe(124.01);
    expect(roundForField(70.5645)).toBe(70.56);
  });

  it('não introduz casas em inteiros', () => {
    expect(roundForField(124)).toBe(124);
  });
});
