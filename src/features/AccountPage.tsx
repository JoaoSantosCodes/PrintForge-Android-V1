import { CloudUpload, Download, LogOut, Trash2, Upload } from 'lucide-react';
import { describeStatus, type CloudStatus } from '../core/cloudBackup';

/**
 * A conta, em tela inteira.
 *
 * Começou como um cartão espremido nos Ajustes, virou tela própria com dois campos e uma
 * confirmação de e-mail, e agora é um botão. A regra nunca mudou: o aplicativo continua
 * inteiro sem conta, e esta tela só se alcança por quem foi procurá-la.
 */
export function AccountPage({
  status,
  busy,
  onBack,
  onSignInWithGoogle,
  onSignOut,
  onUpload,
  onRestore,
  onDeleteCloud,
}: {
  status: CloudStatus;
  busy: boolean;
  onBack: () => void;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  onUpload: () => void;
  onRestore: () => void;
  onDeleteCloud: () => void;
}) {
  return (
    <section className="account-page panel-card">
      <button className="back-button" type="button" onClick={onBack}>← Voltar</button>
      <span className="section-kicker">SUA CONTA</span>
      <h1>Cópia na nuvem</h1>
      <p className="account-lead">
        Guarde uma cópia dos seus materiais, impressoras, histórico, estoque e fotos, para
        não perder nada ao trocar de aparelho.
      </p>

      <p className="account-status">{describeStatus(status)}</p>

      {status.state === 'signed-out'
        ? <Entrada busy={busy} onSignInWithGoogle={onSignInWithGoogle} />
        : <Conectado status={status} busy={busy} onSignOut={onSignOut} onUpload={onUpload} onRestore={onRestore} onDeleteCloud={onDeleteCloud} />}
    </section>
  );
}

/**
 * Um botão, e não um formulário.
 *
 * Não há "entrar" separado de "criar conta": o Supabase cria o usuário na primeira troca
 * de ID token e reconhece o mesmo nas seguintes. Oferecer as duas opções seria pedir uma
 * decisão que não muda nada.
 *
 * O logotipo do Google é SVG inline, com as quatro cores oficiais, porque as diretrizes
 * de marca pedem a marca de verdade — e porque um ícone genérico de nuvem não diz à
 * pessoa qual conta ela vai usar.
 */
function Entrada({ busy, onSignInWithGoogle }: { busy: boolean; onSignInWithGoogle: () => void }) {
  return (
    <div className="account-form">
      <button
        className="google-button"
        type="button"
        disabled={busy}
        onClick={onSignInWithGoogle}
      >
        <LogoGoogle />
        {busy ? 'Aguarde…' : 'Continuar com o Google'}
      </button>

      <p className="account-note">
        O PrintForge funciona por completo sem conta. Ela serve só para guardar a cópia, e
        nada é enviado sem você tocar em “Enviar para a nuvem”.
      </p>
      <p className="account-note">
        O Google confirma quem é você — o PrintForge não vê nem guarda a sua senha, e não
        há senha nova para inventar ou esquecer. Do seu perfil, só o endereço de e-mail
        é usado, e só para dizer de quem é a cópia guardada.
      </p>
      <p className="account-note">
        Prefere não usar conta nenhuma? O backup em arquivo, nos Ajustes, faz o mesmo
        trabalho sem servidor e sem internet.
      </p>
    </div>
  );
}

/** Marca do Google nas quatro cores oficiais. `aria-hidden` porque o botão já diz o nome. */
function LogoGoogle() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.5C3 17.1 2.1 20.4 2.1 24s.9 6.9 2.4 9.9l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
    </svg>
  );
}

function Conectado({ status, busy, onSignOut, onUpload, onRestore, onDeleteCloud }: {
  status: Extract<CloudStatus, { state: 'never-sent' | 'sent' }>;
  busy: boolean;
  onSignOut: () => void;
  onUpload: () => void;
  onRestore: () => void;
  onDeleteCloud: () => void;
}) {
  return (
    <div className="account-form">
      <div className="account-identity">
        <CloudUpload size={18} />
        <span>{status.email}</span>
      </div>

      <button className="primary-button account-primary" type="button" disabled={busy} onClick={onUpload}>
        <Upload size={16} /> {busy ? 'Enviando…' : 'Enviar para a nuvem'}
      </button>

      <button className="secondary-button account-secondary" type="button" disabled={busy || status.state !== 'sent'} onClick={onRestore}>
        <Download size={16} /> Restaurar da nuvem
      </button>

      <p className="account-note">
        Restaurar substitui os dados deste aparelho. Enviar substitui a cópia da nuvem — é
        uma por conta, e a última vence.
      </p>

      <div className="account-danger">
        <button className="text-button" type="button" onClick={onSignOut}><LogOut size={15} /> Sair da conta</button>
        {status.state === 'sent' && (
          <button className="text-button cloud-danger" type="button" disabled={busy} onClick={onDeleteCloud}>
            <Trash2 size={15} /> Apagar a cópia
          </button>
        )}
      </div>
    </div>
  );
}
