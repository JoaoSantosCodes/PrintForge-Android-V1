import { describe, expect, it } from 'vitest';
import { addSpool, adjust, consume, removeSpool, type Relogio, type StockState } from './stock';
import { remainingGrams } from '../core/stock';

let contador = 0;
const relogio: Relogio = {
  agora: () => '2026-09-07T12:00:00.000Z',
  id: () => `id-${++contador}`,
};

const vazio: StockState = { spools: [], movements: [] };

function comUmaBobina(): StockState {
  contador = 0;
  const r = addSpool(vazio, { materialId: 'pla', color: 'Preto', brand: 'Voolt', nominalGrams: 1000 }, relogio);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

describe('addSpool', () => {
  it('cadastra a bobina cheia', () => {
    const state = comUmaBobina();
    expect(state.spools).toHaveLength(1);
    expect(state.spools[0].nominalGrams).toBe(1000);
    expect(state.spools[0].baselineGrams).toBe(1000);
    expect(remainingGrams(state.spools[0], state.movements)).toBe(1000);
  });

  it('apara espaços de cor e marca', () => {
    contador = 0;
    const r = addSpool(vazio, { materialId: 'pla', color: '  Preto ', brand: ' Voolt  ', nominalGrams: 1000 }, relogio);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.spools[0].color).toBe('Preto');
      expect(r.state.spools[0].brand).toBe('Voolt');
    }
  });

  it('recusa bobina sem material', () => {
    const r = addSpool(vazio, { materialId: '', color: '', brand: '', nominalGrams: 1000 }, relogio);
    expect(r.ok).toBe(false);
  });

  it('recusa peso zero ou negativo', () => {
    expect(addSpool(vazio, { materialId: 'pla', color: '', brand: '', nominalGrams: 0 }, relogio).ok).toBe(false);
    expect(addSpool(vazio, { materialId: 'pla', color: '', brand: '', nominalGrams: -1 }, relogio).ok).toBe(false);
  });
});

describe('consume', () => {
  it('desconta e registra a origem', () => {
    const state = comUmaBobina();
    const r = consume(state, state.spools[0].id, 128, { note: 'Case Raspberry Pi', calculationId: 'calc-9' }, relogio);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(remainingGrams(r.state.spools[0], r.state.movements)).toBe(872);
    expect(r.state.movements[0].calculationId).toBe('calc-9');
  });

  it('recusa quando a bobina não existe mais', () => {
    const r = consume(comUmaBobina(), 'sumiu', 10, { note: '' }, relogio);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('não existe');
  });

  it('propaga a recusa por falta de saldo', () => {
    const state = comUmaBobina();
    const r = consume(state, state.spools[0].id, 1500, { note: '' }, relogio);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('faltam');
  });

  /**
   * A decisão central desta funcionalidade: orçar não é imprimir. Duas baixas do mesmo
   * orçamento são duas impressões, e o estoque tem que refletir as duas.
   */
  it('duas baixas do mesmo orçamento descontam duas vezes', () => {
    const state = comUmaBobina();
    const primeira = consume(state, state.spools[0].id, 128, { note: 'Peça', calculationId: 'calc-9' }, relogio);
    expect(primeira.ok).toBe(true);
    if (!primeira.ok) return;
    const segunda = consume(primeira.state, state.spools[0].id, 128, { note: 'Peça', calculationId: 'calc-9' }, relogio);
    expect(segunda.ok).toBe(true);
    if (!segunda.ok) return;
    expect(remainingGrams(segunda.state.spools[0], segunda.state.movements)).toBe(744);
    expect(segunda.state.movements).toHaveLength(2);
  });
});

describe('adjust', () => {
  it('acerta o saldo pelo valor medido na balança', () => {
    const state = comUmaBobina();
    const baixa = consume(state, state.spools[0].id, 200, { note: '' }, relogio);
    if (!baixa.ok) throw new Error(baixa.reason);
    const r = adjust(baixa.state, state.spools[0].id, 750, relogio);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(remainingGrams(r.state.spools[0], r.state.movements)).toBe(750);
  });

  it('deixa o extrato explicar a correção em vez de sobrescrever o saldo', () => {
    const state = comUmaBobina();
    const r = adjust(state, state.spools[0].id, 940, relogio);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.movements).toHaveLength(1);
    expect(r.state.movements[0].kind).toBe('adjust');
    expect(r.state.movements[0].grams).toBe(-60);
  });
});

describe('removeSpool', () => {
  it('leva o extrato da bobina junto, para não sobrar linha órfã', () => {
    const state = comUmaBobina();
    const baixa = consume(state, state.spools[0].id, 100, { note: '' }, relogio);
    if (!baixa.ok) throw new Error(baixa.reason);
    const r = removeSpool(baixa.state, state.spools[0].id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.spools).toHaveLength(0);
    expect(r.state.movements).toHaveLength(0);
  });

  it('não toca no extrato das outras bobinas', () => {
    contador = 0;
    let state = vazio;
    for (const cor of ['Preto', 'Branco']) {
      const r = addSpool(state, { materialId: 'pla', color: cor, brand: 'Voolt', nominalGrams: 1000 }, relogio);
      if (!r.ok) throw new Error(r.reason);
      state = r.state;
    }
    const [preta, branca] = state.spools;
    const baixa = consume(state, branca.id, 300, { note: '' }, relogio);
    if (!baixa.ok) throw new Error(baixa.reason);

    const r = removeSpool(baixa.state, preta.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.spools).toHaveLength(1);
    expect(remainingGrams(r.state.spools[0], r.state.movements)).toBe(700);
  });
});
