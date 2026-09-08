import { CloudUpload } from 'lucide-react';
import { describeStatus, type CloudStatus } from '../core/cloudBackup';

/**
 * Resumo da nuvem nos Ajustes, com a porta para a tela de conta.
 *
 * O formulário morava aqui e nascia espremido: dois campos, confirmação de e-mail,
 * mensagens de erro e a explicação de que o app funciona sem conta, todos disputando a
 * largura de um cartão entre outros cartões. O que sobra aqui é o que um cartão faz bem —
 * dizer o estado em uma linha e levar a quem resolve.
 *
 * `status === null` significa "esta compilação não tem nuvem": a seção some por inteiro
 * em vez de aparecer desabilitada, sugerindo uma funcionalidade que aquela compilação não
 * tem.
 */
export function CloudSection({ status, onOpen }: { status: CloudStatus | null; onOpen: () => void }) {
  if (status === null) return null;

  return (
    <section className="settings-panel panel-card">
      <div className="settings-section-title">
        <CloudUpload size={18} />
        <div>
          <h2>Cópia na nuvem</h2>
          <p>Para não perder nada ao trocar de aparelho</p>
        </div>
      </div>

      <p className="settings-hint cloud-status">{describeStatus(status)}</p>

      <div className="settings-actions">
        <button className="secondary-button" type="button" onClick={onOpen}>
          {status.state === 'signed-out' ? 'Entrar ou criar conta' : 'Abrir minha conta'}
        </button>
      </div>
    </section>
  );
}
