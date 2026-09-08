import { useState } from 'react';
import { CloudUpload, Download, LogOut, Trash2, Upload } from 'lucide-react';
import { TextField } from '../components/fields';
import {
  describeStatus,
  emailsConferem,
  looksLikeEmail,
  passwordProblem,
  type CloudStatus,
} from '../core/cloudBackup';

/**
 * A conta, em tela inteira.
 *
 * Estava num cartão dentro dos Ajustes, e o formulário nascia espremido: dois campos, uma
 * confirmação de e-mail, mensagens de erro e a explicação de que o app funciona sem conta
 * — tudo disputando a mesma largura de um cartão entre outros cartões.
 *
 * Aqui há espaço para o erro aparecer sem empurrar o resto, e para a recuperação de senha
 * caber quando existir. O que **não** muda é a regra: o aplicativo continua inteiro sem
 * conta, e esta tela só se alcança por quem foi procurá-la.
 */
export function AccountPage({
  status,
  busy,
  onBack,
  onSignIn,
  onSignUp,
  onSignOut,
  onUpload,
  onRestore,
  onDeleteCloud,
}: {
  status: CloudStatus;
  busy: boolean;
  onBack: () => void;
  onSignIn: (email: string, senha: string) => void;
  onSignUp: (email: string, senha: string) => void;
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
        ? <Entrada busy={busy} onSignIn={onSignIn} onSignUp={onSignUp} />
        : <Conectado status={status} busy={busy} onSignOut={onSignOut} onUpload={onUpload} onRestore={onRestore} onDeleteCloud={onDeleteCloud} />}
    </section>
  );
}

function Entrada({ busy, onSignIn, onSignUp }: {
  busy: boolean;
  onSignIn: (email: string, senha: string) => void;
  onSignUp: (email: string, senha: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [senha, setSenha] = useState('');
  const [criando, setCriando] = useState(false);

  const emailInvalido = email !== '' && !looksLikeEmail(email);
  const problemaDaSenha = senha === '' ? null : passwordProblem(senha);
  const divergente = criando && confirmacao !== '' && !emailsConferem(email, confirmacao);
  const podeEnviar = !busy
    && looksLikeEmail(email)
    && passwordProblem(senha) === null
    && (!criando || emailsConferem(email, confirmacao));

  return (
    <div className="account-form">
      <TextField label="E-mail" value={email} placeholder="voce@exemplo.com" onChange={setEmail} />
      {emailInvalido && <p className="cloud-warning">Esse e-mail não parece completo.</p>}

      {/*
        A confirmação só existe no cadastro. Entrar já pressupõe a conta criada, e pedir o
        endereço duas vezes ali seria atrito sem propósito.
      */}
      {criando && (
        <>
          <TextField label="Repita o e-mail" value={confirmacao} placeholder="o mesmo endereço" onChange={setConfirmacao} />
          {divergente && <p className="cloud-warning">Os dois e-mails estão diferentes.</p>}
        </>
      )}

      <TextField label="Senha" value={senha} placeholder="pelo menos 6 caracteres" onChange={setSenha} type="password" />
      {problemaDaSenha && <p className="cloud-warning">{problemaDaSenha}</p>}

      <button
        className="primary-button account-primary"
        type="button"
        disabled={!podeEnviar}
        onClick={() => (criando ? onSignUp(email, senha) : onSignIn(email, senha))}
      >
        {busy ? 'Aguarde…' : criando ? 'Criar conta' : 'Entrar'}
      </button>

      <button className="text-button account-toggle" type="button" onClick={() => { setCriando((atual) => !atual); setConfirmacao(''); }}>
        {criando ? 'Já tenho uma conta' : 'Ainda não tenho conta'}
      </button>

      <p className="account-note">
        O PrintForge funciona por completo sem conta. Ela serve só para guardar a cópia, e
        nada é enviado sem você tocar em “Enviar para a nuvem”.
        {criando && ' Confira o e-mail com atenção: é por ele que você recupera a senha.'}
      </p>
    </div>
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
