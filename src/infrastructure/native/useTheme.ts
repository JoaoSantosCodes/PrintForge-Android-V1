import { useEffect, useState } from 'react';
import {
  isThemePreference,
  resolveTheme,
  themeAttribute,
  type ResolvedTheme,
  type ThemePreference,
} from '../../core/theme';
import { createStorageRepository } from '../storage/Storage';
import { applyThemeToNativeChrome } from './chrome';

/**
 * Chave própria, fora de `StoredSettings`.
 *
 * Tema é preferência deste aparelho, não dado do negócio: manter separado evita mexer
 * no formato do backup, nos validadores e na versão do arquivo exportado — e evita que
 * restaurar um backup do celular do sócio troque o tema do seu.
 */
export const THEME_KEY = 'printforge.theme';

const themeRepository = createStorageRepository<ThemePreference>(
  THEME_KEY,
  'system',
  (value): value is ThemePreference => isThemePreference(value),
);

const LIGHT_QUERY = '(prefers-color-scheme: light)';

function systemPrefersLight(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(LIGHT_QUERY).matches;
}

export function useTheme(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => themeRepository.get());
  const [prefersLight, setPrefersLight] = useState(systemPrefersLight);

  // Só importa em 'system', mas o listener fica sempre ativo: o usuário pode voltar
  // para automático com o app aberto, e aí o valor precisa já estar correto.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(LIGHT_QUERY);
    const onChange = (event: MediaQueryListEvent) => setPrefersLight(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = resolveTheme(preference, prefersLight);

  useEffect(() => {
    const attribute = themeAttribute(preference);
    if (attribute === null) document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', attribute);

    void applyThemeToNativeChrome(resolved);

    // A saída da splash do Android 12+ devolve a aparência da barra de status ao valor
    // declarado no tema da janela — `values/` ou `values-night/`, conforme o aparelho.
    // Quando a escolha do usuário contraria o tema do aparelho, esse valor é o oposto do
    // certo, e a aplicação acima, que roda antes, é desfeita: ícones brancos sobre o tema
    // claro a cada abertura. Não há aviso do fim da splash exposto ao JS, então repomos
    // uma vez depois que ela certamente já saiu.
    //
    // É um prazo estimado, e assumido como tal: o pior caso vira um segundo com os ícones
    // errados em vez de errados para sempre. A alternativa sem espera seria ler a
    // preferência no MainActivity, o que amarraria código Java ao nome de uma chave de
    // armazenamento — troca ruim para o que se ganha.
    const reaplicar = window.setTimeout(() => void applyThemeToNativeChrome(resolved), 1000);
    return () => window.clearTimeout(reaplicar);
  }, [preference, resolved]);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    themeRepository.set(next);
  };

  return { preference, resolved, setPreference };
}
