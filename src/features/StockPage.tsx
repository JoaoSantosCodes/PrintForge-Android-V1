import { useState } from 'react';
import { AlertTriangle, Boxes, Scale, Trash2 } from 'lucide-react';
import { EditorCard, EmptyState, PageHeader } from '../components/ui';
import { Field, SelectField, TextField } from '../components/fields';
import { numberValue } from '../core/input';
import { formatDate } from '../core/format';
import { LOW_STOCK_FRACTION, lowSpools, spoolBalances, type SpoolBalance, type StockMovement } from '../core/stock';
import type { NovaBobina } from '../application/stock';
import type { Material } from '../core/types';
import type { StockState } from '../application/stock';

/** Gramas com uma casa, e sem casa quando é inteiro — 872 g, não 872,0 g. */
function gramas(valor: number): string {
  const arredondado = Math.round(valor * 10) / 10;
  return `${arredondado.toLocaleString('pt-BR')} g`;
}

export function StockPage({
  stock,
  materials,
  showForm,
  onToggleForm,
  draft,
  onDraftChange,
  onSaveSpool,
  onRemoveSpool,
  onAdjust,
}: {
  stock: StockState;
  materials: Material[];
  showForm: boolean;
  onToggleForm: () => void;
  draft: NovaBobina;
  onDraftChange: (draft: NovaBobina) => void;
  onSaveSpool: () => void;
  onRemoveSpool: (id: string) => void;
  onAdjust: (id: string, medido: number) => void;
}) {
  const saldos = spoolBalances(stock.spools, stock.movements);
  const acabando = lowSpools(saldos);
  const nomePorId = new Map(materials.map((item) => [item.id, item.name]));

  return (
    <>
      <PageHeader
        kicker="PRATELEIRA"
        title="Estoque"
        description="Cada bobina é um item, com o que resta dela. A baixa vem do histórico, quando a peça é impressa de verdade."
        actionLabel="Nova bobina"
        onAction={onToggleForm}
      />

      {showForm && (
        <EditorCard title="Nova bobina" onCancel={onToggleForm} onSave={onSaveSpool}>
          <SelectField
            label="Material"
            value={draft.materialId}
            options={materials.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(value) => onDraftChange({ ...draft, materialId: value })}
          />
          <TextField label="Cor" value={draft.color} placeholder="Ex.: Preto" onChange={(value) => onDraftChange({ ...draft, color: value })} />
          <TextField label="Marca" value={draft.brand} placeholder="Ex.: Voolt" onChange={(value) => onDraftChange({ ...draft, brand: value })} />
          <Field label="Peso da bobina (g)" value={draft.nominalGrams} mode="integer" onChange={(value) => onDraftChange({ ...draft, nominalGrams: numberValue(value) })} />
        </EditorCard>
      )}

      {acabando.length > 0 && (
        <section className="stock-alert" role="status">
          <AlertTriangle size={17} />
          <div>
            <strong>{acabando.length === 1 ? 'Uma bobina está acabando' : `${acabando.length} bobinas estão acabando`}</strong>
            <span>Abaixo de {Math.round(LOW_STOCK_FRACTION * 100)}% do peso original.</span>
          </div>
        </section>
      )}

      <div className="entity-grid">
        {saldos.map((saldo) => (
          <SpoolCard
            key={saldo.spool.id}
            saldo={saldo}
            materialName={nomePorId.get(saldo.spool.materialId)}
            movements={stock.movements}
            onRemove={() => onRemoveSpool(saldo.spool.id)}
            onAdjust={(medido) => onAdjust(saldo.spool.id, medido)}
          />
        ))}
      </div>

      {saldos.length === 0 && (
        <EmptyState
          icon={<Boxes />}
          title="Nenhuma bobina cadastrada"
          description="Cadastre as bobinas da prateleira para acompanhar o que resta de cada uma."
          onClick={materials.length > 0 ? onToggleForm : undefined}
        />
      )}
      {saldos.length === 0 && materials.length === 0 && (
        <p className="stock-hint">Cadastre um material antes: toda bobina pertence a um.</p>
      )}
    </>
  );
}

function SpoolCard({ saldo, materialName, movements, onRemove, onAdjust }: {
  saldo: SpoolBalance;
  materialName?: string;
  movements: StockMovement[];
  onRemove: () => void;
  onAdjust: (medido: number) => void;
}) {
  const [pesando, setPesando] = useState(false);
  const [medido, setMedido] = useState(0);
  const { spool, remaining, fraction } = saldo;
  const nivel = Math.round(fraction * 100);
  const extrato = movements.filter((movimento) => movimento.spoolId === spool.id).slice(0, 3);

  const titulo = [materialName ?? 'Material removido', spool.color].filter(Boolean).join(' · ');

  return (
    <article className="entity-card spool-card">
      <div className="entity-top">
        <span className="entity-icon"><Boxes size={19} /></span>
        <button className="icon-button" type="button" onClick={onRemove} aria-label={`Remover bobina ${titulo}`}><Trash2 size={16} /></button>
      </div>
      <h2>{titulo}</h2>
      {spool.brand && <p className="spool-brand">{spool.brand}</p>}

      <div className="entity-primary">{gramas(Math.max(0, remaining))}<small> restantes</small></div>

      {/*
        A barra repete em forma o que o número já diz. `aria-label` carrega o valor
        porque uma barra sem texto não diz nada a quem usa leitor de tela — a mesma regra
        que a barra de composição do custo segue.
      */}
      <div
        className={`spool-gauge${fraction <= 0.25 ? ' low' : ''}`}
        role="img"
        aria-label={`${nivel}% do peso original, ${gramas(Math.max(0, remaining))} de ${gramas(spool.nominalGrams)}`}
      >
        <span style={{ width: `${nivel}%` }} />
      </div>
      <div className="entity-meta"><span>Peso original</span><strong>{gramas(spool.nominalGrams)}</strong></div>

      {pesando ? (
        <div className="spool-weigh">
          <Field label="Peso medido (g)" value={medido} onChange={(value) => setMedido(numberValue(value))} />
          <div className="editor-actions">
            <button className="secondary-button" type="button" onClick={() => setPesando(false)}>Cancelar</button>
            <button className="primary-button" type="button" onClick={() => { onAdjust(medido); setPesando(false); }}>Corrigir</button>
          </div>
        </div>
      ) : (
        <button className="text-button" type="button" onClick={() => { setMedido(Math.round(Math.max(0, remaining))); setPesando(true); }}>
          <Scale size={15} /> Corrigir pela balança
        </button>
      )}

      {extrato.length > 0 && (
        <ul className="spool-log">
          {extrato.map((movimento) => (
            <li key={movimento.id}>
              <span>{movimento.kind === 'out' ? `−${gramas(movimento.grams)}` : `${movimento.grams > 0 ? '+' : '−'}${gramas(Math.abs(movimento.grams))}`}</span>
              <small>{movimento.note || (movimento.kind === 'out' ? 'Baixa' : 'Ajuste')} · {formatDate(movimento.createdAt)}</small>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
