// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AccountPage } from './AccountPage';
import type { CloudStatus } from '../core/cloudBackup';

afterEach(cleanup);

/**
 * Esta tela não aparece nos testes que montam o `App`, e não por descuido: a suíte roda
 * com `.env.test` de valores vazios — o que a Fase 15 introduziu para a suíte parar de
 * bater num servidor de verdade —, então `cloudConfigured()` é falso e a seção de nuvem
 * some por inteiro.
 *
 * O efeito colateral é que a interface da nuvem ficava sem cobertura nenhuma. Montar o
 * componente direto, com um estado de mentira, cobre o que mudou sem reabrir aquele
 * buraco: nada aqui cria cliente nem toca a rede.
 */
function montar(status: CloudStatus, over: Partial<Parameters<typeof AccountPage>[0]> = {}) {
  const props = {
    status,
    busy: false,
    onBack: vi.fn(),
    onSignInWithGoogle: vi.fn(),
    onSignOut: vi.fn(),
    onUpload: vi.fn(),
    onRestore: vi.fn(),
    onDeleteCloud: vi.fn(),
    ...over,
  };
  render(<AccountPage {...props} />);
  return props;
}

describe('AccountPage, deslogado', () => {
  it('oferece um botão do Google, e só ele', () => {
    montar({ state: 'signed-out' });
    expect(screen.getByRole('button', { name: /continuar com o google/i })).toBeInTheDocument();
  });

  /**
   * O ponto da mudança. Se um campo de senha reaparecer aqui, alguém reintroduziu o
   * cadastro por e-mail — e com ele volta a exigência de SMTP próprio, que é o bloqueio
   * que este login foi escolhido para apagar.
   */
  it('não pede e-mail nem senha em lugar nenhum', () => {
    const { container } = render(
      <AccountPage
        status={{ state: 'signed-out' }} busy={false}
        onBack={vi.fn()} onSignInWithGoogle={vi.fn()} onSignOut={vi.fn()}
        onUpload={vi.fn()} onRestore={vi.fn()} onDeleteCloud={vi.fn()}
      />,
    );
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(screen.queryByText(/criar conta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/já tenho uma conta/i)).not.toBeInTheDocument();
  });

  it('o toque no botão chama quem entra', () => {
    const props = montar({ state: 'signed-out' });
    fireEvent.click(screen.getByRole('button', { name: /continuar com o google/i }));
    expect(props.onSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('durante a espera o botão não aceita um segundo toque', () => {
    const props = montar({ state: 'signed-out' }, { busy: true });
    const botao = screen.getByRole('button', { name: /aguarde/i });
    expect(botao).toBeDisabled();
    fireEvent.click(botao);
    expect(props.onSignInWithGoogle).not.toHaveBeenCalled();
  });

  it('diz que o aplicativo funciona sem conta', () => {
    // A promessa do cabeçalho OFFLINE FIRST e da política de privacidade. Se esta tela
    // deixar de dizer isso, o login passa a parecer obrigatório.
    montar({ state: 'signed-out' });
    expect(screen.getByText(/funciona por completo sem conta/i)).toBeInTheDocument();
    expect(screen.getByText(/backup em arquivo/i)).toBeInTheDocument();
  });

  it('avisa que a senha não passa pelo aplicativo', () => {
    montar({ state: 'signed-out' });
    expect(screen.getByText(/não vê nem guarda a sua senha/i)).toBeInTheDocument();
  });
});

describe('AccountPage, conectado', () => {
  const conectado: CloudStatus = { state: 'sent', email: 'joao@exemplo.com', at: '2026-09-08T10:00:00.000Z', photos: 2 };

  it('mostra a conta e o que há na nuvem', () => {
    montar(conectado);
    expect(screen.getByText('joao@exemplo.com')).toBeInTheDocument();
    expect(screen.getByText(/2 fotos/)).toBeInTheDocument();
  });

  it('não oferece o botão do Google a quem já entrou', () => {
    montar(conectado);
    expect(screen.queryByRole('button', { name: /continuar com o google/i })).not.toBeInTheDocument();
  });

  it('sair da conta chama quem sai', () => {
    const props = montar(conectado);
    fireEvent.click(screen.getByRole('button', { name: /sair da conta/i }));
    expect(props.onSignOut).toHaveBeenCalledTimes(1);
  });

  it('o voltar volta', () => {
    const props = montar(conectado);
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });
});
