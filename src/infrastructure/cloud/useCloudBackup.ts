import { useEffect, useState } from 'react';
import type { Backup } from '../../application/backup';
import { readBackup } from '../../application/backup';
import type { CloudStatus } from '../../core/cloudBackup';
import * as cloud from './cloudBackupStore';
import { cloudConfigured } from './supabase';

/**
 * Toda a conversa com a nuvem, fora do componente de tela.
 *
 * O seam é estreito de propósito: o hook sabe de nuvem e não sabe de orçamento, e o
 * `App` sabe de orçamento e não sabe de nuvem. As três funções abaixo são a fronteira —
 * uma para montar o que sobe, uma para aplicar o que desce, uma para avisar o usuário.
 *
 * Passar `settings`, `materials`, `printers`, `calculations` e `stock` um a um teria dado
 * a mesma coisa com dez parâmetros, e teria feito o hook conhecer a forma dos dados do
 * app — que é justamente o que ele não precisa saber para guardar um arquivo.
 */
export type CloudPorts = {
  /** O que enviar. Chamado no momento do envio, para pegar o estado atual. */
  snapshot: () => Backup;
  /** Aplica o backup baixado. Devolve `false` se o armazenamento local recusou. */
  apply: (backup: Backup) => boolean;
  /** Ids dos orçamentos que têm foto, para elas subirem junto. */
  photoIds: () => string[];
  /** Mensagem para o usuário — sucesso ou recusa, sempre uma. */
  notify: (mensagem: string) => void;
};

export type CloudActions = {
  status: CloudStatus | null;
  busy: boolean;
  signIn: (email: string, senha: string) => void;
  signUp: (email: string, senha: string) => void;
  signOut: () => void;
  upload: () => void;
  restore: () => void;
  remove: () => void;
};

type Resultado = { ok: boolean; reason?: string; message?: string };

export function useCloudBackup(ports: CloudPorts): CloudActions {
  /**
   * `null` significa "esta compilação não tem nuvem", e não "ainda carregando".
   *
   * A tela usa isso para sumir por inteiro em vez de aparecer desabilitada, sugerindo
   * uma funcionalidade que aquela compilação não tem.
   */
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cloudConfigured()) return;
    void cloud.cloudStatus().then(setStatus);
  }, []);

  /**
   * Toda ação passa por aqui: marca ocupado, avisa o resultado e relê o estado.
   *
   * Reler sempre, inclusive depois de falha, porque o motivo da falha às vezes é o
   * próprio estado ter mudado — sessão expirada, backup apagado de outro aparelho.
   */
  const executar = async (acao: () => Promise<Resultado>) => {
    setBusy(true);
    try {
      const resultado = await acao();
      ports.notify(resultado.ok ? (resultado.message ?? 'Pronto.') : (resultado.reason ?? 'Não deu certo.'));
      setStatus(await cloud.cloudStatus());
    } finally {
      setBusy(false);
    }
  };

  return {
    status,
    busy,
    signIn: (email, senha) => void executar(() => cloud.signIn(email, senha)),
    signUp: (email, senha) => void executar(() => cloud.signUp(email, senha)),
    signOut: () => void executar(async () => {
      await cloud.signOut();
      return { ok: true, message: 'Conta desconectada.' };
    }),
    remove: () => void executar(cloud.deleteCloudBackup),

    upload: () => void executar(() =>
      cloud.uploadBackup(JSON.stringify(ports.snapshot(), null, 2), ports.photoIds())),

    /**
     * Restaurar passa pelo mesmo `readBackup` do arquivo local, com as mesmas recusas por
     * tipo. Um caminho de validação só: a nuvem não pode ser uma porta que aceita o que o
     * arquivo recusaria.
     */
    restore: () => void executar(async () => {
      const baixado = await cloud.downloadBackup();
      if (!baixado.ok) return baixado;

      const lido = readBackup(baixado.json);
      if (!lido.ok) return { ok: false, reason: lido.reason };

      if (!ports.apply(lido.backup)) {
        return { ok: false, reason: 'O backup foi baixado, mas não coube no armazenamento do aparelho.' };
      }
      return {
        ok: true,
        message: `Restaurado da nuvem: ${lido.backup.materials.length} materiais, ${baixado.photos} fotos.`,
      };
    }),
  };
}
