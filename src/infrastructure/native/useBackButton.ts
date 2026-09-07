import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Trata o botão físico de voltar do Android.
 *
 * `handler` devolve `true` quando consumiu o evento (fechou um formulário, voltou
 * uma aba) e `false` quando não havia para onde voltar — aí o app encerra, que é o
 * comportamento que o usuário espera na tela inicial.
 *
 * O handler fica numa ref porque muda a cada render: sem isso, o listener nativo
 * seria removido e reinscrito a cada tecla digitada.
 */
export function useBackButton(handler: () => boolean): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    void CapacitorApp.addListener('backButton', () => {
      if (handlerRef.current()) return;
      void CapacitorApp.exitApp();
    }).then((listener) => {
      // O componente pode desmontar antes de a promise resolver.
      if (cancelled) void listener.remove();
      else remove = () => void listener.remove();
    });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
}
