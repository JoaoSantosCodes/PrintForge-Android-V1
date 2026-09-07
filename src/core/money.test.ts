import { describe, expect, it } from 'vitest';
import { fromCents, money, toCents } from './money';

/**
 * `toLocaleString('pt-BR', { style: 'currency' })` separa o símbolo do valor com espaço
 * não separável (U+00A0), não com espaço comum. Escrever o esperado com espaço normal
 * faz o teste falhar mostrando duas strings visualmente idênticas — daí o escape
 * explícito, em vez do caractere solto no código.
 */
const brl = (texto: string) => texto.replace(' ', '\u00a0');

/**
 * `money` aceita os dois formatos, e é justamente aí que mora a armadilha: o mesmo
 * argumento numérico significa reais ou centavos conforme o tipo em tempo de execução,
 * e o TypeScript não distingue um engano do outro. Um `* 100` a mais na tela de cálculo
 * exibia R$ 12.000,00 para um filamento de R$ 120,00 e passou pela tipagem sem um aviso.
 *
 * Estes testes existem para que o contrato fique escrito em algum lugar além do corpo da
 * função.
 */
describe('money', () => {
  it('trata bigint como centavos', () => {
    expect(money(12000n)).toBe(brl('R$ 120,00'));
  });

  it('trata number como reais', () => {
    expect(money(120)).toBe(brl('R$ 120,00'));
  });

  it('não confunde os dois formatos: o mesmo valor nos dois tipos difere em 100 vezes', () => {
    expect(money(120n)).toBe(brl('R$ 1,20'));
    expect(money(120)).toBe(brl('R$ 120,00'));
  });

  it('arredonda centavos para duas casas', () => {
    expect(money(1n)).toBe(brl('R$ 0,01'));
    expect(money(0n)).toBe(brl('R$ 0,00'));
  });
});

describe('toCents', () => {
  it('converte reais para centavos inteiros', () => {
    expect(toCents(120)).toBe(12000n);
    expect(toCents(0.1)).toBe(10n);
  });

  it('arredonda em vez de truncar', () => {
    expect(toCents(0.005)).toBe(1n);
  });

  it('zera valores negativos e não finitos, em vez de propagar lixo para o cálculo', () => {
    expect(toCents(-5)).toBe(0n);
    expect(toCents(Number.NaN)).toBe(0n);
    expect(toCents(Number.POSITIVE_INFINITY)).toBe(0n);
  });
});

describe('fromCents', () => {
  it('faz o caminho de volta', () => {
    expect(fromCents(12000n)).toBe(120);
  });
});
