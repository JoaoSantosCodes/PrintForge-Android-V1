import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * Espelho durável do localStorage em SharedPreferences do Android.
 *
 * O localStorage segue sendo a cópia de trabalho — leitura síncrona, que é o que os
 * inicializadores de `useState` precisam. Este módulo só duplica as gravações no
 * armazenamento nativo e sabe restaurar a partir dele.
 *
 * O que isso protege: dados de WebView podem ser descartados pelo sistema sob pressão
 * de armazenamento, enquanto SharedPreferences não é. O que isso *não* protege: "limpar
 * dados" nas configurações do Android apaga os dois, e desinstalar também — para esses
 * casos a resposta é exportar, não espelhar.
 */

const isNative = (): boolean => Capacitor.getPlatform() !== 'web';

/** Grava em segundo plano. Falha aqui não pode derrubar a gravação principal. */
export function mirror(key: string, raw: string): void {
  if (!isNative()) return;
  void Preferences.set({ key, value: raw }).catch(() => undefined);
}

export function forget(key: string): void {
  if (!isNative()) return;
  void Preferences.remove({ key }).catch(() => undefined);
}

/**
 * Repõe no localStorage as chaves que existem no espelho e sumiram do WebView.
 *
 * Devolve as chaves restauradas. Só age quando o localStorage não tem a chave: o
 * espelho é rede de segurança, nunca fonte da verdade — senão uma escrita perdida
 * poderia sobrescrever dados mais novos.
 */
export async function restoreMissing(keys: readonly string[]): Promise<string[]> {
  if (!isNative()) return [];
  const restored: string[] = [];
  for (const key of keys) {
    try {
      if (localStorage.getItem(key) !== null) continue;
      const { value } = await Preferences.get({ key });
      if (value === null) continue;
      localStorage.setItem(key, value);
      restored.push(key);
    } catch {
      // Uma chave que falha não impede as demais.
    }
  }
  return restored;
}
