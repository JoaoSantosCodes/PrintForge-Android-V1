export type Tab = 'home' | 'calc' | 'materials' | 'printers' | 'stock' | 'history' | 'settings';

/** Estado que o botão voltar precisa consultar para decidir o que desfazer. */
export type BackState = {
  tab: Tab;
  tabHistory: Tab[];
  showPrivacy: boolean;
  showMaterialForm: boolean;
  showPrinterForm: boolean;
  showSpoolForm: boolean;
};

export type BackAction =
  | { type: 'closeMaterialForm' }
  | { type: 'closePrinterForm' }
  | { type: 'closeSpoolForm' }
  | { type: 'closePrivacy' }
  | { type: 'popTab'; tab: Tab }
  | { type: 'goHome' }
  | { type: 'exit' };

/**
 * Decide o que o botão físico de voltar deve fazer.
 *
 * A ordem importa: primeiro fecha o que está sobreposto, depois desfaz a navegação,
 * e só encerra o app quando não há mais nada para desfazer. Pura de propósito — é a
 * regra que descreve a expectativa do usuário Android, e merece teste próprio.
 */
export function resolveBackAction(state: BackState): BackAction {
  if (state.showMaterialForm) return { type: 'closeMaterialForm' };
  if (state.showPrinterForm) return { type: 'closePrinterForm' };
  if (state.showSpoolForm) return { type: 'closeSpoolForm' };
  if (state.showPrivacy) return { type: 'closePrivacy' };
  if (state.tabHistory.length > 0) {
    return { type: 'popTab', tab: state.tabHistory[state.tabHistory.length - 1] };
  }
  if (state.tab !== 'home') return { type: 'goHome' };
  return { type: 'exit' };
}
