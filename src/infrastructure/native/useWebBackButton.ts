import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/** Marca a entrada como nossa, para não confundir com histórico de outra origem. */
const SENTINEL = { printforge: 'back' } as const;

const isWeb = (): boolean =>
  typeof window !== 'undefined' && Capacitor.getPlatform() === 'web';

/**
 * Dá ao voltar do navegador o mesmo comportamento do voltar do Android.
 *
 * No app nativo existe um botão físico para interceptar; no navegador não existe —
 * o que existe é a pilha do histórico. Então o truque é manter nela uma entrada
 * sentinela enquanto o app tiver algo a desfazer: o voltar do navegador consome a
 * sentinela, o `popstate` chega até aqui, e a decisão vem do mesmo
 * `resolveBackAction` que o Android usa.
 *
 * A invariante é uma só: **existe uma sentinela no histórico se, e somente se, o app
 * tem algo a desfazer**. Por isso `trapped` é estado, não ref — depois de consumir um
 * voltar o efeito precisa rodar de novo e repor a sentinela, mesmo que `canGoBack`
 * não tenha mudado (voltar de Materiais para Calcular ainda deixa Início na pilha).
 *
 * Quando não há o que desfazer não há sentinela, e o voltar sai do site na primeira
 * tentativa — que é o equivalente web de encerrar o app.
 */
export function useWebBackButton(canGoBack: boolean, handler: () => boolean): void {
  const [trapped, setTrapped] = useState(false);

  // Pela mesma razão do `useBackButton`: o ouvinte é inscrito uma vez só, e sem a ref
  // ele ficaria preso ao estado da primeira renderização — o segundo voltar decidiria
  // com a navegação de antes do primeiro.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!isWeb()) return;

    const onPopState = () => {
      setTrapped(false);
      // Não repõe a sentinela aqui: o efeito abaixo decide isso a partir do estado
      // já atualizado. Repor às cegas deixaria uma sentinela órfã na pilha quando o
      // voltar tivesse esvaziado a navegação.
      handlerRef.current();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!isWeb()) return;
    if (!canGoBack || trapped) return;
    window.history.pushState(SENTINEL, '');
    setTrapped(true);
  }, [canGoBack, trapped]);

  // Limitação conhecida: fechar um formulário pelo próprio botão da tela deixa uma
  // sentinela órfã, e o primeiro voltar depois disso não faz nada visível. Retirá-la
  // exigiria chamar `history.back()` por conta própria, e um dessincronismo aí jogaria
  // o usuário para fora do site sem que ele tivesse pedido. Uma tecla morta é o erro
  // mais barato dos dois.
}
