/** O que o usuário escolhe. `system` acompanha a preferência do aparelho. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** O que a interface de fato pinta. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Automático',
  light: 'Claro',
  dark: 'Escuro',
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Resolve a escolha do usuário contra o que o aparelho reporta.
 *
 * O padrão do app é escuro: uma oficina de impressão 3D raramente é um ambiente bem
 * iluminado, e é assim que o PrintForge nasceu. Então `system` só vira claro quando o
 * aparelho pede claro explicitamente.
 */
export function resolveTheme(preference: ThemePreference, systemPrefersLight: boolean): ResolvedTheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemPrefersLight ? 'light' : 'dark';
}

/**
 * Atributo a estampar em `<html>`.
 *
 * Em `system` nada é estampado, deixando o `@media (prefers-color-scheme)` do CSS
 * decidir sozinho — estampar o tema resolvido travaria a página se o usuário trocasse
 * o tema do aparelho com o app aberto.
 */
export function themeAttribute(preference: ThemePreference): ThemePreference | null {
  return preference === 'system' ? null : preference;
}
