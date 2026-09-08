/**
 * O que fazer com uma exceção vinda da folha de contas do Google.
 *
 * Mora no núcleo, e não junto do plugin, porque é decisão pura sobre texto — e porque a
 * decisão errada tem custo nos dois sentidos. Tratar cancelamento como falha põe um aviso
 * vermelho na tela de quem só fechou a folha; tratar falha como cancelamento engole a
 * única pista de um problema de configuração.
 *
 * A checagem é por trechos, e não por igualdade: a mensagem do Credential Manager varia
 * entre versões do Android e do próprio plugin, e fixar uma string exata daria um
 * classificador que envelhece sem avisar.
 */

export type GoogleFailure =
  /** A pessoa fechou a folha de contas. Não é falha, e não merece alarme na tela. */
  | { cancelado: true }
  | { cancelado: false; reason: string };

const CANCELAMENTO = [
  'cancel',
  'user_cancel',
  'activity is cancelled',
  'no credential',
];

/**
 * `10` é o `DEVELOPER_ERROR` do Google Play Services, e quase sempre significa uma coisa
 * só: a impressão digital SHA-1 do certificado que assinou este aplicativo não está
 * registrada no Google Cloud. Com o Play App Signing, a que vale é a da chave de
 * assinatura do app, e não a do keystore de upload — ver `docs/google-signin.md`.
 */
const NAO_AUTORIZADO = ['developer_error', 'api exception: 10', '10:'];

const SEM_REDE = ['network', 'failed to fetch', 'unable to resolve host'];

export function classifyGoogleError(mensagem: string): GoogleFailure {
  const m = mensagem.toLowerCase();

  if (CANCELAMENTO.some((t) => m.includes(t))) return { cancelado: true };

  if (SEM_REDE.some((t) => m.includes(t))) {
    return { cancelado: false, reason: 'Sem conexão com o Google. Verifique a internet.' };
  }
  if (NAO_AUTORIZADO.some((t) => m.includes(t))) {
    return { cancelado: false, reason: 'Este aplicativo não está autorizado a usar o login do Google. Avise o desenvolvedor.' };
  }

  // Sem tradução inventada: um texto genérico esconderia a única pista de um caso que
  // ninguém previu, e é justamente esse que precisa chegar inteiro a quem for depurar.
  return { cancelado: false, reason: mensagem };
}
