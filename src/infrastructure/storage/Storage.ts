export interface StorageRepository<T> {
  get(): T;
  set(value: T): void;
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
    set(value: T) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo somente memória */ }
    },
    clear() {
      try { localStorage.removeItem(key); } catch { /* storage indisponível */ }
    },
  };
}
