import { describe, expect, it } from 'vitest';
import { isThemePreference, resolveTheme, themeAttribute } from './theme';

describe('resolveTheme', () => {
  it('respeita a escolha explícita, ignorando o aparelho', () => {
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', true)).toBe('dark');
  });

  it('em automático, segue o aparelho', () => {
    expect(resolveTheme('system', true)).toBe('light');
    expect(resolveTheme('system', false)).toBe('dark');
  });

  it('cai no escuro quando o aparelho não informa preferência', () => {
    expect(resolveTheme('system', false)).toBe('dark');
  });
});

describe('themeAttribute', () => {
  it('não estampa nada em automático, para o CSS decidir sozinho', () => {
    expect(themeAttribute('system')).toBeNull();
  });

  it('estampa a escolha explícita', () => {
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('dark')).toBe('dark');
  });
});

describe('isThemePreference', () => {
  it('aceita os três valores válidos', () => {
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
  });

  it('rejeita lixo vindo do armazenamento', () => {
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(1)).toBe(false);
  });
});
