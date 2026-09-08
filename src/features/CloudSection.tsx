import { useState } from 'react';
import { CloudUpload, LogOut } from 'lucide-react';
import { TextField } from '../components/fields';
import { describeStatus, looksLikeEmail, passwordProblem, type CloudStatus } from '../core/cloudBackup';

/**
 * Backup na nuvem, na tela de ajustes e abaixo do backup em arquivo.
 *
 * A ordem não é acidental: o arquivo é o que funciona sem conta, sem internet e sem
 * depender de servidor nenhum, e continua sendo o caminho principal. A nuvem resolve as
 * duas coisas que ele não resolve — trocar de aparelho sem passar arquivo pela mão, e as
 * fotos, que não cabem num JSON.
 */
export function CloudSection({
  status,
  busy,
  onSignIn,
  onSignUp,
  onSignOut,
  onUpload,
  onRestore,
  onDeleteCloud,
}: {
  status: CloudStatus | null;
  busy: boolean;
  onSignIn: (email: string, senha: string) => void;
  onSignUp: (email: string, senha: string) => void;
  onSignOut: () => void;
  onUpload: () => void;
  onRestore: () => void;
  onDeleteCloud: () => void;
}) {
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

      {status.state === 'signed-out'
        ? <FormularioDeConta busy={busy} onSignIn={onSignIn} onSignUp={onSignUp} />
        : (
          <>
            <div className="settings-actions">
              <button className="secondary-button" type="button" disabled={busy} onClick={onUpload}>
                {busy ? 'Enviando…' : 'Enviar para a nuvem'}
              </button>
              <button className="secondary-button" type="button" disabled={busy || status.state !== 'sent'} onClick={onRestore}>
                Restaurar da nuvem
              </button>
            </div>
            <p className="settings-hint">
              Restaurar substitui os dados deste aparelho. Enviar substitui a cópia da nuvem —
              é uma por conta, e a última vence.
            </p>
            <div className="settings-actions cloud-account">
              <button className="text-button" type="button" onClick={onSignOut}><LogOut size={15} /> Sair de {status.email}</button>
              {status.state === 'sent' && (
                <button className="text-button cloud-danger" type="button" disabled={busy} onClick={onDeleteCloud}>
                  Apagar a cópia da nuvem
                </button>
              )}
            </div>
          </>
        )}
    </section>
  );
}

function FormularioDeConta({ busy, onSignIn, onSignUp }: {
  busy: boolean;
  onSignIn: (email: string, senha: string) => void;
  onSignUp: (email: string, senha: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [criando, setCriando] = useState(false);

  const emailInvalido = email !== '' && !looksLikeEmail(email);
  const problemaDaSenha = senha === '' ? null : passwordProblem(senha);
  const podeEnviar = !busy && looksLikeEmail(email) && passwordProblem(senha) === null;

  return (
    <>
      <TextField label="E-mail" value={email} placeholder="voce@exemplo.com" onChange={setEmail} />
      {/*
        A validação aparece enquanto a pessoa digita, e não depois de o servidor recusar:
        um e-mail digitado errado no cadastro cria uma conta que ninguém consegue
        recuperar, porque a recuperação vai justamente para o endereço errado.
      */}
      {emailInvalido && <p className="cloud-warning">Esse e-mail não parece completo.</p>}

      <TextField label="Senha" value={senha} placeholder="pelo menos 6 caracteres" onChange={setSenha} type="password" />
      {problemaDaSenha && <p className="cloud-warning">{problemaDaSenha}</p>}

      <div className="settings-actions">
        <button
          className="primary-button"
          type="button"
          disabled={!podeEnviar}
          onClick={() => (criando ? onSignUp(email, senha) : onSignIn(email, senha))}
        >
          {busy ? 'Aguarde…' : criando ? 'Criar conta' : 'Entrar'}
        </button>
        <button className="secondary-button" type="button" onClick={() => setCriando((atual) => !atual)}>
          {criando ? 'Já tenho conta' : 'Criar uma conta'}
        </button>
      </div>

      <p className="settings-hint">
        A conta serve só para guardar sua cópia. O aplicativo funciona inteiro sem ela, e
        nada é enviado sem você tocar em “Enviar para a nuvem”.
      </p>
    </>
  );
}
