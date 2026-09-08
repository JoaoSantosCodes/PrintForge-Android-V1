import { useEffect, useState } from 'react';
import { Boxes, Clock3, History as HistoryIcon, Trash2 } from 'lucide-react';
import { EmptyState, PageHeader } from '../components/ui';
import { SelectField } from '../components/fields';
import { money } from '../core/money';
import { formatDate, formatDuration } from '../core/format';
import { spoolBalances, type Spool, type StockMovement } from '../core/stock';
import { pieces } from '../core/quantity';
import { readPhoto } from '../infrastructure/native/photoFile';
import type { CalculationRecord } from '../core/types';

export function HistoryPage({ calculations, spools, movements, onRemove, onConsume }: {
  calculations: CalculationRecord[];
  spools: Spool[];
  movements: StockMovement[];
  onRemove: (id: string) => void;
  onConsume: (calculation: CalculationRecord, spoolId: string) => void;
}) {
  return <>
    <PageHeader kicker="REGISTROS IMUTÁVEIS" title="Histórico" description="Cada cálculo guarda um snapshot dos parâmetros, do material e da impressora usados naquele momento." />
    {calculations.length === 0 ? <EmptyState icon={<HistoryIcon />} title="Seu histórico está vazio" description="Salve um orçamento para acompanhar seus cálculos aqui." /> : <div className="history-list">{calculations.map((calculation) => <article className="history-card" key={calculation.id}>
      <div className="history-main"><div className="history-title"><span className="history-dot" /><div><h2>{calculation.input.title || 'Peça sem nome'}</h2><p>{calculation.material.name} · {calculation.printer.name}</p></div></div><button className="icon-button" type="button" onClick={() => onRemove(calculation.id)} aria-label="Remover cálculo"><Trash2 size={16} /></button></div>
      <div className="history-meta"><span><Clock3 size={14} /> {formatDuration(calculation.input.printTimeMinutes)}</span><span>{calculation.input.weightGrams} g</span>{pieces(calculation.input.quantity) > 1 && <span>{pieces(calculation.input.quantity)} peças</span>}<span>{formatDate(calculation.createdAt)}</span></div>
      <div className="history-values"><div><small>Custo</small><strong>{money(calculation.breakdown.totalCost)}</strong></div><div><small>Venda</small><strong className="sale-value">{money(calculation.breakdown.salePrice)}</strong></div><div><small>Margem</small><strong>{calculation.input.marginPercent}%</strong></div></div>
      {calculation.hasPhoto && <FotoDoRegistro id={calculation.id} titulo={calculation.input.title} />}
      <BaixaDeEstoque calculation={calculation} spools={spools} movements={movements} onConsume={onConsume} />
    </article>)}</div>}
  </>;
}

/**
 * A ponte entre orçamento e estoque.
 *
 * Fica aqui, e não no botão de salvar, porque orçar não é imprimir: um orçamento pode
 * nunca virar peça, e a mesma peça pode ser impressa dez vezes. O toque explícito é o
 * que diz "esta aconteceu" — por isso o botão pode ser usado de novo a cada reimpressão.
 *
 * Só oferece bobinas do material daquele orçamento. O material vem do snapshot do
 * registro, então continua certo mesmo que o catálogo tenha mudado depois.
 */
function BaixaDeEstoque({ calculation, spools, movements, onConsume }: {
  calculation: CalculationRecord;
  spools: Spool[];
  movements: StockMovement[];
  onConsume: (calculation: CalculationRecord, spoolId: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const compativeis = spoolBalances(
    spools.filter((spool) => spool.materialId === calculation.material.id),
    movements,
  );
  const [escolhida, setEscolhida] = useState('');

  if (spools.length === 0) return null;

  if (compativeis.length === 0) {
    return <p className="history-stock-note">Nenhuma bobina de {calculation.material.name} cadastrada.</p>;
  }

  // O peso da baixa é o do pedido inteiro: cinco chaveiros consomem cinco vezes.
  const peso = calculation.input.weightGrams * pieces(calculation.input.quantity);

  if (!aberto) {
    return (
      <button
        className="text-button history-stock-action"
        type="button"
        onClick={() => { setEscolhida(compativeis[compativeis.length - 1].spool.id); setAberto(true); }}
      >
        <Boxes size={15} /> Dar baixa de {peso} g
      </button>
    );
  }

  return (
    <div className="history-stock-form">
      <SelectField
        label="Bobina"
        value={escolhida}
        options={compativeis.map(({ spool, remaining }) => ({
          value: spool.id,
          label: `${spool.color || 'Sem cor'}${spool.brand ? ` · ${spool.brand}` : ''} — ${Math.round(Math.max(0, remaining))} g`,
        }))}
        onChange={setEscolhida}
      />
      <div className="editor-actions">
        <button className="secondary-button" type="button" onClick={() => setAberto(false)}>Cancelar</button>
        <button className="primary-button" type="button" onClick={() => { onConsume(calculation, escolhida); setAberto(false); }}>
          Baixar {peso} g
        </button>
      </div>
    </div>
  );
}

/**
 * Carrega a foto do registro sob demanda.
 *
 * Fica em estado local, e não no registro, porque a imagem mora no sistema de arquivos
 * e ler todas de uma vez colocaria dezenas de megabytes em memória para uma tela em que
 * a maioria nem aparece. Falhou a leitura, o card simplesmente não mostra foto — nada
 * mais no orçamento depende dela.
 */
function FotoDoRegistro({ id, titulo }: { id: string; titulo: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void readPhoto(id).then((foto) => { if (vivo) setDataUrl(foto); });
    return () => { vivo = false; };
  }, [id]);

  if (dataUrl === null) return null;
  return <img className="history-photo" src={dataUrl} alt={`Foto de ${titulo || 'peça sem nome'}`} />;
}
