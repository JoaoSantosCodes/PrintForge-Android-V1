import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Rede de segurança da raiz.
 *
 * Sem isto, uma exceção durante o render desmonta a árvore inteira e a WebView do
 * Android fica branca — sem mensagem e sem caminho de volta, obrigando o usuário a
 * forçar a parada do app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Sem serviço de telemetria no projeto; o console é o que resta para diagnóstico.
    console.error('Falha não tratada na interface:', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash-screen" role="alert">
        <h1>O aplicativo travou</h1>
        <p>
          Seus materiais, impressoras e histórico continuam salvos no aparelho — nada
          foi perdido.
        </p>
        <p className="crash-detail">{error.message}</p>
        <button type="button" onClick={() => this.setState({ error: null })}>
          Tentar novamente
        </button>
        <button type="button" className="secondary" onClick={() => window.location.reload()}>
          Reiniciar o aplicativo
        </button>
      </div>
    );
  }
}
