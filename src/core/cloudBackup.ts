/**
 * Regras do backup na nuvem, sem tocar em rede.
 *
 * O backup em arquivo continua existindo e não muda: ele é o que funciona sem conta,
 * sem internet e sem depender de servidor nenhum. Este aqui é adicional, e resolve as
 * duas coisas que o arquivo não resolve — trocar de aparelho sem passar o arquivo pela
 * mão, e as fotos, que ficaram de fora por serem grandes demais para um JSON.
 */

/** Nome fixo do arquivo de backup de cada conta. Um por usuário, o último vence. */
export const CLOUD_BACKUP_FILE = 'backup.json';

/** Bucket privado. Nada aqui é servido publicamente. */
export const CLOUD_BUCKET = 'backups';

/**
 * Caminho de um objeto dentro do bucket.
 *
 * O `userId` é o primeiro segmento porque é ele que a política de segurança inspeciona:
 * a regra no banco compara esse primeiro segmento com o dono da sessão. Se o caminho
 * fosse montado em outra ordem, a política precisaria de outra forma — e uma política
 * que não bate com o caminho é uma porta aberta que parece fechada.
 */
export function cloudPath(userId: string, file: string): string {
  return `${userId}/${file}`;
}

/** Caminho da foto de um orçamento na nuvem. */
export function cloudPhotoPath(userId: string, fileName: string): string {
  return cloudPath(userId, `fotos/${fileName}`);
}

/**
 * Extrai o dono a partir de um caminho, para conferir do lado do app o que a política
 * já garante do lado do banco. Defesa em profundidade: se algum dia um caminho vier de
 * onde não devia, isso o rejeita antes de virar requisição.
 */
export function ownerOf(path: string): string | null {
  const [dono, ...resto] = path.split('/');
  if (!dono || resto.length === 0) return null;
  return dono;
}

export type CloudStatus =
  | { state: 'signed-out' }
  | { state: 'never-sent'; email: string }
  | { state: 'sent'; email: string; at: string; photos: number };

/**
 * Texto do estado da nuvem.
 *
 * Existe como função pura porque é a única coisa que o usuário vê para saber se o backup
 * está lá — e "última vez: nunca" precisa ser tão claro quanto uma data.
 */
export function describeStatus(status: CloudStatus): string {
  if (status.state === 'signed-out') return 'Entre na sua conta para guardar uma cópia na nuvem.';
  if (status.state === 'never-sent') return 'Nenhuma cópia enviada ainda.';

  const data = new Date(status.at);
  const quando = Number.isNaN(data.getTime())
    ? 'em data desconhecida'
    : data.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fotos = status.photos === 0
    ? 'sem fotos'
    : status.photos === 1 ? '1 foto' : `${status.photos} fotos`;

  return `Última cópia em ${quando} · ${fotos}`;
}

/*
 * Aqui moravam `looksLikeEmail`, `MIN_PASSWORD`, `passwordProblem` e `emailsConferem`.
 *
 * Saíram junto com o cadastro por e-mail e senha. A conferência do endereço em dois
 * campos existia como defesa contra um buraco específico — a confirmação por e-mail
 * estava desligada, então um endereço digitado errado virava conta irrecuperável. Com o
 * Google, quem confirma o endereço é o Google, e não há senha a recuperar. A defesa
 * deixou de ter o que defender, em vez de continuar por inercia.
 */
