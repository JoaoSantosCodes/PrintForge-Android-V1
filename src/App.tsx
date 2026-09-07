import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Calculator, Check, History, LayoutDashboard, Package, Printer, Settings } from 'lucide-react';
import { calculateQuote } from './application/calculateQuote';
import { deleteMaterial, saveMaterial, type MaterialDraft } from './application/saveMaterial';
import { deletePrinter, savePrinter, type PrinterDraft } from './application/savePrinter';
import { money } from './core/money';
import { clampNumericField, numberValue } from './core/input';
import { Field, SelectField, TextField } from './components/fields';
import { Card, EditorCard, EmptyState, NavButton, PageHeader, Row, StatCard } from './components/ui';
import { CalculatorPage, quoteText } from './features/CalculatorPage';
import { CatalogPage, MaterialEditor, PrinterEditor } from './features/CatalogPage';
import { DashboardPage } from './features/DashboardPage';
import { HistoryPage } from './features/HistoryPage';
import { PrivacyPage, SettingsPage } from './features/SettingsPage';
import { appendCalculation } from './core/history';
import { backupFileName, createBackup, readBackup } from './application/backup';
import { exportBackupFile, pickBackupFile } from './infrastructure/native/backupFile';
import { resolveBackAction, type Tab } from './core/navigation';
import { useBackButton } from './infrastructure/native/useBackButton';
import { useWebBackButton } from './infrastructure/native/useWebBackButton';
import { shareText } from './infrastructure/native/shareText';
import { useTheme } from './infrastructure/native/useTheme';
import type { CalculationRecord, Material, Printer as PrinterModel, QuoteInput, StoredSettings } from './core/types';
import {
  calculationsRepository,
  materialsRepository,
  printersRepository,
  settingsRepository,
} from './infrastructure/storage/LocalStorageRepository';
import './styles.css';



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
  const [tabHistory, setTabHistory] = useState<Tab[]>([]);
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
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

  const handleExportBackup = async () => {
    try {
      const backup = createBackup({ settings, materials, printers, calculations });
      await exportBackupFile(backupFileName(), JSON.stringify(backup, null, 2));
      setToast('Backup gerado.');
    } catch {
      setToast('Não foi possível gerar o backup.');
    }
  };

  const handleImportBackup = async () => {
    const raw = await pickBackupFile();
    if (raw === null) return;

    const result = readBackup(raw);
    if (!result.ok) {
      setToast(result.reason);
      return;
    }

    const { backup } = result;
    const saved = settingsRepository.set(backup.settings)
      && materialsRepository.set(backup.materials)
      && printersRepository.set(backup.printers)
      && calculationsRepository.set(backup.calculations);

    if (!saved) {
      setToast('O backup foi lido, mas não coube no armazenamento do aparelho.');
      return;
    }

    setSettings(backup.settings);
    setMaterials(backup.materials);
    setPrinters(backup.printers);
    setCalculations(backup.calculations);
    setToast(`Backup restaurado: ${backup.materials.length} materiais, ${backup.printers.length} impressoras.`);
  };

  const goToTab = (next: Tab) => {
    setShowPrivacy(false);
    if (next === tab) return;
    setTabHistory((current) => [...current, tab]);
    setTab(next);
  };

  // Ordem de precedencia do botao voltar: primeiro fecha o que esta por cima,
  // depois desfaz a navegacao, e so entao deixa o app encerrar.
  const backState = { tab, tabHistory, showPrivacy, showMaterialForm, showPrinterForm };
  const handleBack = () => {
    const action = resolveBackAction(backState);
    switch (action.type) {
      case 'closeMaterialForm': setShowMaterialForm(false); return true;
      case 'closePrinterForm': setShowPrinterForm(false); return true;
      case 'closePrivacy': setShowPrivacy(false); return true;
      case 'popTab':
        setTab(action.tab);
        setTabHistory((current) => current.slice(0, -1));
        return true;
      case 'goHome': setTab('home'); return true;
      case 'exit': return false;
    }
  };

  // A mesma decisao serve aos dois: o botao fisico do Android e o voltar do navegador.
  // Cada hook fica inerte na plataforma que nao e a dele.
  useBackButton(handleBack);
  useWebBackButton(resolveBackAction(backState).type !== 'exit', handleBack);

  // Avisa no maximo uma vez por sessao: este efeito dispara a cada tecla nos ajustes.
  const storageWarned = useRef(false);
  useEffect(() => {
    if (settingsRepository.set(settings)) return;
    if (storageWarned.current) return;
    storageWarned.current = true;
    setToast('Seus ajustes não estão sendo salvos: o armazenamento do aparelho está cheio.');
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
    setQuote((current) => ({ ...current, [key]: clampNumericField(key, numberValue(rawValue)) }));
  };

  const updateSetting = (key: keyof StoredSettings, rawValue: string) => {
    const value = clampNumericField(key, numberValue(rawValue));
    setSettings((current) => ({ ...current, [key]: value }));
    setQuote((current) => ({ ...current, [key]: value }));
  };

  const updateTime = (part: 'hours' | 'minutes', rawValue: string) => {
    // numberValue tambem normaliza virgula: defesa em profundidade caso a mascara mude.
    const parsed = Math.round(numberValue(rawValue));
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
    const { list, dropped } = appendCalculation(calculations, record);
    if (!calculationsRepository.set(list)) {
      setToast('Não foi possível salvar: o armazenamento do aparelho está cheio.');
      return;
    }
    setCalculations(list);
    setToast(dropped > 0
      ? `Cálculo salvo. O registro mais antigo saiu do histórico.`
      : 'Cálculo salvo no histórico.');
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
          <DashboardPage calculations={calculations} materialCount={materials.length} printerCount={printers.length} onNewQuote={() => goToTab('calc')} onHistory={() => goToTab('history')} />
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
            onShare={async () => {
              if (!result || !selectedMaterial || !selectedPrinter) return;
              const text = quoteText(quote, selectedMaterial, selectedPrinter, result);
              const outcome = await shareText(`Orçamento · ${quote.title}`, text);
              if (outcome === 'copied') setToast('Orçamento copiado para a área de transferência.');
              if (outcome === 'failed') setToast('Não foi possível compartilhar o orçamento.');
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
            if (!calculationsRepository.set(next)) {
              setToast('Não foi possível remover: o armazenamento do aparelho não respondeu.');
              return;
            }
            setCalculations(next);
            setToast('Cálculo removido do histórico.');
          }} />
        )}
        {tab === 'settings' && (
          <SettingsPage theme={themePreference} onThemeChange={setThemePreference} onExport={handleExportBackup} onImport={handleImportBackup} settings={settings} onChange={updateSetting} onRestore={restoreDefaults} onPrivacy={() => setShowPrivacy(true)} />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        <NavButton active={tab === 'home'} icon={<LayoutDashboard />} label="Início" onClick={() => goToTab('home')} />
        <NavButton active={tab === 'calc'} icon={<Calculator />} label="Calcular" onClick={() => goToTab('calc')} />
        <NavButton active={tab === 'materials'} icon={<Package />} label="Materiais" onClick={() => goToTab('materials')} />
        <NavButton active={tab === 'printers'} icon={<Printer />} label="Impressoras" onClick={() => goToTab('printers')} />
        <NavButton active={tab === 'history'} icon={<History />} label="Histórico" onClick={() => goToTab('history')} />
        <NavButton active={tab === 'settings'} icon={<Settings />} label="Ajustes" onClick={() => goToTab('settings')} />
      </nav>
      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </div>
  );
}

export default App;
