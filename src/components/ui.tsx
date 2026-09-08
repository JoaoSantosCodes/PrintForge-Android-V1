import type { ReactNode } from 'react';
import { Check, ExternalLink as ExternalLinkIcon, Plus, X } from 'lucide-react';
import { money } from '../core/money';

/** Primitivas de layout compartilhadas entre as telas. */

export function PageHeader({ kicker, title, description, actionLabel, onAction }: { kicker: string; title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="page-header"><div><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{description}</p></div>{actionLabel && onAction && <button className="primary-button" type="button" onClick={onAction}><Plus size={16} /> {actionLabel}</button>}</div>;
}

export function EmptyState({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick?: () => void }) {
  return <section className="empty-state"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{description}</p>{onClick && <button className="primary-button" type="button" onClick={onClick}><Plus size={15} /> Adicionar agora</button>}</section>;
}

export function Card({ icon, title, helper, children }: { icon: ReactNode; title: string; helper: string; children: ReactNode }) {
  return <section className="parameter-card"><div className="card-title"><span className="card-icon">{icon}</span><div><h2>{title}</h2><p>{helper}</p></div></div><div>{children}</div></section>;
}

export function Row({ label, value }: { label: string; value: number }) {
  return <div className="cost-row"><span>{label}</span><span>{money(value)}</span></div>;
}

export function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>;
}

export function StatCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: number; detail: string }) {
  return <article className="stat-card"><span className="stat-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div></article>;
}

export function EditorCard({ title, children, onCancel, onSave }: { title: string; children: ReactNode; onCancel: () => void; onSave: () => void }) {
  return <section className="editor-card"><div className="editor-heading"><div><span className="section-kicker">CADASTRO</span><h2>{title}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Fechar formulário"><X size={17} /></button></div><div className="editor-fields">{children}</div><div className="editor-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="button" onClick={onSave}><Check size={15} /> Salvar</button></div></section>;
}

/**
 * Link para fora do aplicativo.
 *
 * `target="_blank"` porque o bridge do Capacitor entrega a um alvo desses ao navegador do
 * sistema — sem isso o site abriria dentro da WebView e prenderia o usuário numa tela sem
 * barra de endereço nem botão de voltar do navegador.
 *
 * `rel="noopener noreferrer"` porque uma aba aberta assim recebe `window.opener` e pode
 * redirecionar a página de origem. Aqui a origem é o próprio aplicativo.
 *
 * O `href` já vem validado por `safeExternalUrl`: sem isso, um `javascript:` digitado no
 * cadastro executaria no contexto do app.
 */
export function ExternalLink({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  return (
    <a className={className ?? 'text-button'} href={url} target="_blank" rel="noopener noreferrer">
      {children} <ExternalLinkIcon size={13} />
    </a>
  );
}
