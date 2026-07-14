import { useCallback, useEffect, useRef, useState } from 'react';

type Validator<T> = (value: unknown) => value is T;
type Normalizer<T> = (value: unknown) => T;

type StoredValue<T> = {
  value: T;
  serialized: string | null;
};

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
  const lastSerializedValue = useRef<string | null>(null);

  const readStoredValue = useCallback((): StoredValue<T> => {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return { value: initialValue, serialized: null };
      const parsed: unknown = JSON.parse(stored);
      const value = normalizer ? normalizer(parsed) : validator && !validator(parsed) ? initialValue : parsed as T;
      return { value, serialized: JSON.stringify(value) };
    } catch {
      return { value: initialValue, serialized: null };
    }
  }, [initialValue, key, normalizer, validator]);

  const [value, setValue] = useState<T>(() => {
    const stored = readStoredValue();
    lastSerializedValue.current = stored.serialized;
    return stored.value;
  });

  useEffect(() => {
    try {
      const serialized = JSON.stringify(value);
      if (serialized === lastSerializedValue.current) {
        setStorageError(null);
        return;
      }
      window.localStorage.setItem(key, serialized);
      lastSerializedValue.current = serialized;
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
      const stored = readStoredValue();
      if (stored.serialized === lastSerializedValue.current) return;
      lastSerializedValue.current = stored.serialized;
      setValue(stored.value);
    };
    window.addEventListener('storage', sync);
    window.addEventListener(LOCAL_STORAGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(LOCAL_STORAGE_EVENT, sync);
    };
  }, [key, readStoredValue]);

  return [value, setValue, storageError] as const;
}
