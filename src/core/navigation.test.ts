import { describe, expect, it } from 'vitest';
import { resolveBackAction, type BackState } from './navigation';

const base: BackState = {
  tab: 'home',
  tabHistory: [],
  showPrivacy: false,
  showMaterialForm: false,
  showPrinterForm: false,
  showSpoolForm: false,
};

describe('resolveBackAction', () => {
  it('encerra o app na tela inicial sem histórico', () => {
    expect(resolveBackAction(base)).toEqual({ type: 'exit' });
  });

  it('fecha o formulário de bobina antes de desfazer navegação', () => {
    const state = { ...base, tab: 'stock' as const, tabHistory: ['home' as const], showSpoolForm: true };
    expect(resolveBackAction(state)).toEqual({ type: 'closeSpoolForm' });
  });

  it('formulário de material ainda vence o de bobina, se os dois estiverem abertos', () => {
    const state = { ...base, showMaterialForm: true, showSpoolForm: true };
    expect(resolveBackAction(state)).toEqual({ type: 'closeMaterialForm' });
  });

  it('fecha o formulário aberto antes de qualquer navegação', () => {
    const state = { ...base, tab: 'materials' as const, tabHistory: ['home' as const], showMaterialForm: true };
    expect(resolveBackAction(state)).toEqual({ type: 'closeMaterialForm' });
  });

  it('dá precedência ao formulário de material sobre o de impressora', () => {
    const state = { ...base, showMaterialForm: true, showPrinterForm: true };
    expect(resolveBackAction(state)).toEqual({ type: 'closeMaterialForm' });
  });

  it('fecha a página de privacidade antes de voltar de aba', () => {
    const state = { ...base, tab: 'settings' as const, tabHistory: ['home' as const], showPrivacy: true };
    expect(resolveBackAction(state)).toEqual({ type: 'closePrivacy' });
  });

  it('desempilha a aba anterior', () => {
    const state = { ...base, tab: 'history' as const, tabHistory: ['home' as const, 'calc' as const] };
    expect(resolveBackAction(state)).toEqual({ type: 'popTab', tab: 'calc' });
  });

  it('volta para a inicial quando a pilha esvaziou fora da home', () => {
    const state = { ...base, tab: 'settings' as const, tabHistory: [] };
    expect(resolveBackAction(state)).toEqual({ type: 'goHome' });
  });

  it('nunca encerra o app com formulário aberto na tela inicial', () => {
    const state = { ...base, showPrinterForm: true };
    expect(resolveBackAction(state)).not.toEqual({ type: 'exit' });
  });
});
