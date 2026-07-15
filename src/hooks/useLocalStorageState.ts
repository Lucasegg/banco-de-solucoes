import { useCallback, useEffect, useRef, useState } from 'react';
import { StorageStateRepository } from '../repositories/storageState';

type Validator<T> = (value: unknown) => value is T;
type Normalizer<T> = (value: unknown) => T;

function isStorageNotification(value: Event): value is CustomEvent<{ key: string; sourceId?: string }> {
  return value instanceof CustomEvent && typeof value.detail?.key === 'string';
}

export function useLocalStorageState<T>(key: string, initialValue: T, validator?: Validator<T>, normalizer?: Normalizer<T>) {
  const [storageError, setStorageError] = useState<string | null>(null);
  const sourceId = useRef(`local-storage-${key}-${Math.random().toString(16).slice(2)}`);
  const lastSerializedValue = useRef<string | null>(null);

  const readStoredValue = useCallback(() => {
    try {
      return StorageStateRepository.read(key, initialValue, validator, normalizer);
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
      if (!StorageStateRepository.save(key, value)) throw new Error('Não foi possível persistir os dados locais.');
      lastSerializedValue.current = serialized;
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
    window.addEventListener(StorageStateRepository.eventName, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(StorageStateRepository.eventName, sync);
    };
  }, [key, readStoredValue]);

  return [value, setValue, storageError] as const;
}
