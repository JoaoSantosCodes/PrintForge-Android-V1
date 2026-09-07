// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import { useWebBackButton } from './useWebBackButton';

afterEach(cleanup);

/**
 * jsdom implementa `pushState` mas não navega de verdade, então o `popstate` é
 * disparado à mão — é o mesmo evento que o navegador entrega, e é tudo o que o hook
 * observa.
 */
function voltar() {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

let pushSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  pushSpy = vi.spyOn(window.history, 'pushState');
});

afterEach(() => {
  pushSpy.mockRestore();
});

/** Uma pilha de navegação mínima, com a mesma forma da do App. */
function Navegacao({ inicial = 0, aoSair }: { inicial?: number; aoSair?: () => void }) {
  const [profundidade, setProfundidade] = useState(inicial);

  useWebBackButton(profundidade > 0, () => {
    if (profundidade === 0) {
      aoSair?.();
      return false;
    }
    setProfundidade((atual) => atual - 1);
    return true;
  });

  return <span data-testid="profundidade">{profundidade}</span>;
}

describe('useWebBackButton', () => {
  it('não empilha sentinela quando não há o que desfazer', () => {
    render(<Navegacao inicial={0} />);
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('empilha uma sentinela assim que o app passa a ter o que desfazer', () => {
    render(<Navegacao inicial={1} />);
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('não empilha uma segunda sentinela enquanto a primeira não foi consumida', () => {
    const { rerender } = render(<Navegacao inicial={2} />);
    rerender(<Navegacao inicial={2} />);
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('desfaz um passo da navegação quando o voltar do navegador dispara', () => {
    const { getByTestId } = render(<Navegacao inicial={2} />);
    voltar();
    expect(getByTestId('profundidade').textContent).toBe('1');
  });

  it('repõe a sentinela quando ainda sobrou o que desfazer', () => {
    render(<Navegacao inicial={2} />);
    expect(pushSpy).toHaveBeenCalledTimes(1);
    voltar();
    expect(pushSpy).toHaveBeenCalledTimes(2);
  });

  it('não repõe a sentinela quando a navegação se esgotou', () => {
    render(<Navegacao inicial={1} />);
    voltar();
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('deixa o voltar seguinte sair do site depois de esgotar a navegação', () => {
    const aoSair = vi.fn();
    render(<Navegacao inicial={1} aoSair={aoSair} />);
    voltar();
    expect(aoSair).not.toHaveBeenCalled();
    voltar();
    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  it('sai do site já no primeiro voltar quando não havia navegação alguma', () => {
    const aoSair = vi.fn();
    render(<Navegacao inicial={0} aoSair={aoSair} />);
    voltar();
    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  it('para de ouvir o histórico depois de desmontar', () => {
    const aoSair = vi.fn();
    const { unmount } = render(<Navegacao inicial={0} aoSair={aoSair} />);
    unmount();
    voltar();
    expect(aoSair).not.toHaveBeenCalled();
  });
});
