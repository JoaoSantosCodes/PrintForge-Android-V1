/**
 * Uma bobina física na prateleira.
 *
 * Referencia o material por id, e não por cópia — ao contrário do histórico, que guarda
 * snapshots. A diferença é de natureza: um orçamento antigo é um fato encerrado e não
 * pode mudar de valor quando o catálogo muda; uma bobina é um objeto vivo, que continua
 * sendo daquele material enquanto existir.
 *
 * Os dois campos de gramas fazem trabalhos diferentes, e juntá-los quebra um deles.
 * `nominalGrams` é o tamanho de fábrica — 1000 g na maioria das vezes — e nunca muda: é o
 * denominador da barra de nível. `baselineGrams` é o saldo de partida, e desce quando
 * movimentos antigos são compactados para caber no teto.
 *
 * Sem essa separação, compactar teria que descontar do nominal, e aí uma bobina pela
 * metade voltaria a parecer cheia na barra.
 */
export type Spool = {
  id: string;
  materialId: string;
  color: string;
  brand: string;
  /** Tamanho de fábrica. Imutável; só serve de denominador para a barra de nível. */
  nominalGrams: number;
  /** Saldo de partida. Começa igual ao nominal e absorve movimentos compactados. */
  baselineGrams: number;
  createdAt: string;
};

/**
 * Um movimento de estoque.
 *
 * `out` é consumo, `adjust` é correção de inventário (pesou a bobina e o número não
 * batia). `calculationId` liga a saída ao orçamento que a gerou, quando veio de um.
 */
export type StockMovement = {
  id: string;
  spoolId: string;
  kind: 'out' | 'adjust';
  /** Sempre positivo em `out`. Em `adjust`, positivo repõe e negativo desconta. */
  grams: number;
  createdAt: string;
  note: string;
  calculationId?: string;
};

export type SpoolBalance = {
  spool: Spool;
  remaining: number;
  /** Fração de 0 a 1 do que resta, para a barra de nível. */
  fraction: number;
};

/** Abaixo disso a bobina aparece como "acabando". Um quarto de bobina de 1 kg. */
export const LOW_STOCK_FRACTION = 0.25;

/**
 * Teto de movimentos guardados, pela mesma razão do histórico: o armazenamento do
 * WebView não é infinito e uma lista sem limite para de gravar sem avisar. Movimentos
 * são bem menores que orçamentos, então o teto é mais alto.
 */
export const MOVEMENT_LIMIT = 2000;

/** Gramas são arredondadas na exibição, mas o saldo guarda o valor cheio. */
export function remainingGrams(spool: Spool, movements: StockMovement[]): number {
  return movements.reduce((saldo, movimento) => {
    if (movimento.spoolId !== spool.id) return saldo;
    return movimento.kind === 'out' ? saldo - movimento.grams : saldo + movimento.grams;
  }, spool.baselineGrams);
}

export function spoolBalance(spool: Spool, movements: StockMovement[]): SpoolBalance {
  const remaining = remainingGrams(spool, movements);
  const fraction = spool.nominalGrams > 0
    ? Math.max(0, Math.min(1, remaining / spool.nominalGrams))
    : 0;
  return { spool, remaining, fraction };
}

/**
 * Saldos de todas as bobinas, das mais vazias para as mais cheias.
 *
 * A ordem serve à pergunta que se faz olhando um estoque: *o que está para acabar?* Uma
 * lista por ordem de cadastro esconde exatamente isso.
 */
export function spoolBalances(spools: Spool[], movements: StockMovement[]): SpoolBalance[] {
  return spools
    .map((spool) => spoolBalance(spool, movements))
    .sort((a, b) => a.remaining - b.remaining);
}

/** Total disponível de um material, somando suas bobinas. */
export function materialTotal(materialId: string, spools: Spool[], movements: StockMovement[]): number {
  return spools
    .filter((spool) => spool.materialId === materialId)
    .reduce((total, spool) => total + Math.max(0, remainingGrams(spool, movements)), 0);
}

export type ConsumeResult =
  | { ok: true; movement: StockMovement }
  | { ok: false; reason: string };

/**
 * Dá baixa de uma quantidade numa bobina.
 *
 * **Recusa quando não há saldo**, em vez de deixar o número ficar negativo ou de cortar
 * silenciosamente no zero. Uma bobina não tem menos que nada dentro, e um estoque que
 * aceita qualquer baixa deixa de ser estoque — vira um contador de boa vontade. A
 * mensagem diz de quanto é a falta, porque quem topa com ela precisa decidir entre
 * trocar de bobina e corrigir o inventário.
 */
export function consumeFromSpool(
  spool: Spool,
  movements: StockMovement[],
  grams: number,
  agora: string,
  id: string,
  origem?: { note: string; calculationId?: string },
): ConsumeResult {
  if (!Number.isFinite(grams) || grams <= 0) {
    return { ok: false, reason: 'A quantidade precisa ser maior que zero.' };
  }

  const saldo = remainingGrams(spool, movements);
  if (grams > saldo) {
    const falta = Math.round((grams - saldo) * 10) / 10;
    const disponivel = Math.round(Math.max(0, saldo) * 10) / 10;
    return {
      ok: false,
      reason: `Esta bobina tem ${disponivel} g e a baixa é de ${grams} g — faltam ${falta} g. Escolha outra bobina ou ajuste o inventário desta.`,
    };
  }

  return {
    ok: true,
    movement: {
      id,
      spoolId: spool.id,
      kind: 'out',
      grams,
      createdAt: agora,
      note: origem?.note ?? '',
      calculationId: origem?.calculationId,
    },
  };
}

/**
 * Corrige o inventário de uma bobina para um valor pesado na balança.
 *
 * Existe porque estimativa de fatiador não é balança: o consumo real diverge, e sem uma
 * forma de acertar o número o estoque envelhece errado. Guarda a diferença como
 * movimento, e não sobrescreve o saldo, para o histórico continuar explicando como se
 * chegou ao número atual.
 */
export function adjustSpool(
  spool: Spool,
  movements: StockMovement[],
  measuredGrams: number,
  agora: string,
  id: string,
): ConsumeResult {
  if (!Number.isFinite(measuredGrams) || measuredGrams < 0) {
    return { ok: false, reason: 'A quantidade medida não pode ser negativa.' };
  }

  const diferenca = measuredGrams - remainingGrams(spool, movements);
  if (diferenca === 0) {
    return { ok: false, reason: 'O valor medido é igual ao saldo atual — nada a corrigir.' };
  }

  return {
    ok: true,
    movement: {
      id,
      spoolId: spool.id,
      kind: 'adjust',
      grams: diferenca,
      createdAt: agora,
      note: `Inventário: ${measuredGrams} g medidos`,
    },
  };
}

/** Acrescenta um movimento no topo da lista. O teto é tratado por `compactMovements`. */
export function appendMovement(movements: StockMovement[], movement: StockMovement): StockMovement[] {
  return [movement, ...movements];
}

/**
 * Faz a lista de movimentos caber no teto sem alterar saldo algum.
 *
 * A tentação é simplesmente cortar o fim da lista, como o histórico faz — e aqui isso
 * seria um defeito silencioso: descartar saídas antigas faria o saldo de cada bobina
 * *subir*, porque são elas que descontam. O estoque passaria a inventar filamento.
 *
 * Então os movimentos descartados são dobrados no `baselineGrams` da bobina antes de
 * sumirem. O extrato perde a linha, o saldo continua exato, e a barra de nível não se
 * mexe porque o `nominalGrams` fica intocado.
 *
 * A lista chega com o mais novo na frente, então o que se descarta é a cauda.
 */
export function compactMovements(
  spools: Spool[],
  movements: StockMovement[],
  limit: number = MOVEMENT_LIMIT,
): { spools: Spool[]; movements: StockMovement[]; compacted: number } {
  if (movements.length <= limit) return { spools, movements, compacted: 0 };

  const mantidos = movements.slice(0, limit);
  const descartados = movements.slice(limit);

  const ajuste = new Map<string, number>();
  for (const movimento of descartados) {
    const atual = ajuste.get(movimento.spoolId) ?? 0;
    ajuste.set(movimento.spoolId, movimento.kind === 'out' ? atual - movimento.grams : atual + movimento.grams);
  }

  return {
    spools: spools.map((spool) => {
      const delta = ajuste.get(spool.id);
      return delta === undefined ? spool : { ...spool, baselineGrams: spool.baselineGrams + delta };
    }),
    movements: mantidos,
    compacted: descartados.length,
  };
}

/** As bobinas que já estão abaixo do limite de "acabando". */
export function lowSpools(balances: SpoolBalance[], threshold = LOW_STOCK_FRACTION): SpoolBalance[] {
  return balances.filter((saldo) => saldo.fraction <= threshold);
}
