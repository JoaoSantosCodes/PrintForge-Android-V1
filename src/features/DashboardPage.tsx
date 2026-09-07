import { Archive, Calculator, History, Package, Printer, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState, PageHeader, StatCard } from '../components/ui';
import { money } from '../core/money';
import { formatDuration } from '../core/format';
import type { CalculationRecord } from '../core/types';

export function DashboardPage({ calculations, materialCount, printerCount, onNewQuote, onHistory }: { calculations: CalculationRecord[]; materialCount: number; printerCount: number; onNewQuote: () => void; onHistory: () => void }) {
  const latest = calculations[0];
  return <>
    <PageHeader kicker="CENTRAL DE CONTROLE" title="Olá, PrintForge" description="Tudo pronto para transformar a próxima impressão em um orçamento preciso." actionLabel="Novo orçamento" onAction={onNewQuote} />
    <section className="dashboard-latest panel-card">
      <div className="dashboard-label"><span className="section-kicker">ÚLTIMO ORÇAMENTO</span>{latest && <button className="text-button" type="button" onClick={onHistory}>Ver histórico <span>→</span></button>}</div>
      {latest ? <div className="latest-content"><div><h2>{latest.input.title || 'Peça sem nome'}</h2><p>{latest.material.name} · {formatDuration(latest.input.printTimeMinutes)} · {latest.input.weightGrams} g</p></div><div className="latest-values"><div><small>Custo</small><strong>{money(latest.breakdown.totalCost)}</strong></div><div><small>Venda</small><strong className="sale-value">{money(latest.breakdown.salePrice)}</strong></div></div></div> : <div className="dashboard-empty"><Archive size={22} /><div><strong>Nenhum orçamento ainda</strong><span>Crie seu primeiro cálculo para acompanhar os resultados aqui.</span></div></div>}
    </section>
    <section className="stats-grid"><StatCard icon={<Package />} label="Materiais" value={materialCount} detail="cadastrados" /><StatCard icon={<Printer />} label="Impressoras" value={printerCount} detail="cadastradas" /><StatCard icon={<History />} label="Histórico" value={calculations.length} detail="orçamentos" /></section>
    <section className="dashboard-tip"><Sparkles size={17} /><div><strong>Precisão que acompanha seu negócio</strong><span>Os snapshots preservam os dados originais de cada orçamento, mesmo quando seu catálogo muda.</span></div></section>
  </>;
}
