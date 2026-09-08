import {
  CLOUD_BACKUP_FILE,
  CLOUD_BUCKET,
  cloudPath,
  cloudPhotoPath,
  type CloudStatus,
} from '../../core/cloudBackup';
import { photoFileName } from '../../core/photo';
import { readPhoto, savePhoto } from '../native/photoFile';
import { getClient } from './supabase';
import { googleIdToken, googleSignOut } from './googleSignIn';

export type CloudResult = { ok: true; message: string } | { ok: false; reason: string };

/**
 * Mensagens do Supabase chegam em inglês e às vezes técnicas demais para a tela.
 *
 * Traduzir só as que a pessoa pode resolver sozinha; o resto passa como veio, porque
 * inventar um texto genérico esconde a única pista de um caso que eu não previ.
 */
function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com o servidor. Verifique a internet.';
  if (m.includes('rate limit')) return 'Muitas tentativas seguidas. Espere um minuto.';
  // Chega quando o par nonce cru / nonce com hash sai trocado, ou quando a tentativa
  // anterior foi reaproveitada. Ver `core/nonce.ts`.
  if (m.includes('nonce')) return 'A credencial do Google não pôde ser conferida. Tente entrar de novo.';
  // O provedor Google precisa estar ligado no painel do Supabase.
  if (m.includes('provider is not enabled')) return 'O login com o Google não está habilitado no servidor. Avise o desenvolvedor.';
  return mensagem;
}

/**
 * Entra com a conta Google do aparelho.
 *
 * Substituiu o cadastro por e-mail e senha, e não só por conveniência: **o Google já
 * verificou o endereço**. Isso apaga o bloqueio que mantinha a nuvem fora das
 * compilações de produção — sem cadastro por e-mail não há confirmação a enviar, e sem
 * senha não há recuperação de senha. O SMTP próprio deixou de ser pré-requisito.
 *
 * Não há mais "criar conta" separado de "entrar": o Supabase cria o usuário na primeira
 * troca de ID token e reconhece o mesmo nas seguintes. Um botão só.
 */
export async function signInWithGoogle(): Promise<CloudResult> {
  const cliente = await getClient();
  if (!cliente) return { ok: false, reason: 'A nuvem não está configurada nesta versão do aplicativo.' };

  const credencial = await googleIdToken();
  if (!credencial.ok) {
    // Fechar a folha de contas não é erro. Devolver `ok: true` sem mensagem deixa a tela
    // exatamente como estava, que é o que a pessoa pediu ao fechar.
    if (credencial.cancelado) return { ok: true, message: '' };
    return { ok: false, reason: credencial.reason };
  }

  const { error } = await cliente.auth.signInWithIdToken({
    provider: 'google',
    token: credencial.idToken,
    nonce: credencial.nonce,
  });
  if (error) return { ok: false, reason: traduzir(error.message) };
  return { ok: true, message: 'Conta conectada.' };
}

export async function signOut(): Promise<void> {
  const cliente = await getClient();
  await cliente?.auth.signOut();
  // Também do lado do Google: senão o Credential Manager guarda a conta escolhida e o
  // próximo toque entra direto, dando a impressão de que sair não funcionou.
  await googleSignOut();
}

/** E-mail da sessão atual, ou `null` se não há sessão. */
export async function currentEmail(): Promise<string | null> {
  const cliente = await getClient();
  if (!cliente) return null;
  const { data } = await cliente.auth.getSession();
  return data.session?.user.email ?? null;
}

async function sessao() {
  const cliente = await getClient();
  if (!cliente) return null;
  const { data } = await cliente.auth.getSession();
  if (!data.session) return null;
  return { cliente, userId: data.session.user.id, email: data.session.user.email ?? '' };
}

/** O que existe na nuvem hoje, para a tela poder dizer em vez de adivinhar. */
export async function cloudStatus(): Promise<CloudStatus> {
  const atual = await sessao();
  if (!atual) return { state: 'signed-out' };

  const { cliente, userId, email } = atual;
  const raiz = await cliente.storage.from(CLOUD_BUCKET).list(userId);
  const arquivo = raiz.data?.find((item) => item.name === CLOUD_BACKUP_FILE);
  if (!arquivo) return { state: 'never-sent', email };

  const fotos = await cliente.storage.from(CLOUD_BUCKET).list(`${userId}/fotos`);
  return {
    state: 'sent',
    email,
    at: arquivo.updated_at ?? arquivo.created_at ?? '',
    photos: fotos.data?.length ?? 0,
  };
}

/**
 * Envia o backup e as fotos.
 *
 * As fotos vão uma a uma, e uma que falhe não derruba o envio: o JSON é o que carrega
 * catálogo, histórico e estoque, e chegar com uma foto a menos é muito melhor que não
 * chegar. O retorno diz quantas foram, para a tela não prometer o que não aconteceu.
 */
export async function uploadBackup(json: string, photoIds: string[]): Promise<CloudResult> {
  const atual = await sessao();
  if (!atual) return { ok: false, reason: 'Entre na sua conta antes de enviar.' };

  const { cliente, userId } = atual;
  const envio = await cliente.storage
    .from(CLOUD_BUCKET)
    .upload(cloudPath(userId, CLOUD_BACKUP_FILE), new Blob([json], { type: 'application/json' }), {
      upsert: true,
      contentType: 'application/json',
    });
  if (envio.error) return { ok: false, reason: traduzir(envio.error.message) };

  let enviadas = 0;
  for (const id of photoIds) {
    const dataUrl = await readPhoto(id);
    if (dataUrl === null) continue;

    const binario = await (await fetch(dataUrl)).blob();
    const resultado = await cliente.storage
      .from(CLOUD_BUCKET)
      .upload(cloudPhotoPath(userId, photoFileName(id)), binario, { upsert: true, contentType: 'image/jpeg' });
    if (!resultado.error) enviadas += 1;
  }

  const faltaram = photoIds.length - enviadas;
  return {
    ok: true,
    message: faltaram > 0
      ? `Backup enviado, mas ${faltaram} foto${faltaram > 1 ? 's' : ''} não subiu.`
      : 'Backup enviado para a nuvem.',
  };
}

export type CloudRestore =
  | { ok: true; json: string; photos: number }
  | { ok: false; reason: string };

/**
 * Baixa o backup e as fotos.
 *
 * Devolve o JSON cru em vez de aplicá-lo: quem valida e grava é o mesmo `readBackup` que
 * já cuida do arquivo local, com as mesmas recusas por tipo. Um caminho de validação só,
 * para a nuvem não virar uma porta que aceita o que o arquivo recusaria.
 */
export async function downloadBackup(): Promise<CloudRestore> {
  const atual = await sessao();
  if (!atual) return { ok: false, reason: 'Entre na sua conta antes de restaurar.' };

  const { cliente, userId } = atual;
  const baixado = await cliente.storage.from(CLOUD_BUCKET).download(cloudPath(userId, CLOUD_BACKUP_FILE));
  if (baixado.error) return { ok: false, reason: traduzir(baixado.error.message) };
  if (!baixado.data) return { ok: false, reason: 'Não há backup na nuvem para esta conta.' };

  const json = await baixado.data.text();

  const lista = await cliente.storage.from(CLOUD_BUCKET).list(`${userId}/fotos`);
  let restauradas = 0;
  for (const item of lista.data ?? []) {
    const arquivo = await cliente.storage.from(CLOUD_BUCKET).download(`${userId}/fotos/${item.name}`);
    if (arquivo.error || !arquivo.data) continue;

    const id = item.name.replace(/^foto-/, '').replace(/\.jpg$/, '');
    if (await savePhoto(id, await paraDataUrl(arquivo.data))) restauradas += 1;
  }

  return { ok: true, json, photos: restauradas };
}

function paraDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

/** Apaga a cópia da nuvem. A política de privacidade promete isso, então tem que existir. */
export async function deleteCloudBackup(): Promise<CloudResult> {
  const atual = await sessao();
  if (!atual) return { ok: false, reason: 'Entre na sua conta primeiro.' };

  const { cliente, userId } = atual;
  const fotos = await cliente.storage.from(CLOUD_BUCKET).list(`${userId}/fotos`);
  const caminhos = [
    cloudPath(userId, CLOUD_BACKUP_FILE),
    ...(fotos.data ?? []).map((item) => `${userId}/fotos/${item.name}`),
  ];

  const { error } = await cliente.storage.from(CLOUD_BUCKET).remove(caminhos);
  if (error) return { ok: false, reason: traduzir(error.message) };
  return { ok: true, message: 'Cópia da nuvem apagada.' };
}
