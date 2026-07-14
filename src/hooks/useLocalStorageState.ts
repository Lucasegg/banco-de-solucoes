import { useCallback, useEffect, useRef, useState } from 'react';

type Validator<T> = (value: unknown) => value is T;
type Normalizer<T> = (value: unknown) => T;

const LOCAL_STORAGE_EVENT = 'banco-de-solucoes.local-storage';

function notifyStorageKey(key: string, sourceId: string) {
  window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key, sourceId } }));
}

function isStorageNotification(value: Event): value is CustomEvent<{ key: string; sourceId?: string }> {
  return value instanceof CustomEvent && typeof value.detail?.key === 'string';
}

export function useLocalStorageState<T>(key: string, initialValue: T, validator?: Validator<T>, normalizer?: Normalizer<T>) {
  const [storageError, setStorageError] = useState<string | null>(null);
  const sourceId = useRef(`local-storage-${key}-${Math.random().toString(16).slice(2)}`);
  const readValue = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return initialValue;
      const parsed: unknown = JSON.parse(stored);
      if (normalizer) return normalizer(parsed);
      if (validator && !validator(parsed)) return initialValue;
      return parsed as T;
    } catch {
      return initialValue;
    }
  }, [initialValue, key, normalizer, validator]);
  const [value, setValue] = useState<T>(readValue);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      notifyStorageKey(key, sourceId.current);
      setStorageError(null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Não foi possível persistir os dados locais.');
    }
  }, [key, value]);

  useEffect(() => {
    const sync = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== key) return;
      if (isStorageNotification(event) && (event.detail.key !== key || event.detail.sourceId === sourceId.current)) return;
      setValue(readValue());
    };
    window.addEventListener('storage', sync);
    window.addEventListener(LOCAL_STORAGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(LOCAL_STORAGE_EVENT, sync);
    };
  }, [key, readValue]);

  return [value, setValue, storageError] as const;
}
