import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { hideSplash } from './infrastructure/native/chrome';
import { restoreMissing } from './infrastructure/storage/durableMirror';
import { STORAGE_KEYS } from './infrastructure/storage/LocalStorageRepository';

/**
 * Repõe do espelho nativo o que o WebView tiver perdido, antes do primeiro render —
 * os inicializadores de useState leem o localStorage de forma síncrona, então a
 * restauração precisa acontecer antes deles.
 */
async function boot(): Promise<void> {
  try {
    await restoreMissing(Object.values(STORAGE_KEYS));
  } catch {
    // Sem espelho disponível, segue com o que houver no localStorage.
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );

  // Dois quadros: o primeiro agenda o commit do React, o segundo roda depois da pintura.
  // Esconder a splash antes disso mostraria o branco da WebView.
  requestAnimationFrame(() => requestAnimationFrame(() => void hideSplash()));
}

void boot();
