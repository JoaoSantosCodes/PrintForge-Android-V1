import { describe, expect, it } from 'vitest';
import {
  adjustSpool,
  appendMovement,
  compactMovements,
  consumeFromSpool,
  lowSpools,
  materialTotal,
  remainingGrams,
  spoolBalances,
  type Spool,
  type StockMovement,
} from './stock';

function bobina(over: Partial<Spool> = {}): Spool {
  return {
    id: 'bobina-1',
    materialId: 'material-pla',
    color: 'Preto',
    brand: 'Voolt',
    nominalGrams: 1000,
    baselineGrams: 1000,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

function saida(spoolId: string, grams: number, id = `mov-${grams}`): StockMovement {
  return { id, spoolId, kind: 'out', grams, createdAt: '2026-09-07T00:00:00.000Z', note: '' };
}

describe('remainingGrams', () => {
  it('parte do saldo inicial quando não há movimento', () => {
    expect(remainingGrams(bobina(), [])).toBe(1000);
  });

  it('desconta as saídas e soma os ajustes positivos', () => {
    const movimentos: StockMovement[] = [
      saida('bobina-1', 128),
      { id: 'a', spoolId: 'bobina-1', kind: 'adjust', grams: 12, createdAt: '', note: '' },
    ];
    expect(remainingGrams(bobina(), movimentos)).toBe(884);
  });

  it('ignora movimentos de outra bobina', () => {
    expect(remainingGrams(bobina(), [saida('bobina-2', 500)])).toBe(1000);
  });
});

describe('consumeFromSpool', () => {
  it('gera a saída quando há saldo', () => {
    const resultado = consumeFromSpool(bobina(), [], 128, '2026-09-07T12:00:00.000Z', 'mov-1');
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.movement.grams).toBe(128);
      expect(resultado.movement.kind).toBe('out');
    }
  });

  it('recusa quando falta saldo, e diz de quanto é a falta', () => {
    const resultado = consumeFromSpool(bobina(), [saida('bobina-1', 950)], 128, '', 'mov-1');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.reason).toContain('50 g');
      expect(resultado.reason).toContain('faltam 78 g');
    }
  });

  it('recusa quantidade zero ou negativa', () => {
    expect(consumeFromSpool(bobina(), [], 0, '', 'x').ok).toBe(false);
    expect(consumeFromSpool(bobina(), [], -5, '', 'x').ok).toBe(false);
  });

  it('aceita a baixa que zera a bobina, mas não a que passa por um grama', () => {
    expect(consumeFromSpool(bobina(), [], 1000, '', 'x').ok).toBe(true);
    expect(consumeFromSpool(bobina(), [], 1001, '', 'x').ok).toBe(false);
  });

  it('guarda a origem quando a baixa vem de um orçamento', () => {
    const resultado = consumeFromSpool(bobina(), [], 128, '', 'mov-1', {
      note: 'Case Raspberry Pi',
      calculationId: 'calc-9',
    });
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.movement.calculationId).toBe('calc-9');
      expect(resultado.movement.note).toBe('Case Raspberry Pi');
    }
  });
});

describe('adjustSpool', () => {
  it('registra a diferença entre o medido e o saldo, não o valor medido', () => {
    const resultado = adjustSpool(bobina(), [saida('bobina-1', 200)], 750, '', 'aj-1');
    expect(resultado.ok).toBe(true);
    // saldo era 800, a balança diz 750: o movimento vale -50.
    if (resultado.ok) expect(resultado.movement.grams).toBe(-50);
  });

  it('recusa quando não há nada a corrigir', () => {
    expect(adjustSpool(bobina(), [], 1000, '', 'aj-1').ok).toBe(false);
  });

  it('recusa medida negativa', () => {
    expect(adjustSpool(bobina(), [], -1, '', 'aj-1').ok).toBe(false);
  });
});

describe('spoolBalances', () => {
  it('ordena das mais vazias para as mais cheias', () => {
    const bobinas = [
      bobina({ id: 'cheia' }),
      bobina({ id: 'vazia' }),
      bobina({ id: 'meia' }),
    ];
    const movimentos = [saida('vazia', 900), saida('meia', 500)];
    expect(spoolBalances(bobinas, movimentos).map((s) => s.spool.id)).toEqual(['vazia', 'meia', 'cheia']);
  });

  it('a fração usa o tamanho de fábrica, não o saldo de partida', () => {
    // Uma bobina ja compactada: baseline caiu, nominal continua 1000.
    const [saldo] = spoolBalances([bobina({ baselineGrams: 400 })], []);
    expect(saldo.remaining).toBe(400);
    expect(saldo.fraction).toBeCloseTo(0.4, 5);
  });
});

describe('lowSpools', () => {
  it('aponta só o que está no limite ou abaixo', () => {
    const bobinas = [bobina({ id: 'ok' }), bobina({ id: 'acabando' })];
    const balances = spoolBalances(bobinas, [saida('acabando', 800)]);
    expect(lowSpools(balances).map((s) => s.spool.id)).toEqual(['acabando']);
  });
});

describe('materialTotal', () => {
  it('soma as bobinas do mesmo material e ignora as outras', () => {
    const bobinas = [
      bobina({ id: 'pla-1' }),
      bobina({ id: 'pla-2' }),
      bobina({ id: 'petg-1', materialId: 'material-petg' }),
    ];
    expect(materialTotal('material-pla', bobinas, [saida('pla-1', 400)])).toBe(1600);
  });

  it('não deixa uma bobina negativa descontar do total das outras', () => {
    const bobinas = [bobina({ id: 'a' }), bobina({ id: 'b' })];
    const negativa: StockMovement = { id: 'x', spoolId: 'a', kind: 'adjust', grams: -1200, createdAt: '', note: '' };
    expect(materialTotal('material-pla', bobinas, [negativa])).toBe(1000);
  });
});

describe('compactMovements', () => {
  it('não mexe em nada enquanto cabe no teto', () => {
    const movimentos = [saida('bobina-1', 10, 'm1'), saida('bobina-1', 20, 'm2')];
    const resultado = compactMovements([bobina()], movimentos, 5);
    expect(resultado.compacted).toBe(0);
    expect(resultado.movements).toBe(movimentos);
  });

  /**
   * O teste que existe por causa de um defeito que quase entrou: cortar a cauda como o
   * histórico faz devolveria filamento que já tinha sido gasto.
   */
  it('preserva o saldo exato ao descartar movimentos antigos', () => {
    const b = bobina();
    const movimentos = [
      saida('bobina-1', 100, 'm3'),
      saida('bobina-1', 50, 'm2'),
      saida('bobina-1', 30, 'm1'),
    ];
    const antes = remainingGrams(b, movimentos);
    expect(antes).toBe(820);

    const resultado = compactMovements([b], movimentos, 1);
    expect(resultado.compacted).toBe(2);
    expect(resultado.movements).toHaveLength(1);
    expect(remainingGrams(resultado.spools[0], resultado.movements)).toBe(antes);
  });

  it('não move a barra de nível ao compactar', () => {
    const b = bobina();
    const movimentos = [saida('bobina-1', 100, 'm2'), saida('bobina-1', 300, 'm1')];
    const resultado = compactMovements([b], movimentos, 1);
    expect(resultado.spools[0].nominalGrams).toBe(1000);
    expect(spoolBalances(resultado.spools, resultado.movements)[0].fraction).toBeCloseTo(0.6, 5);
  });

  it('compacta cada bobina com os movimentos que são dela', () => {
    const bobinas = [bobina({ id: 'a' }), bobina({ id: 'b' })];
    const movimentos = [saida('a', 10, 'm3'), saida('b', 400, 'm2'), saida('a', 200, 'm1')];
    const resultado = compactMovements(bobinas, movimentos, 1);
    const porId = Object.fromEntries(resultado.spools.map((s) => [s.id, s]));
    expect(remainingGrams(porId.a, resultado.movements)).toBe(790);
    expect(remainingGrams(porId.b, resultado.movements)).toBe(600);
  });
});

describe('appendMovement', () => {
  it('põe o movimento novo na frente', () => {
    const antigo = saida('bobina-1', 10, 'antigo');
    const novo = saida('bobina-1', 20, 'novo');
    expect(appendMovement([antigo], novo).map((m) => m.id)).toEqual(['novo', 'antigo']);
  });
});
