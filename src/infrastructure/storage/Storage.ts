import { forget, mirror } from './durableMirror';

export interface StorageRepository<T> {
  get(): T;
  /** `false` quando a gravação falhou — cota estourada ou storage indisponível. */
  set(value: T): boolean;
  clear(): void;
}

export type StorageValidator<T> = (value: unknown) => value is T;

export function createStorageRepository<T>(
  key: string,
  fallback: T,
  validate?: StorageValidator<T>,
): StorageRepository<T> {
  return {
    get() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed: unknown = JSON.parse(raw);
        if (validate && !validate(parsed)) {
          localStorage.removeItem(key);
          return fallback;
        }
        return parsed as T;
      } catch {
        try { localStorage.removeItem(key); } catch { /* storage indisponível */ }
        return fallback;
      }
    },
    set(value: T): boolean {
      try {
        const raw = JSON.stringify(value);
        localStorage.setItem(key, raw);
        mirror(key, raw);
        return true;
      } catch {
        // QuotaExceededError ou storage bloqueado. Quem chamou decide o que mostrar:
        // engolir aqui faria o app parecer que salvou quando não salvou.
        return false;
      }
    },
    clear() {
      try { localStorage.removeItem(key); } catch { /* storage indisponível */ }
      forget(key);
    },
  };
}
