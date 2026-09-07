import { describe, expect, it } from 'vitest';
import { clampNumericField, maskDecimal, maskInteger, numberValue } from './input';

describe('numberValue', () => {
  it('converte texto simples', () => {
    expect(numberValue('12.5')).toBe(12.5);
  });

  it('aceita vírgula como separador decimal', () => {
    expect(numberValue('12,5')).toBe(12.5);
  });

  it('trata texto inválido como zero', () => {
    expect(numberValue('abc')).toBe(0);
    expect(numberValue('')).toBe(0);
  });

  it('bloqueia negativos — um preço negativo silenciaria o custo do filamento', () => {
    expect(numberValue('-10')).toBe(0);
    expect(numberValue('-0,5')).toBe(0);
  });

  it('trata valores não finitos como zero', () => {
    expect(numberValue('Infinity')).toBe(0);
    expect(numberValue('-Infinity')).toBe(0);
  });
});

describe('clampNumericField', () => {
  it('limita a margem a 99% — calculatePrice rejeita 100 ou mais', () => {
    expect(clampNumericField('marginPercent', 150)).toBe(99);
    expect(clampNumericField('marginPercent', 99)).toBe(99);
    expect(clampNumericField('marginPercent', 20)).toBe(20);
  });

  it('não impõe teto aos demais campos', () => {
    expect(clampNumericField('packaging', 5000)).toBe(5000);
    expect(clampNumericField('weightGrams', 12345)).toBe(12345);
  });
});

describe('maskDecimal', () => {
  it('aceita dígitos', () => {
    expect(maskDecimal('123', '')).toBe('123');
  });

  it('aceita o campo vazio — apagar tudo é legítimo', () => {
    expect(maskDecimal('', '12')).toBe('');
  });

  it('aceita estados intermediários de digitação', () => {
    expect(maskDecimal('1,', '1')).toBe('1,');
    expect(maskDecimal('0.', '0')).toBe('0.');
    expect(maskDecimal(',5', '')).toBe(',5');
  });

  it('rejeita letras devolvendo o texto anterior', () => {
    expect(maskDecimal('12a', '12')).toBe('12');
    expect(maskDecimal('abc', '')).toBe('');
  });

  it('rejeita o segundo separador', () => {
    expect(maskDecimal('1,5,', '1,5')).toBe('1,5');
    expect(maskDecimal('1.5.2', '1.5')).toBe('1.5');
  });

  it('rejeita o sinal de menos — negativo não existe neste domínio', () => {
    expect(maskDecimal('-5', '')).toBe('');
  });
});

describe('maskInteger', () => {
  it('aceita dígitos', () => {
    expect(maskInteger('120', '')).toBe('120');
  });

  it('aceita campo vazio', () => {
    expect(maskInteger('', '12')).toBe('');
  });

  it('rejeita separador decimal — meia hora se digita como 30 minutos', () => {
    expect(maskInteger('1,', '1')).toBe('1');
    expect(maskInteger('1,5', '1')).toBe('1');
    expect(maskInteger('1.5', '1')).toBe('1');
  });

  it('rejeita letras e sinal', () => {
    expect(maskInteger('2h', '2')).toBe('2');
    expect(maskInteger('-3', '')).toBe('');
  });
});
