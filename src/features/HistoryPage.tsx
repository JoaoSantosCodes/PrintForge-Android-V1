import { Clock3, History as HistoryIcon, Trash2 } from 'lucide-react';
import { EmptyState, PageHeader } from '../components/ui';
import { money } from '../core/money';
import { formatDate, formatDuration } from '../core/format';
import type { CalculationRecord } from '../core/types';

export function HistoryPage({ calculations, onRemove }: { calculations: CalculationRecord[]; onRemove: (id: string) => void }) {
  return <>
    <PageHeader kicker="REGISTROS IMUTÁVEIS" title="Histórico" description="Cada cálculo guarda um snapshot dos parâmetros, do material e da impressora usados naquele momento." />
    {calculations.length === 0 ? <EmptyState icon={<HistoryIcon />} title="Seu histórico está vazio" description="Salve um orçamento para acompanhar seus cálculos aqui." /> : <div className="history-list">{calculations.map((calculation) => <article className="history-card" key={calculation.id}>
      <div className="history-main"><div className="history-title"><span className="history-dot" /><div><h2>{calculation.input.title || 'Peça sem nome'}</h2><p>{calculation.material.name} · {calculation.printer.name}</p></div></div><button className="icon-button" type="button" onClick={() => onRemove(calculation.id)} aria-label="Remover cálculo"><Trash2 size={16} /></button></div>
      <div className="history-meta"><span><Clock3 size={14} /> {formatDuration(calculation.input.printTimeMinutes)}</span><span>{calculation.input.weightGrams} g</span><span>{formatDate(calculation.createdAt)}</span></div>
      <div className="history-values"><div><small>Custo</small><strong>{money(calculation.breakdown.totalCost)}</strong></div><div><small>Venda</small><strong className="sale-value">{money(calculation.breakdown.salePrice)}</strong></div><div><small>Margem</small><strong>{calculation.input.marginPercent}%</strong></div></div>
    </article>)}</div>}
  </>;
}
