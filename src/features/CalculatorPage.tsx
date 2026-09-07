import { useState, type ReactNode } from 'react';
import { Archive, Calculator, Clock3, Info, Package, Settings, Share2, Sparkles, Zap } from 'lucide-react';
import { Card, PageHeader, Row } from '../components/ui';
import { Field, SelectField, TextField } from '../components/fields';
import { money } from '../core/money';
import { gramsFromVolume, roundForField, volumeFromGrams } from '../core/volume';
import { costComposition, dominantSlice } from '../core/composition';
import { formatDuration } from '../core/format';
import type { Material, Printer as PrinterModel, QuoteInput } from '../core/types';
import type { calculateQuote } from '../application/calculateQuote';

export function quoteText(quote: QuoteInput, material: Material, printer: PrinterModel, result: ReturnType<typeof calculateQuote>): string {
  return `PRINTFORGE\n─────────────────\nOrçamento: ${quote.title || 'Peça sem nome'}\n\nMaterial: ${material.name}\nImpressora: ${printer.name}\nPeso: ${quote.weightGrams} g\nTempo: ${formatDuration(quote.printTimeMinutes)}\n\nCusto: ${money(result.totalCost)}\nMargem: ${quote.marginPercent}%\nPreço: ${money(result.salePrice)}\n─────────────────\nCalculado pelo PrintForge`;
}

export function CalculatorPage({
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
          <MassInput quote={quote} material={material} onNumberChange={onNumberChange} />
          {/* Sem `* 100`: `pricePerKg` já está em reais, e `money` só converte de centavos
              quando recebe um bigint. Multiplicar aqui exibia R$ 12.000,00 para um filamento
              de R$ 120,00. */}
          {material && <div className="field-readonly"><span>Preço de referência</span><strong>{money(material.pricePerKg)}/kg</strong></div>}
        </Card>
        <Card icon={<Clock3 />} title="Tempo" helper="Duração da impressão">
          <Field label="Horas" value={hours} mode="integer" onChange={(value) => onTimeChange('hours', value)} />
          <Field label="Minutos" value={minutes} mode="integer" onChange={(value) => onTimeChange('minutes', value)} />
        </Card>
        <Card icon={<Zap />} title="Energia" helper={printer ? `${printer.powerWatts} W · ${printer.name}` : 'Cadastre uma impressora'}>
          <Field label="Energia (R$/kWh)" value={quote.energyPricePerKwh} onChange={(value) => onNumberChange('energyPricePerKwh', value)} />
          {printer && <div className="field-readonly"><span>Potência cadastrada</span><strong>{printer.powerWatts} W</strong></div>}
        </Card>
        <Card icon={<Settings />} title="Operação" helper="Custos do orçamento">
          <Field label="Mão de obra (R$/h)" value={quote.laborCostPerHour} onChange={(value) => onNumberChange('laborCostPerHour', value)} />
          <Field label="Embalagem (R$)" value={quote.packaging} onChange={(value) => onNumberChange('packaging', value)} />
          <Field label="Margem (%)" value={quote.marginPercent} onChange={(value) => onNumberChange('marginPercent', value)} />
        </Card>
      </section>

      <section className="breakdown-card" aria-labelledby="breakdown-heading">
        <div className="breakdown-header">
          <div><span className="section-kicker">VISÃO FINANCEIRA</span><h2 id="breakdown-heading"><Calculator size={18} /> Composição do custo</h2></div>
          <Info size={17} className="info-icon" aria-label="Valores arredondados para centavos" />
        </div>
        <CostBar result={result} />
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

/**
 * Entrada da quantidade de filamento, por peso ou por volume.
 *
 * O valor canônico continua sendo o peso em gramas — é o que `QuoteInput` guarda e o
 * que o histórico registra. O modo volume é só uma forma de digitar: converte na hora
 * usando a densidade do material e some do modelo de dados.
 *
 * Por isso a alternância é estado local e não entra em `QuoteInput`: nada aqui muda o
 * formato salvo, o backup ou os validadores.
 */
function MassInput({ quote, material, onNumberChange }: {
  quote: QuoteInput;
  material?: Material;
  onNumberChange: (key: keyof QuoteInput, value: string) => void;
}) {
  const [porVolume, setPorVolume] = useState(false);
  const densidade = material?.density ?? 0;
  const podeConverter = Number.isFinite(densidade) && densidade > 0;

  if (!porVolume || !podeConverter) {
    return (
      <>
        <Field label="Peso da peça (g)" value={quote.weightGrams} onChange={(value) => onNumberChange('weightGrams', value)} />
        {podeConverter && (
          <button className="unit-toggle" type="button" onClick={() => setPorVolume(true)}>
            Informar por volume (cm³)
          </button>
        )}
      </>
    );
  }

  const volume = roundForField(volumeFromGrams(quote.weightGrams, densidade));

  return (
    <>
      <Field
        label="Volume da peça (cm³)"
        value={volume}
        onChange={(value) => {
          const gramas = gramsFromVolume(Number(value.replace(',', '.')) || 0, densidade);
          onNumberChange('weightGrams', String(roundForField(gramas)));
        }}
      />
      <div className="field-readonly"><span>Equivale a</span><strong>{roundForField(quote.weightGrams)} g</strong></div>
      <button className="unit-toggle" type="button" onClick={() => setPorVolume(false)}>
        Informar por peso (g)
      </button>
    </>
  );
}

/**
 * Barra de composição do custo.
 *
 * Um orçamento diz quanto custa; esta barra diz *de que* ele é feito. Saber que a mão
 * de obra responde por 70% muda o que se negocia — baixar o preço do filamento não
 * resolveria nada.
 *
 * As larguras vêm das proporções reais, e a legenda repete rótulo e percentual em
 * texto: cor sozinha não comunica para quem não a distingue.
 */
function CostBar({ result }: { result: ReturnType<typeof calculateQuote> | null }) {
  const fatias = costComposition(result);
  if (fatias.length === 0) return null;

  const dominante = dominantSlice(fatias);

  return (
    <div className="cost-bar-block">
      <div className="cost-bar" role="img" aria-label={fatias.map((f) => `${f.label} ${Math.round(f.percent)}%`).join(', ')}>
        {fatias.map((fatia) => (
          <span key={fatia.key} className={`cost-slice slice-${fatia.key}`} style={{ width: `${fatia.percent}%` }} />
        ))}
      </div>
      <ul className="cost-legend">
        {fatias.map((fatia) => (
          <li key={fatia.key}>
            <span className={`cost-dot slice-${fatia.key}`} aria-hidden="true" />
            {fatia.label}
            <strong>{Math.round(fatia.percent)}%</strong>
          </li>
        ))}
      </ul>
      {dominante && (
        <p className="cost-insight">
          <strong>{dominante.label}</strong> responde por {Math.round(dominante.percent)}% do custo deste orçamento.
        </p>
      )}
    </div>
  );
}
