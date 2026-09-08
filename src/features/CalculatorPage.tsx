import { useState, type ReactNode } from 'react';
import { Archive, Calculator, Camera, Clock3, Info, Link2, Package, Settings, Share2, Sparkles, Trash2, Zap } from 'lucide-react';
import { Card, PageHeader, Row } from '../components/ui';
import { Field, SelectField, TextField } from '../components/fields';
import { money } from '../core/money';
import { gramsFromVolume, roundForField, volumeFromGrams } from '../core/volume';
import { costComposition, dominantSlice } from '../core/composition';
import { formatDuration } from '../core/format';
import type { Material, Printer as PrinterModel, QuoteInput } from '../core/types';
import type { calculateQuote } from '../application/calculateQuote';

export function quoteText(quote: QuoteInput, material: Material, printer: PrinterModel, result: ReturnType<typeof calculateQuote>): string {
  const lote = result.quantity > 1;
  return `PRINTFORGE
─────────────────
Orçamento: ${quote.title || 'Peça sem nome'}
${lote ? `Quantidade: ${result.quantity} peças
` : ''}
Material: ${material.name}
Impressora: ${printer.name}
Peso: ${quote.weightGrams} g${lote ? ' por peça' : ''}
Tempo: ${formatDuration(quote.printTimeMinutes)}${lote ? ' por peça' : ''}

${lote ? `Preço por peça: ${money(result.unitSalePrice)}
` : ''}Custo: ${money(result.totalCost)}
Margem: ${quote.marginPercent}%
Preço${lote ? ' do pedido' : ''}: ${money(result.salePrice)}
─────────────────
Calculado pelo PrintForge`;
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
  photo,
  onPickPhoto,
  onPhotoUrl,
  onRemovePhoto,
  photoBusy,
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
  photo: string | null;
  onPickPhoto: () => void;
  onPhotoUrl: (url: string) => void;
  onRemovePhoto: () => void;
  photoBusy: boolean;
}) {
  const hours = Math.floor(quote.printTimeMinutes / 60);
  const minutes = quote.printTimeMinutes % 60;
  return (
    <>
      <section className="hero-card" aria-labelledby="price-heading">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={13} /> CÁLCULO ATUAL</div>
          <h1 id="price-heading">{result ? money(result.salePrice) : money(0)}</h1>
          {/*
            Com mais de uma peça o título passa a ser o total do pedido — é o que o cliente
            paga — e o unitário vira a linha de apoio. Com uma peça só, os dois são o mesmo
            número e repetir seria ruído.
          */}
          {result && result.quantity > 1
            ? <p><strong>{money(result.unitSalePrice)}</strong> por peça · {result.quantity} peças · margem de <strong>{quote.marginPercent}%</strong></p>
            : <p>Preço sugerido com margem de <strong>{quote.marginPercent}%</strong></p>}
        </div>
        <div className="profit-card">
          <span>Lucro estimado</span>
          <strong>{result ? money(result.profit) : money(0)}</strong>
          {/* `profit` é o lucro do pedido. Com mais de uma peça, dizer "por peça" aqui
              seria rótulo discordando do número. */}
          <small>{result && result.quantity > 1 ? 'no pedido' : 'por peça'}</small>
        </div>
      </section>

      <div className="section-heading">
        <div><span className="section-kicker">ORÇAMENTO</span><h2>Parâmetros da peça</h2></div>
        <div className="offline-pill"><span /> Salvamento local</div>
      </div>

      <section className="quote-meta panel-card">
        <TextField label="Nome do cálculo" value={quote.title} onChange={(value) => onQuoteChange({ ...quote, title: value })} />
        <Field label="Quantidade" value={quote.quantity} mode="integer" onChange={(value) => onNumberChange('quantity', value)} />
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

      {/*
        A foto fica entre os parâmetros e o custo de propósito: ela pertence à descrição do
        que está sendo orçado, não ao cálculo. Nenhum número depende dela.
      */}
      <section className="photo-card">
        <div className="card-title">
          <span className="card-icon"><Camera size={18} /></span>
          <div><h2>Foto da peça</h2><p>Vai junto quando você compartilhar o orçamento</p></div>
        </div>
        {photo ? (
          <div className="photo-preview">
            <img src={photo} alt="Foto da peça deste orçamento" />
            <div className="photo-actions">
              <button className="secondary-button" type="button" onClick={onPickPhoto}>Trocar</button>
              <button className="secondary-button" type="button" onClick={onRemovePhoto}><Trash2 size={15} /> Remover</button>
            </div>
          </div>
        ) : (
          <FonteDaFoto onPickPhoto={onPickPhoto} onPhotoUrl={onPhotoUrl} busy={photoBusy} />
        )}
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
        <div className="total-row"><span>{result && result.quantity > 1 ? 'Custo do pedido' : 'Custo total'}</span><strong>{money(result?.totalCost ?? 0)}</strong></div>
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
      <div className="cost-bar" role="img" aria-label={fatias.map((f) => `${f.label} ${f.percentLabel}%`).join(', ')}>
        {fatias.map((fatia) => (
          <span key={fatia.key} className={`cost-slice slice-${fatia.key}`} style={{ width: `${fatia.percent}%` }} />
        ))}
      </div>
      <ul className="cost-legend">
        {fatias.map((fatia) => (
          <li key={fatia.key}>
            <span className={`cost-dot slice-${fatia.key}`} aria-hidden="true" />
            {fatia.label}
            <strong>{fatia.percentLabel}%</strong>
          </li>
        ))}
      </ul>
      {dominante && (
        <p className="cost-insight">
          <strong>{dominante.label}</strong> responde por {dominante.percentLabel}% do custo deste orçamento.
        </p>
      )}
    </div>
  );
}

/**
 * As duas formas de trazer a foto.
 *
 * O link vive atrás de um toque, e não lado a lado com o botão de galeria, por uma razão
 * que não é de espaço: buscar um endereço é a única vez em que este aplicativo fala com
 * a internet. Quem só quer anexar a foto da própria peça nunca esbarra nisso; quem
 * escolhe o link vê, antes de confirmar, que o endereço vai ser acessado.
 */
function FonteDaFoto({ onPickPhoto, onPhotoUrl, busy }: {
  onPickPhoto: () => void;
  onPhotoUrl: (url: string) => void;
  busy: boolean;
}) {
  const [porLink, setPorLink] = useState(false);
  const [url, setUrl] = useState('');

  if (!porLink) {
    return (
      <>
        <button className="photo-empty" type="button" onClick={onPickPhoto}>
          <Camera size={22} />
          <span>Adicionar foto</span>
          <small>Câmera ou galeria</small>
        </button>
        <button className="text-button photo-link-toggle" type="button" onClick={() => setPorLink(true)}>
          <Link2 size={15} /> Usar um link
        </button>
      </>
    );
  }

  return (
    <div className="photo-link">
      <TextField
        label="Endereço da imagem"
        value={url}
        placeholder="https://drive.google.com/..."
        onChange={setUrl}
      />
      <p className="photo-link-note">
        Este é o único momento em que o PrintForge acessa a internet. O site da imagem vai
        ver que este aparelho pediu o arquivo.
      </p>
      <div className="editor-actions">
        <button className="secondary-button" type="button" onClick={() => { setPorLink(false); setUrl(''); }}>Cancelar</button>
        <button className="primary-button" type="button" disabled={busy || url.trim() === ''} onClick={() => onPhotoUrl(url)}>
          {busy ? 'Baixando…' : 'Buscar imagem'}
        </button>
      </div>
    </div>
  );
}
