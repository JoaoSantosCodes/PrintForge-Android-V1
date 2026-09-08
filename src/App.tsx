import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Boxes, Calculator, Check, History, LayoutDashboard, Package, Printer, Settings } from 'lucide-react';
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
import { StockPage } from './features/StockPage';
import { PrivacyPage, SettingsPage } from './features/SettingsPage';
import { CloudSection } from './features/CloudSection';
import { AccountPage } from './features/AccountPage';
import { useCloudBackup } from './infrastructure/cloud/useCloudBackup';
import { appendCalculation } from './core/history';
import { pieces } from './core/quantity';
import { deletePhoto, photoFromUrl, pickPhoto, savePhoto, sharePhotoWithText } from './infrastructure/native/photoFile';
import { addSpool, adjust, consume, removeSpool, type NovaBobina, type StockState } from './application/stock';
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
  spoolsRepository,
  stockMovementsRepository,
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
    quantity: 1,
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
  const [showAccount, setShowAccount] = useState(false);
  const [materials, setMaterials] = useState<Material[]>(loadMaterials);
  const [printers, setPrinters] = useState<PrinterModel[]>(loadPrinters);
  const [calculations, setCalculations] = useState<CalculationRecord[]>(() => calculationsRepository.get());
  const [settings, setSettings] = useState<StoredSettings>(() => ({ ...defaultSettings, ...settingsRepository.get() }));
  const [quote, setQuote] = useState<QuoteInput>(createInitialQuote);
  const [toast, setToast] = useState('');
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showPrinterForm, setShowPrinterForm] = useState(false);
  const [showSpoolForm, setShowSpoolForm] = useState(false);
  const [stock, setStock] = useState<StockState>(() => ({
    spools: spoolsRepository.get(),
    movements: stockMovementsRepository.get(),
  }));
  const [spoolDraft, setSpoolDraft] = useState<NovaBobina>({ materialId: '', color: '', brand: '', nominalGrams: 1000 });
  /**
   * A foto do orçamento em edição, como data URL em memória.
   *
   * Não vai para o `localStorage` junto do resto do orçamento: uma imagem em base64
   * estouraria a cota que o catálogo e o histórico dividem. E só vira arquivo quando o
   * orçamento é salvo — assim quem tira uma foto e desiste não deixa lixo no aparelho.
   */
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [materialDraft, setMaterialDraft] = useState<MaterialForm>({ name: '', pricePerKg: 120, density: 1.24, purchaseUrl: '' });
  const [printerDraft, setPrinterDraft] = useState<PrinterForm>({ name: '', powerWatts: 130, machineCostPerHour: 5, maintenancePerHour: 1 });

  const selectedMaterial = materials.find((material) => material.id === quote.materialId) ?? materials[0];
  const selectedPrinter = printers.find((printer) => printer.id === quote.printerId) ?? printers[0];
  const result = useMemo(
    () => selectedMaterial && selectedPrinter ? calculateQuote(quote, selectedMaterial, selectedPrinter) : null,
    [quote, selectedMaterial, selectedPrinter],
  );

  /**
   * As duas funções abaixo existem para que a lista de chaves de armazenamento apareça
   * uma vez só.
   *
   * Havia cópias idênticas nos quatro caminhos — exportar arquivo, importar arquivo,
   * enviar para a nuvem, restaurar da nuvem. Não era feiura: quem acrescentasse uma
   * sétima chave precisaria lembrar de quatro lugares, e esquecer um deixaria a
   * restauração da nuvem devolvendo dados incompletos sem erro nenhum.
   */
  const snapshotBackup = () => createBackup({
    settings,
    materials,
    printers,
    calculations,
    spools: stock.spools,
    stockMovements: stock.movements,
  });

  /** Grava tudo e só então atualiza a tela. Devolve `false` se o armazenamento recusou. */
  const applyBackup = (backup: ReturnType<typeof createBackup>): boolean => {
    const gravou = settingsRepository.set(backup.settings)
      && materialsRepository.set(backup.materials)
      && printersRepository.set(backup.printers)
      && calculationsRepository.set(backup.calculations)
      && spoolsRepository.set(backup.spools)
      && stockMovementsRepository.set(backup.stockMovements);
    if (!gravou) return false;

    setSettings(backup.settings);
    setMaterials(backup.materials);
    setPrinters(backup.printers);
    setCalculations(backup.calculations);
    setStock({ spools: backup.spools, movements: backup.stockMovements });
    return true;
  };

  const handleExportBackup = async () => {
    try {
      await exportBackupFile(backupFileName(), JSON.stringify(snapshotBackup(), null, 2));
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
    if (!applyBackup(backup)) {
      setToast('O backup foi lido, mas não coube no armazenamento do aparelho.');
      return;
    }
    setToast(`Backup restaurado: ${backup.materials.length} materiais, ${backup.printers.length} impressoras, ${backup.spools.length} bobinas.`);
  };

  const goToTab = (next: Tab) => {
    setShowPrivacy(false);
    setShowAccount(false);
    if (next === tab) return;
    setTabHistory((current) => [...current, tab]);
    setTab(next);
  };

  // Ordem de precedencia do botao voltar: primeiro fecha o que esta por cima,
  // depois desfaz a navegacao, e so entao deixa o app encerrar.
  const backState = { tab, tabHistory, showPrivacy, showAccount, showMaterialForm, showPrinterForm, showSpoolForm };
  const handleBack = () => {
    const action = resolveBackAction(backState);
    switch (action.type) {
      case 'closeMaterialForm': setShowMaterialForm(false); return true;
      case 'closePrinterForm': setShowPrinterForm(false); return true;
      case 'closeSpoolForm': setShowSpoolForm(false); return true;
      case 'closePrivacy': setShowPrivacy(false); return true;
      case 'closeAccount': setShowAccount(false); return true;
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

  // O estoque grava as duas chaves juntas: um saldo so faz sentido com o extrato que o
  // explica, e gravar so metade deixaria os dois em desacordo depois de um recarregamento.
  const stockWarned = useRef(false);
  useEffect(() => {
    if (spoolsRepository.set(stock.spools) && stockMovementsRepository.set(stock.movements)) return;
    if (stockWarned.current) return;
    stockWarned.current = true;
    setToast('O estoque não está sendo salvo: o armazenamento do aparelho está cheio.');
  }, [stock]);

  const aplicarEstoque = (resultado: ReturnType<typeof consume>, sucesso: string) => {
    if (!resultado.ok) {
      setToast(resultado.reason);
      return;
    }
    setStock(resultado.state);
    setToast(resultado.compacted > 0
      ? `${sucesso} ${resultado.compacted} movimentos antigos foram resumidos no saldo.`
      : sucesso);
  };

  const handleSaveSpool = () => {
    const material = materials.find((item) => item.id === spoolDraft.materialId) ?? materials[0];
    const resultado = addSpool(stock, { ...spoolDraft, materialId: material?.id ?? '' });
    if (!resultado.ok) {
      setToast(resultado.reason);
      return;
    }
    setStock(resultado.state);
    setShowSpoolForm(false);
    setSpoolDraft({ materialId: '', color: '', brand: '', nominalGrams: 1000 });
    setToast('Bobina cadastrada.');
  };

  /**
   * A nuvem mora num hook próprio, e a fronteira com ele são estas três funções: o que
   * sobe, o que fazer com o que desce, e quem tem foto. O hook não precisa conhecer a
   * forma dos dados do aplicativo para guardar um arquivo.
   */
  const nuvem = useCloudBackup({
    snapshot: snapshotBackup,
    apply: applyBackup,
    photoIds: () => calculations.filter((item) => item.hasPhoto).map((item) => item.id),
    notify: setToast,
  });

  /** Privacidade e conta se abrem por cima da aba e escondem o conteudo dela. */
  const sobreposta = showPrivacy || (showAccount && nuvem.status !== null);

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
    const id = crypto.randomUUID();
    const record: CalculationRecord = {
      id,
      createdAt: new Date().toISOString(),
      input: { ...quote },
      material: { ...selectedMaterial },
      printer: { ...selectedPrinter },
      breakdown: { ...result },
      hasPhoto: photoDraft !== null,
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

    // A foto vira arquivo só agora, depois de o registro existir e caber. Se a gravação
    // falhar, o orçamento continua válido — a foto é apresentação, não dado do negócio.
    if (photoDraft !== null) {
      void savePhoto(id, photoDraft).then((gravou) => {
        if (gravou) return;
        setCalculations((atual) => {
          const semFoto = atual.map((item) => (item.id === id ? { ...item, hasPhoto: false } : item));
          calculationsRepository.set(semFoto);
          return semFoto;
        });
        setToast('O cálculo foi salvo, mas a foto não coube no armazenamento.');
      });
    }
  };

  const handlePickPhoto = async () => {
    const foto = await pickPhoto();
    if (foto === null) {
      setToast('Nenhuma foto foi escolhida.');
      return;
    }
    setPhotoDraft(foto);
  };

  const handlePhotoUrl = async (url: string) => {
    setPhotoBusy(true);
    try {
      const resultado = await photoFromUrl(url);
      if (!resultado.ok) {
        setToast(resultado.reason);
        return;
      }
      setPhotoDraft(resultado.dataUrl);
      setToast('Imagem baixada.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSaveMaterial = () => {
    try {
      const material = saveMaterial(materialDraft);
      setMaterials(materialsRepository.get());
      setQuote((current) => ({ ...current, materialId: material.id }));
      setMaterialDraft({ name: '', pricePerKg: 120, density: 1.24, purchaseUrl: '' });
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
        {/*
          As telas sobrepostas suprimem a aba inteira.

          Antes, `showPrivacy` guardava so o primeiro bloco, e os `{tab === '...' && ...}`
          seguintes continuavam renderizando: a pagina de privacidade aparecia empilhada
          por cima dos Ajustes, com as duas rolando juntas. So ficou visivel quando a tela
          de conta nasceu com o mesmo defeito.
        */}
        {sobreposta ? (
          showAccount && nuvem.status !== null ? (
            <AccountPage
              status={nuvem.status}
              busy={nuvem.busy}
              onBack={() => setShowAccount(false)}
              onSignInWithGoogle={nuvem.signInWithGoogle}
              onSignOut={nuvem.signOut}
              onUpload={nuvem.upload}
              onRestore={nuvem.restore}
              onDeleteCloud={nuvem.remove}
            />
          ) : <PrivacyPage onBack={() => setShowPrivacy(false)} />
        ) : (<>
        {tab === 'home' && (
          <DashboardPage calculations={calculations} materialCount={materials.length} printerCount={printers.length} spools={stock.spools} movements={stock.movements} onNewQuote={() => goToTab('calc')} onHistory={() => goToTab('history')} />
        )}
        {tab === 'calc' && (
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
            photo={photoDraft}
            onPickPhoto={() => void handlePickPhoto()}
            onPhotoUrl={(url) => void handlePhotoUrl(url)}
            onRemovePhoto={() => setPhotoDraft(null)}
            photoBusy={photoBusy}
            onShare={async () => {
              if (!result || !selectedMaterial || !selectedPrinter) return;
              const text = quoteText(quote, selectedMaterial, selectedPrinter, result);
              const titulo = `Orçamento · ${quote.title}`;

              // Com foto, uma folha só leva imagem e texto. Se o caminho com arquivo não
              // estiver disponível — web, ou plugin sem resposta — cai no texto, em vez de
              // falhar e deixar o usuário sem nada.
              if (photoDraft !== null && await sharePhotoWithText(titulo, text, photoDraft)) return;

              const outcome = await shareText(titulo, text);
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
        {tab === 'stock' && (
          <StockPage
            stock={stock}
            materials={materials}
            showForm={showSpoolForm}
            onToggleForm={() => setShowSpoolForm((current) => !current)}
            draft={spoolDraft.materialId ? spoolDraft : { ...spoolDraft, materialId: materials[0]?.id ?? '' }}
            onDraftChange={setSpoolDraft}
            onSaveSpool={handleSaveSpool}
            onRemoveSpool={(id) => aplicarEstoque(removeSpool(stock, id), 'Bobina removida.')}
            onAdjust={(id, medido) => aplicarEstoque(adjust(stock, id, medido), 'Inventário corrigido.')}
          />
        )}
        {tab === 'history' && (
          <HistoryPage calculations={calculations} spools={stock.spools} movements={stock.movements} onConsume={(calculation, spoolId) => aplicarEstoque(
            consume(stock, spoolId, calculation.input.weightGrams * pieces(calculation.input.quantity), {
              note: pieces(calculation.input.quantity) > 1
                ? `${calculation.input.title || 'Peça sem nome'} × ${pieces(calculation.input.quantity)}`
                : calculation.input.title || 'Peça sem nome',
              calculationId: calculation.id,
            }),
            `Baixa de ${calculation.input.weightGrams * pieces(calculation.input.quantity)} g registrada.`,
          )} onRemove={(id) => {
            const next = calculations.filter((calculation) => calculation.id !== id);
            if (!calculationsRepository.set(next)) {
              setToast('Não foi possível remover: o armazenamento do aparelho não respondeu.');
              return;
            }
            setCalculations(next);
            // O arquivo sai junto: sem o registro ninguém mais o alcançaria.
            if (calculations.find((item) => item.id === id)?.hasPhoto) void deletePhoto(id);
            setToast('Cálculo removido do histórico.');
          }} />
        )}
        {tab === 'settings' && (
          <SettingsPage
            theme={themePreference}
            onThemeChange={setThemePreference}
            onExport={handleExportBackup}
            onImport={handleImportBackup}
            settings={settings}
            onChange={updateSetting}
            onRestore={restoreDefaults}
            onPrivacy={() => setShowPrivacy(true)}
            cloud={<CloudSection status={nuvem.status} onOpen={() => setShowAccount(true)} />}
          />
        )}
        </>)}
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        <NavButton active={tab === 'home'} icon={<LayoutDashboard />} label="Início" onClick={() => goToTab('home')} />
        <NavButton active={tab === 'calc'} icon={<Calculator />} label="Calcular" onClick={() => goToTab('calc')} />
        <NavButton active={tab === 'materials'} icon={<Package />} label="Materiais" onClick={() => goToTab('materials')} />
        <NavButton active={tab === 'printers'} icon={<Printer />} label="Impressoras" onClick={() => goToTab('printers')} />
        <NavButton active={tab === 'stock'} icon={<Boxes />} label="Estoque" onClick={() => goToTab('stock')} />
        <NavButton active={tab === 'history'} icon={<History />} label="Histórico" onClick={() => goToTab('history')} />
        <NavButton active={tab === 'settings'} icon={<Settings />} label="Ajustes" onClick={() => goToTab('settings')} />
      </nav>
      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </div>
  );
}

export default App;
