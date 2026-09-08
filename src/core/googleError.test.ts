import { describe, expect, it } from 'vitest';
import { classifyGoogleError } from './googleError';

describe('classifyGoogleError', () => {
  /**
   * Fechar a folha de contas é a saída mais comum de todas — muito mais comum que
   * qualquer falha real. Um aviso vermelho aqui ensina a pessoa que o botão está
   * quebrado, quando ela só mudou de ideia.
   */
  it('reconhece as formas de cancelamento que o Android usa', () => {
    for (const texto of [
      'User cancelled the flow',
      'activity is cancelled by the user.',
      'androidx.credentials.exceptions.GetCredentialCancellationException',
      '[16] Cancelled by user',
      'No credential available',
    ]) {
      expect(classifyGoogleError(texto).cancelado, texto).toBe(true);
    }
  });

  it('não confunde falha de rede com cancelamento', () => {
    const r = classifyGoogleError('Failed to fetch');
    expect(r.cancelado).toBe(false);
    if (!r.cancelado) expect(r.reason).toContain('internet');
  });

  /**
   * O erro 10 é o que aparece quando o SHA-1 não está registrado — e vai aparecer para
   * *todos* os testadores se só a chave de upload for cadastrada, porque o Play reassina
   * o pacote com outra. A mensagem precisa dizer que é problema do desenvolvedor, senão
   * doze pessoas vão relatar "o login não funciona" sem mais nada.
   */
  it('aponta o desenvolvedor no erro de certificado não registrado', () => {
    for (const texto of [
      'com.google.android.gms.common.api.ApiException: 10: ',
      'DEVELOPER_ERROR',
    ]) {
      const r = classifyGoogleError(texto);
      expect(r.cancelado, texto).toBe(false);
      if (!r.cancelado) expect(r.reason).toContain('desenvolvedor');
    }
  });

  it('deixa passar inteiro o que não sabe traduzir', () => {
    const r = classifyGoogleError('Something nobody predicted #4711');
    expect(r.cancelado).toBe(false);
    if (!r.cancelado) expect(r.reason).toBe('Something nobody predicted #4711');
  });

  it('não depende de caixa alta ou baixa', () => {
    expect(classifyGoogleError('USER CANCELLED').cancelado).toBe(true);
    expect(classifyGoogleError('user cancelled').cancelado).toBe(true);
  });
});
