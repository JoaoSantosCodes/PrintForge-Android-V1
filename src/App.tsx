import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Archive,
  Calculator,
  Check,
  Clock3,
  History,
  Info,
  LayoutDashboard,
  Share2,
  Package,
  Pencil,
  Plus,
  Printer,
  Settings,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { calculateQuote } from './application/calculateQuote';
import { deleteMaterial, saveMaterial, type MaterialDraft } from './application/saveMaterial';
import { deletePrinter, savePrinter, type PrinterDraft } from './application/savePrinter';
import { money } from './core/money';
import type { CalculationRecord, Material, Printer as PrinterModel, QuoteInput, StoredSettings } from './core/types';
import {
  calculationsRepository,
  materialsRepository,
  printersRepository,
  settingsRepository,
} from './infrastructure/storage/LocalStorageRepository';
import './styles.css';

type Tab = 'home' | 'calc' | 'materials' | 'printers' | 'history' | 'settings';

type MaterialForm = MaterialDraft;
type PrinterForm = PrinterDraft;

const defaultSettings: StoredSettings = {
  energyPricePerKwh: 1,
  laborCostPerHour: 0,
  packaging: 2,
  marginPercent: 40,
};

const seedMaterials: Material[] = [
  { id: 'material-pla', name: 'PLA', pricePerKg: 120, density: 1.24, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'material-petg', name: 'PETG', pricePerKg: 135, density: 1.27, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'material-abs', name: 'ABS', pricePerKg: 110, density: 1.04, createdAt: '2026-01-01T00:00:00.000Z' },
];

const seedPrinters: PrinterModel[] = [
  {
    id: 'printer-a1-mini',
    name: 'Bambu Lab A1 Mini',
    powerWatts: 130,
    machineCostPerHour: 5,
    maintenancePerHour: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

function loadMaterials(): Material[] {
  const stored = materialsRepository.get();
  if (stored.length > 0) return stored;
  materialsRepository.set(seedMaterials);
  return seedMaterials;
}

function loadPrinters(): PrinterModel[] {
  const stored = printersRepository.get();
  if (stored.length > 0) return stored;
  printersRepository.set(seedPrinters);
  return seedPrinters;
}

function createInitialQuote(): QuoteInput {
  const storedSettings = settingsRepository.get();
  return {
    title: 'Nova peça',
    materialId: 'material-pla',
    printerId: 'printer-a1-mini',
    weightGrams: 85,
    printTimeMinutes: 272,
    energyPricePerKwh: storedSettings.energyPricePerKwh,
    laborCostPerHour: storedSettings.laborCostPerHour,
    packaging: storedSettings.packaging,
    marginPercent: storedSettings.marginPercent,
  };
}

function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [materials, setMaterials] = useState<Material[]>(loadMaterials);
  const [printers, setPrinters] = useState<PrinterModel[]>(loadPrinters);
  const [calculations, setCalculations] = useState<CalculationRecord[]>(() => calculationsRepository.get());
  const [settings, setSettings] = useState<StoredSettings>(() => ({ ...defaultSettings, ...settingsRepository.get() }));
  const [quote, setQuote] = useState<QuoteInput>(createInitialQuote);
  const [toast, setToast] = useState('');
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showPrinterForm, setShowPrinterForm] = useState(false);
  const [materialDraft, setMaterialDraft] = useState<MaterialForm>({ name: '', pricePerKg: 120, density: 1.24 });
  const [printerDraft, setPrinterDraft] = useState<PrinterForm>({ name: '', powerWatts: 130, machineCostPerHour: 5, maintenancePerHour: 1 });

  const selectedMaterial = materials.find((material) => material.id === quote.materialId) ?? materials[0];
  const selectedPrinter = printers.find((printer) => printer.id === quote.printerId) ?? printers[0];
  const result = useMemo(
    () => selectedMaterial && selectedPrinter ? calculateQuote(quote, selectedMaterial, selectedPrinter) : null,
    [quote, selectedMaterial, selectedPrinter],
  );

  useEffect(() => {
    settingsRepository.set(settings);
  }, [settings]);

  useEffect(() => {
    if (materials.length > 0 && !materials.some((material) => material.id === quote.materialId)) {
      setQuote((current) => ({ ...current, materialId: materials[0].id }));
    }
  }, [materials, quote.materialId]);

  useEffect(() => {
    if (printers.length > 0 && !printers.some((printer) => printer.id === quote.printerId)) {
      setQuote((current) => ({ ...current, printerId: printers[0].id }));
    }
  }, [printers, quote.printerId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateQuoteNumber = (key: keyof QuoteInput, rawValue: string) => {
    const parsed = Number(rawValue.replace(',', '.'));
    setQuote((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const updateSetting = (key: keyof StoredSettings, rawValue: string) => {
    const parsed = Number(rawValue.replace(',', '.'));
    const value = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setSettings((current) => ({ ...current, [key]: value }));
    setQuote((current) => ({ ...current, [key]: value }));
  };

  const updateTime = (part: 'hours' | 'minutes', rawValue: string) => {
    const parsed = Math.max(0, Number(rawValue) || 0);
    const hours = Math.floor(quote.printTimeMinutes / 60);
    const minutes = quote.printTimeMinutes % 60;
    setQuote((current) => ({
      ...current,
      printTimeMinutes: part === 'hours' ? parsed * 60 + minutes : hours * 60 + Math.min(59, parsed),
    }));
  };

  const saveCalculationToHistory = () => {
    if (!result || !selectedMaterial || !selectedPrinter) return;
    const record: CalculationRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      input: { ...quote },
      material: { ...selectedMaterial },
      printer: { ...selectedPrinter },
      breakdown: { ...result },
    };
    const next = [record, ...calculations];
    calculationsRepository.set(next);
    setCalculations(next);
    setToast('Cálculo salvo no histórico.');
  };

  const handleSaveMaterial = () => {
    try {
      const material = saveMaterial(materialDraft);
      setMaterials(materialsRepository.get());
      setQuote((current) => ({ ...current, materialId: material.id }));
      setMaterialDraft({ name: '', pricePerKg: 120, density: 1.24 });
      setShowMaterialForm(false);
      setToast(`${material.name} adicionado ao catálogo.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível salvar o material.');
    }
  };

  const handleSavePrinter = () => {
    try {
      const printer = savePrinter(printerDraft);
      setPrinters(printersRepository.get());
      setQuote((current) => ({ ...current, printerId: printer.id }));
      setPrinterDraft({ name: '', powerWatts: 130, machineCostPerHour: 5, maintenancePerHour: 1 });
      setShowPrinterForm(false);
      setToast(`${printer.name} adicionada ao catálogo.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível salvar a impressora.');
    }
  };

  const removeMaterial = (id: string) => {
    if (!window.confirm('Remover este material do catálogo? O histórico continuará preservado.')) return;
    deleteMaterial(id);
    setMaterials(materialsRepository.get());
    setToast('Material removido.');
  };

  const removePrinter = (id: string) => {
    if (!window.confirm('Remover esta impressora do catálogo? O histórico continuará preservado.')) return;
    deletePrinter(id);
    setPrinters(printersRepository.get());
    setToast('Impressora removida.');
  };

  const restoreDefaults = () => {
    setSettings(defaultSettings);
    setQuote((current) => ({ ...current, ...defaultSettings }));
    setToast('Parâmetros padrão restaurados.');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup" aria-label="PrintForge">
          <div className="brand">PRINT<span>FORGE</span></div>
          <div className="subtitle">3D COST &amp; PRICING</div>
        </div>
        <div className="topbar-status"><span /> OFFLINE FIRST</div>
      </header>

      <main className="content">
        {showPrivacy ? <PrivacyPage onBack={() => setShowPrivacy(false)} /> : tab === 'home' ? (
          <DashboardPage calculations={calculations} materialCount={materials.length} printerCount={printers.length} onNewQuote={() => setTab('calc')} onHistory={() => setTab('history')} />
        ) : tab === 'calc' && (
          <CalculatorPage
            quote={quote}
            result={result}
            material={selectedMaterial}
            printer={selectedPrinter}
            materials={materials}
            printers={printers}
            onQuoteChange={setQuote}
            onNumberChange={updateQuoteNumber}
            onTimeChange={updateTime}
            onSave={saveCalculationToHistory}
            onShare={() => {
              if (!result || !selectedMaterial || !selectedPrinter) return;
              const text = quoteText(quote, selectedMaterial, selectedPrinter, result);
              if (navigator.share) {
                navigator.share({ title: `Orçamento · ${quote.title}`, text }).catch(() => undefined);
              } else {
                navigator.clipboard?.writeText(text);
                setToast('Orçamento copiado para a área de transferência.');
              }
            }}
          />
        )}
        {tab === 'materials' && (
          <CatalogPage
            kind="materials"
            items={materials}
            showForm={showMaterialForm}
            onToggleForm={() => setShowMaterialForm((current) => !current)}
            onRemove={removeMaterial}
            form={(
              <MaterialEditor
                draft={materialDraft}
                onChange={setMaterialDraft}
                onCancel={() => setShowMaterialForm(false)}
                onSave={handleSaveMaterial}
              />
            )}
          />
        )}
        {tab === 'printers' && (
          <CatalogPage
            kind="printers"
            items={printers}
            showForm={showPrinterForm}
            onToggleForm={() => setShowPrinterForm((current) => !current)}
            onRemove={removePrinter}
            form={(
              <PrinterEditor
                draft={printerDraft}
                onChange={setPrinterDraft}
                onCancel={() => setShowPrinterForm(false)}
                onSave={handleSavePrinter}
              />
            )}
          />
        )}
        {tab === 'history' && (
          <HistoryPage calculations={calculations} onRemove={(id) => {
            const next = calculations.filter((calculation) => calculation.id !== id);
            calculationsRepository.set(next);
            setCalculations(next);
            setToast('Cálculo removido do histórico.');
          }} />
        )}
        {tab === 'settings' && (
          <SettingsPage settings={settings} onChange={updateSetting} onRestore={restoreDefaults} onPrivacy={() => setShowPrivacy(true)} />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        <NavButton active={tab === 'home'} icon={<LayoutDashboard />} label="Início" onClick={() => { setShowPrivacy(false); setTab('home'); }} />
        <NavButton active={tab === 'calc'} icon={<Calculator />} label="Calcular" onClick={() => { setShowPrivacy(false); setTab('calc'); }} />
        <NavButton active={tab === 'materials'} icon={<Package />} label="Materiais" onClick={() => { setShowPrivacy(false); setTab('materials'); }} />
        <NavButton active={tab === 'printers'} icon={<Printer />} label="Impressoras" onClick={() => { setShowPrivacy(false); setTab('printers'); }} />
        <NavButton active={tab === 'history'} icon={<History />} label="Histórico" onClick={() => { setShowPrivacy(false); setTab('history'); }} />
        <NavButton active={tab === 'settings'} icon={<Settings />} label="Ajustes" onClick={() => { setShowPrivacy(false); setTab('settings'); }} />
      </nav>
      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </div>
  );
}

function CalculatorPage({
  quote,
  result,
  material,
  printer,
  materials,
  printers,
  onQuoteChange,
  onNumberChange,
  onTimeChange,
  onSave,
  onShare,
}: {
  quote: QuoteInput;
  result: ReturnType<typeof calculateQuote> | null;
  material?: Material;
  printer?: PrinterModel;
  materials: Material[];
  printers: PrinterModel[];
  onQuoteChange: (quote: QuoteInput) => void;
  onNumberChange: (key: keyof QuoteInput, value: string) => void;
  onTimeChange: (part: 'hours' | 'minutes', value: string) => void;
  onSave: () => void;
  onShare: () => void;
}) {
  const hours = Math.floor(quote.printTimeMinutes / 60);
  const minutes = quote.printTimeMinutes % 60;
  return (
    <>
      <section className="hero-card" aria-labelledby="price-heading">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={13} /> CÁLCULO ATUAL</div>
          <h1 id="price-heading">{result ? money(result.salePrice) : money(0)}</h1>
          <p>Preço sugerido com margem de <strong>{quote.marginPercent}%</strong></p>
        </div>
        <div className="profit-card">
          <span>Lucro estimado</span>
          <strong>{result ? money(result.profit) : money(0)}</strong>
          <small>por peça</small>
        </div>
      </section>

      <div className="section-heading">
        <div><span className="section-kicker">ORÇAMENTO</span><h2>Parâmetros da peça</h2></div>
        <div className="offline-pill"><span /> Salvamento local</div>
      </div>

      <section className="quote-meta panel-card">
        <TextField label="Nome do cálculo" value={quote.title} onChange={(value) => onQuoteChange({ ...quote, title: value })} />
        <SelectField label="Material" value={quote.materialId} options={materials.map((item) => ({ value: item.id, label: `${item.name} · ${money(item.pricePerKg)}/kg` }))} onChange={(value) => onQuoteChange({ ...quote, materialId: value })} />
        <SelectField label="Impressora" value={quote.printerId} options={printers.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => onQuoteChange({ ...quote, printerId: value })} />
      </section>

      <section className="cards-grid" aria-label="Parâmetros de cálculo">
        <Card icon={<Package />} title="Material" helper={material ? `${material.name} · ${material.density.toFixed(2)} g/cm³` : 'Cadastre um material'}>
          <Field label="Peso da peça (g)" value={quote.weightGrams} onChange={(value) => onNumberChange('weightGrams', value)} />
          {material && <div className="field-readonly"><span>Preço de referência</span><strong>{money(material.pricePerKg * 100)}/kg</strong></div>}
        </Card>
        <Card icon={<Clock3 />} title="Tempo" helper="Duração da impressão">
          <Field label="Horas" value={hours} onChange={(value) => onTimeChange('hours', value)} step="1" />
          <Field label="Minutos" value={minutes} onChange={(value) => onTimeChange('minutes', value)} step="1" max={59} />
        </Card>
        <Card icon={<Zap />} title="Energia" helper={printer ? `${printer.powerWatts} W · ${printer.name}` : 'Cadastre uma impressora'}>
          <Field label="Energia (R$/kWh)" value={quote.energyPricePerKwh} onChange={(value) => onNumberChange('energyPricePerKwh', value)} />
          {printer && <div className="field-readonly"><span>Potência cadastrada</span><strong>{printer.powerWatts} W</strong></div>}
        </Card>
        <Card icon={<Settings />} title="Operação" helper="Custos do orçamento">
          <Field label="Mão de obra (R$/h)" value={quote.laborCostPerHour} onChange={(value) => onNumberChange('laborCostPerHour', value)} />
          <Field label="Embalagem (R$)" value={quote.packaging} onChange={(value) => onNumberChange('packaging', value)} />
          <Field label="Margem (%)" value={quote.marginPercent} onChange={(value) => onNumberChange('marginPercent', value)} min={0} max={99} />
        </Card>
      </section>

      <section className="breakdown-card" aria-labelledby="breakdown-heading">
        <div className="breakdown-header">
          <div><span className="section-kicker">VISÃO FINANCEIRA</span><h2 id="breakdown-heading"><Calculator size={18} /> Composição do custo</h2></div>
          <Info size={17} className="info-icon" aria-label="Valores arredondados para centavos" />
        </div>
        <div className="rows">
          <Row label="Filamento" value={result?.filament ?? 0} />
          <Row label="Energia" value={result?.energy ?? 0} />
          <Row label="Máquina" value={result?.machine ?? 0} />
          <Row label="Mão de obra" value={result?.labor ?? 0} />
          <Row label="Manutenção" value={result?.maintenance ?? 0} />
          <Row label="Embalagem" value={result?.packaging ?? 0} />
        </div>
        <div className="total-row"><span>Custo total</span><strong>{money(result?.totalCost ?? 0)}</strong></div>
        <div className="quote-actions"><button className="primary-button save-quote" type="button" onClick={onSave} disabled={!result}><Archive size={16} /> Salvar no histórico</button><button className="secondary-button share-quote" type="button" onClick={onShare} disabled={!result}><Share2 size={16} /> Compartilhar</button></div>
      </section>
    </>
  );
}

function CatalogPage({ kind, items, showForm, onToggleForm, onRemove, form }: {
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
            <div className="entity-top"><span className="entity-icon blue"><Package size={19} /></span><button className="icon-button" type="button" onClick={() => onRemove(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button></div>
            <h2>{item.name}</h2>
            <div className="entity-primary">{money((item as Material).pricePerKg)}<small>/ kg</small></div>
            <div className="entity-meta"><span>Densidade</span><strong>{(item as Material).density.toFixed(2)} g/cm³</strong></div>
          </article>
        ) : (
          <article className="entity-card" key={item.id}>
            <div className="entity-top"><span className="entity-icon violet"><Printer size={19} /></span><button className="icon-button" type="button" onClick={() => onRemove(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button></div>
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

function MaterialEditor({ draft, onChange, onCancel, onSave }: { draft: MaterialForm; onChange: (draft: MaterialForm) => void; onCancel: () => void; onSave: () => void }) {
  return <EditorCard title="Novo material" onCancel={onCancel} onSave={onSave}>
    <TextField label="Nome" value={draft.name} placeholder="Ex.: PLA Matte" onChange={(value) => onChange({ ...draft, name: value })} />
    <Field label="Preço (R$/kg)" value={draft.pricePerKg} onChange={(value) => onChange({ ...draft, pricePerKg: numberValue(value) })} />
    <Field label="Densidade (g/cm³)" value={draft.density} onChange={(value) => onChange({ ...draft, density: numberValue(value) })} />
  </EditorCard>;
}

function PrinterEditor({ draft, onChange, onCancel, onSave }: { draft: PrinterForm; onChange: (draft: PrinterForm) => void; onCancel: () => void; onSave: () => void }) {
  return <EditorCard title="Nova impressora" onCancel={onCancel} onSave={onSave}>
    <TextField label="Nome" value={draft.name} placeholder="Ex.: Bambu Lab A1" onChange={(value) => onChange({ ...draft, name: value })} />
    <Field label="Potência (W)" value={draft.powerWatts} onChange={(value) => onChange({ ...draft, powerWatts: numberValue(value) })} />
    <Field label="Custo de máquina (R$/h)" value={draft.machineCostPerHour} onChange={(value) => onChange({ ...draft, machineCostPerHour: numberValue(value) })} />
    <Field label="Manutenção (R$/h)" value={draft.maintenancePerHour} onChange={(value) => onChange({ ...draft, maintenancePerHour: numberValue(value) })} />
  </EditorCard>;
}

function EditorCard({ title, children, onCancel, onSave }: { title: string; children: ReactNode; onCancel: () => void; onSave: () => void }) {
  return <section className="editor-card"><div className="editor-heading"><div><span className="section-kicker">CADASTRO</span><h2>{title}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Fechar formulário"><X size={17} /></button></div><div className="editor-fields">{children}</div><div className="editor-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="button" onClick={onSave}><Check size={15} /> Salvar</button></div></section>;
}

function DashboardPage({ calculations, materialCount, printerCount, onNewQuote, onHistory }: { calculations: CalculationRecord[]; materialCount: number; printerCount: number; onNewQuote: () => void; onHistory: () => void }) {
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

function StatCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: number; detail: string }) {
  return <article className="stat-card"><span className="stat-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div></article>;
}

function PrivacyPage({ onBack }: { onBack: () => void }) {
  return <section className="privacy-page panel-card"><button className="back-button" type="button" onClick={onBack}>← Voltar</button><span className="section-kicker">TRANSPARÊNCIA</span><h1>Política de privacidade</h1><p>O PrintForge foi projetado para funcionar offline e sem necessidade de conta na versão atual.</p><h2>Dados armazenados</h2><p>O aplicativo armazena localmente no dispositivo os dados inseridos pelo usuário, incluindo materiais, impressoras, configurações e históricos de cálculo.</p><h2>Compartilhamento</h2><p>Os dados não são enviados para servidores externos pelo PrintForge. Quando você usa a função de compartilhar um orçamento, o conteúdo é entregue ao recurso de compartilhamento do sistema operacional escolhido por você.</p><h2>Controle do usuário</h2><p>Você pode remover materiais, impressoras e cálculos pelo próprio aplicativo. A limpeza completa dos dados pode ser feita nas configurações do armazenamento do dispositivo.</p><p className="privacy-updated">Última atualização: setembro de 2026</p></section>;
}

function quoteText(quote: QuoteInput, material: Material, printer: PrinterModel, result: ReturnType<typeof calculateQuote>): string {
  return `PRINTFORGE\n─────────────────\nOrçamento: ${quote.title || 'Peça sem nome'}\n\nMaterial: ${material.name}\nImpressora: ${printer.name}\nPeso: ${quote.weightGrams} g\nTempo: ${formatDuration(quote.printTimeMinutes)}\n\nCusto: ${money(result.totalCost)}\nMargem: ${quote.marginPercent}%\nPreço: ${money(result.salePrice)}\n─────────────────\nCalculado pelo PrintForge`;
}

function HistoryPage({ calculations, onRemove }: { calculations: CalculationRecord[]; onRemove: (id: string) => void }) {
  return <>
    <PageHeader kicker="REGISTROS IMUTÁVEIS" title="Histórico" description="Cada cálculo guarda um snapshot dos parâmetros, do material e da impressora usados naquele momento." />
    {calculations.length === 0 ? <EmptyState icon={<History />} title="Seu histórico está vazio" description="Salve um orçamento para acompanhar seus cálculos aqui." /> : <div className="history-list">{calculations.map((calculation) => <article className="history-card" key={calculation.id}>
      <div className="history-main"><div className="history-title"><span className="history-dot" /><div><h2>{calculation.input.title || 'Peça sem nome'}</h2><p>{calculation.material.name} · {calculation.printer.name}</p></div></div><button className="icon-button" type="button" onClick={() => onRemove(calculation.id)} aria-label="Remover cálculo"><Trash2 size={16} /></button></div>
      <div className="history-meta"><span><Clock3 size={14} /> {formatDuration(calculation.input.printTimeMinutes)}</span><span>{calculation.input.weightGrams} g</span><span>{formatDate(calculation.createdAt)}</span></div>
      <div className="history-values"><div><small>Custo</small><strong>{money(calculation.breakdown.totalCost)}</strong></div><div><small>Venda</small><strong className="sale-value">{money(calculation.breakdown.salePrice)}</strong></div><div><small>Margem</small><strong>{calculation.input.marginPercent}%</strong></div></div>
    </article>)}</div>}
  </>;
}

function SettingsPage({ settings, onChange, onRestore, onPrivacy }: { settings: StoredSettings; onChange: (key: keyof StoredSettings, value: string) => void; onRestore: () => void; onPrivacy: () => void }) {
  return <>
    <PageHeader kicker="PREFERÊNCIAS LOCAIS" title="Configurações" description="Estes valores são usados como ponto de partida nos novos orçamentos e ficam salvos neste dispositivo." />
    <section className="settings-panel panel-card"><div className="settings-section-title"><Settings size={18} /><div><h2>Parâmetros padrão</h2><p>Custos aplicados a cada novo cálculo</p></div></div><Field label="Energia (R$/kWh)" value={settings.energyPricePerKwh} onChange={(value) => onChange('energyPricePerKwh', value)} /><Field label="Mão de obra (R$/h)" value={settings.laborCostPerHour} onChange={(value) => onChange('laborCostPerHour', value)} /><Field label="Embalagem (R$)" value={settings.packaging} onChange={(value) => onChange('packaging', value)} /><Field label="Margem (%)" value={settings.marginPercent} onChange={(value) => onChange('marginPercent', value)} min={0} max={99} /></section>
    <section className="settings-note"><Info size={18} /><div><strong>Persistência local ativa</strong><span>Materiais, impressoras, configurações e históricos são mantidos no armazenamento local com as chaves `printforge.*`.</span></div></section>
    <div className="settings-actions"><button className="secondary-button" type="button" onClick={onRestore}>Restaurar parâmetros padrão</button><button className="secondary-button" type="button" onClick={onPrivacy}>Política de privacidade</button></div>
  </>;
}

function PageHeader({ kicker, title, description, actionLabel, onAction }: { kicker: string; title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="page-header"><div><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{description}</p></div>{actionLabel && onAction && <button className="primary-button" type="button" onClick={onAction}><Plus size={16} /> {actionLabel}</button>}</div>;
}

function EmptyState({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick?: () => void }) {
  return <section className="empty-state"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{description}</p>{onClick && <button className="primary-button" type="button" onClick={onClick}><Plus size={15} /> Adicionar agora</button>}</section>;
}

function Card({ icon, title, helper, children }: { icon: ReactNode; title: string; helper: string; children: ReactNode }) {
  return <section className="parameter-card"><div className="card-title"><span className="card-icon">{icon}</span><div><h2>{title}</h2><p>{helper}</p></div></div><div>{children}</div></section>;
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><input type="text" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Field({ label, value, onChange, min = 0, max, step = '0.01' }: { label: string; value: number; onChange: (value: string) => void; min?: number; max?: number; step?: string }) {
  return <label className="field"><span>{label}</span><input aria-label={label} type="number" inputMode="decimal" step={step} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="cost-row"><span>{label}</span><span>{money(value)}</span></div>;
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function numberValue(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default App;
