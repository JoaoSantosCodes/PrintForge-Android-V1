import {
  adjustSpool,
  appendMovement,
  compactMovements,
  consumeFromSpool,
  type Spool,
  type StockMovement,
} from '../core/stock';

export type StockState = {
  spools: Spool[];
  movements: StockMovement[];
};

export type StockResult =
  | { ok: true; state: StockState; compacted: number }
  | { ok: false; reason: string };

/** Fonte de ids e de horário, injetada para os testes não dependerem do relógio. */
export type Relogio = { agora: () => string; id: () => string };

export const relogioReal: Relogio = {
  agora: () => new Date().toISOString(),
  id: () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`),
};

export type NovaBobina = {
  materialId: string;
  color: string;
  brand: string;
  nominalGrams: number;
};

/**
 * Cadastra uma bobina cheia.
 *
 * `baselineGrams` nasce igual ao nominal: a bobina entra com tudo dentro e o consumo vem
 * depois, por movimentos. Quem recebe uma bobina já começada cadastra e corrige pelo
 * inventário — é um passo a mais, mas evita um campo que quase ninguém usaria e que
 * confundiria os dois números logo na entrada.
 */
export function addSpool(state: StockState, nova: NovaBobina, relogio: Relogio = relogioReal): StockResult {
  if (!nova.materialId) {
    return { ok: false, reason: 'Escolha o material desta bobina.' };
  }
  if (!Number.isFinite(nova.nominalGrams) || nova.nominalGrams <= 0) {
    return { ok: false, reason: 'A bobina precisa ter um peso maior que zero.' };
  }

  const spool: Spool = {
    id: relogio.id(),
    materialId: nova.materialId,
    color: nova.color.trim(),
    brand: nova.brand.trim(),
    nominalGrams: nova.nominalGrams,
    baselineGrams: nova.nominalGrams,
    createdAt: relogio.agora(),
  };

  return { ok: true, state: { ...state, spools: [...state.spools, spool] }, compacted: 0 };
}

/**
 * Apaga uma bobina e o extrato dela.
 *
 * Os movimentos vão junto de propósito: sem a bobina, eles não têm saldo a que se
 * referir e virariam linhas órfãs no extrato. É a diferença para o histórico de
 * orçamentos, que é registro contábil e por isso guarda cópias.
 */
export function removeSpool(state: StockState, spoolId: string): StockResult {
  return {
    ok: true,
    state: {
      spools: state.spools.filter((spool) => spool.id !== spoolId),
      movements: state.movements.filter((movimento) => movimento.spoolId !== spoolId),
    },
    compacted: 0,
  };
}

function aplicar(state: StockState, movimento: StockMovement): StockResult {
  const lista = appendMovement(state.movements, movimento);
  const compactado = compactMovements(state.spools, lista);
  return {
    ok: true,
    state: { spools: compactado.spools, movements: compactado.movements },
    compacted: compactado.compacted,
  };
}

/** Baixa de uma impressão que aconteceu. */
export function consume(
  state: StockState,
  spoolId: string,
  grams: number,
  origem: { note: string; calculationId?: string },
  relogio: Relogio = relogioReal,
): StockResult {
  const spool = state.spools.find((item) => item.id === spoolId);
  if (!spool) return { ok: false, reason: 'Esta bobina não existe mais.' };

  const resultado = consumeFromSpool(spool, state.movements, grams, relogio.agora(), relogio.id(), origem);
  if (!resultado.ok) return resultado;
  return aplicar(state, resultado.movement);
}

/** Correção de inventário a partir do que a balança mostrou. */
export function adjust(
  state: StockState,
  spoolId: string,
  measuredGrams: number,
  relogio: Relogio = relogioReal,
): StockResult {
  const spool = state.spools.find((item) => item.id === spoolId);
  if (!spool) return { ok: false, reason: 'Esta bobina não existe mais.' };

  const resultado = adjustSpool(spool, state.movements, measuredGrams, relogio.agora(), relogio.id());
  if (!resultado.ok) return resultado;
  return aplicar(state, resultado.movement);
}
