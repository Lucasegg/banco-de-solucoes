import type { StorageAdapter, StorageListOptions, StorageReadOptions, StorageTransactionOperation } from './StorageAdapter';

export const LOCAL_STORAGE_EVENT = 'banco-de-solucoes.local-storage';

type SnapshotItem = { key: string; value: string | null };

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function notifyStorageKey(key: string, sourceId?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key, sourceId } }));
}

function toStoredValue(value: unknown) {
  return JSON.stringify(value);
}

export class LocalStorageAdapter implements StorageAdapter {
  get<T>(key: string, options: StorageReadOptions<T>): T {
    try {
      if (!canUseLocalStorage()) return options.fallback;
      const rawValue = window.localStorage.getItem(key);
      if (!rawValue) return options.fallback;
      const parsed: unknown = JSON.parse(rawValue);
      if (options.normalizer) return options.normalizer(parsed);
      if (options.validator && !options.validator(parsed)) return options.fallback;
      return parsed as T;
    } catch {
      return options.fallback;
    }
  }

  set<T>(key: string, value: T): boolean {
    try {
      if (!canUseLocalStorage()) return false;
      window.localStorage.setItem(key, toStoredValue(value));
      notifyStorageKey(key);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): boolean {
    try {
      if (!canUseLocalStorage()) return false;
      window.localStorage.removeItem(key);
      notifyStorageKey(key);
      return true;
    } catch {
      return false;
    }
  }

  list<T>(key: string, options: StorageListOptions<T>): T[] {
    try {
      if (!canUseLocalStorage()) return [];
      const rawValue = window.localStorage.getItem(key);
      if (!rawValue) return [];
      const parsed: unknown = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) return [];
      if (options.normalizer) {
        return parsed.map(options.normalizer).filter((item): item is T => item !== null);
      }
      return options.validator ? parsed.filter(options.validator) : parsed as T[];
    } catch {
      return [];
    }
  }

  transaction(operations: StorageTransactionOperation[]): boolean {
    if (!canUseLocalStorage()) return false;
    const changedKeys = Array.from(new Set(operations.map((operation) => operation.key)));
    const snapshot = this.snapshot(changedKeys);
    try {
      operations.forEach((operation) => {
        if (operation.type === 'remove') window.localStorage.removeItem(operation.key);
        else window.localStorage.setItem(operation.key, toStoredValue(operation.value));
      });
      changedKeys.forEach((key) => notifyStorageKey(key));
      return true;
    } catch {
      this.restore(snapshot);
      return false;
    }
  }

  clear(keys?: string[]): boolean {
    try {
      if (!canUseLocalStorage()) return false;
      if (keys) {
        keys.forEach((key) => {
          window.localStorage.removeItem(key);
          notifyStorageKey(key);
        });
      } else {
        window.localStorage.clear();
        notifyStorageKey('*');
      }
      return true;
    } catch {
      return false;
    }
  }

  has(key: string): boolean {
    try {
      return canUseLocalStorage() && window.localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  private snapshot(keys: string[]): SnapshotItem[] {
    return keys.map((key) => ({ key, value: window.localStorage.getItem(key) }));
  }

  private restore(items: SnapshotItem[]) {
    items.forEach((item) => {
      if (item.value === null) window.localStorage.removeItem(item.key);
      else window.localStorage.setItem(item.key, item.value);
    });
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
export { notifyStorageKey };
