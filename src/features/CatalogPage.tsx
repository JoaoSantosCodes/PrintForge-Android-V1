import type { ReactNode } from 'react';
import { Package, Printer, Trash2 } from 'lucide-react';
import { EditorCard, EmptyState, ExternalLink, PageHeader } from '../components/ui';
import { Field, TextField } from '../components/fields';
import { numberValue } from '../core/input';
import { linkLabel, safeExternalUrl } from '../core/link';
import type { MaterialDraft } from '../application/saveMaterial';
import type { PrinterDraft } from '../application/savePrinter';
import { money } from '../core/money';

type MaterialForm = MaterialDraft;
type PrinterForm = PrinterDraft;
import type { Material, Printer as PrinterModel } from '../core/types';

export function CatalogPage({ kind, items, showForm, onToggleForm, onRemove, form }: {
  kind: 'materials' | 'printers';
  items: Array<Material | PrinterModel>;
  showForm: boolean;
  onToggleForm: () => void;
  onRemove: (id: string) => void;
  form: ReactNode;
}) {
  const materials = kind === 'materials';
  return (
    <>
      <PageHeader
        kicker={materials ? 'CATÁLOGO DE INSUMOS' : 'PARQUE DE MÁQUINAS'}
        title={materials ? 'Materiais' : 'Impressoras'}
        description={materials ? 'Mantenha os preços e densidades atualizados para acelerar seus orçamentos.' : 'Cadastre as máquinas e seus custos para calcular cada peça com mais precisão.'}
        actionLabel={materials ? 'Novo material' : 'Nova impressora'}
        onAction={onToggleForm}
      />
      {showForm && form}
      <div className="entity-grid">
        {items.map((item) => materials ? (
          <article className="entity-card" key={item.id}>
            <div className="entity-top"><span className="entity-icon"><Package size={19} /></span><button className="icon-button" type="button" onClick={() => onRemove(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button></div>
            <h2>{item.name}</h2>
            <div className="entity-primary">{money((item as Material).pricePerKg)}<small>/ kg</small></div>
            <div className="entity-meta"><span>Densidade</span><strong>{(item as Material).density.toFixed(2)} g/cm³</strong></div>
            <LinkDeCompra url={(item as Material).purchaseUrl} />
          </article>
        ) : (
          <article className="entity-card" key={item.id}>
            <div className="entity-top"><span className="entity-icon"><Printer size={19} /></span><button className="icon-button" type="button" onClick={() => onRemove(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button></div>
            <h2>{item.name}</h2>
            <div className="entity-primary">{(item as PrinterModel).powerWatts}<small> W de potência</small></div>
            <div className="entity-meta"><span>Máquina / hora</span><strong>{money((item as PrinterModel).machineCostPerHour)}</strong></div>
            <div className="entity-meta"><span>Manutenção / hora</span><strong>{money((item as PrinterModel).maintenancePerHour)}</strong></div>
          </article>
        ))}
      </div>
      {items.length === 0 && <EmptyState icon={<Package />} title={materials ? 'Nenhum material cadastrado' : 'Nenhuma impressora cadastrada'} description="Adicione um item para começar a criar orçamentos." onClick={onToggleForm} />}
    </>
  );
}

export function MaterialEditor({ draft, onChange, onCancel, onSave }: { draft: MaterialForm; onChange: (draft: MaterialForm) => void; onCancel: () => void; onSave: () => void }) {
  return <EditorCard title="Novo material" onCancel={onCancel} onSave={onSave}>
    <TextField label="Nome" value={draft.name} placeholder="Ex.: PLA Matte" onChange={(value) => onChange({ ...draft, name: value })} />
    <Field label="Preço (R$/kg)" value={draft.pricePerKg} onChange={(value) => onChange({ ...draft, pricePerKg: numberValue(value) })} />
    <Field label="Densidade (g/cm³)" value={draft.density} onChange={(value) => onChange({ ...draft, density: numberValue(value) })} />
    <TextField label="Link de compra" value={draft.purchaseUrl ?? ''} placeholder="voolt3d.com.br/petg" onChange={(value) => onChange({ ...draft, purchaseUrl: value })} />
  </EditorCard>;
}

export function PrinterEditor({ draft, onChange, onCancel, onSave }: { draft: PrinterForm; onChange: (draft: PrinterForm) => void; onCancel: () => void; onSave: () => void }) {
  return <EditorCard title="Nova impressora" onCancel={onCancel} onSave={onSave}>
    <TextField label="Nome" value={draft.name} placeholder="Ex.: Bambu Lab A1" onChange={(value) => onChange({ ...draft, name: value })} />
    <Field label="Potência (W)" value={draft.powerWatts} onChange={(value) => onChange({ ...draft, powerWatts: numberValue(value) })} />
    <Field label="Custo de máquina (R$/h)" value={draft.machineCostPerHour} onChange={(value) => onChange({ ...draft, machineCostPerHour: numberValue(value) })} />
    <Field label="Manutenção (R$/h)" value={draft.maintenancePerHour} onChange={(value) => onChange({ ...draft, maintenancePerHour: numberValue(value) })} />
  </EditorCard>;
}

/**
 * O link de compra de um material.
 *
 * Valida de novo na hora de exibir, e não só ao salvar: um catálogo restaurado de backup
 * antigo, ou editado fora do app, pode trazer qualquer coisa no campo. Um `href` só é
 * seguro se a validação estiver do lado que renderiza.
 */
function LinkDeCompra({ url }: { url?: string }) {
  if (!url) return null;
  const conferido = safeExternalUrl(url);
  if (!conferido.ok) return null;
  return <div className="entity-link"><ExternalLink url={conferido.url}>Comprar em {linkLabel(conferido.url)}</ExternalLink></div>;
}
