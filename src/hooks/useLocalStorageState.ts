import { useEffect, useState } from 'react';

type Validator<T> = (value: unknown) => value is T;
type Normalizer<T> = (value: unknown) => T;

export function useLocalStorageState<T>(key: string, initialValue: T, validator?: Validator<T>, normalizer?: Normalizer<T>) {
  const [storageError, setStorageError] = useState<string | null>(null);
  const [value, setValue] = useState<T>(() => {
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
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      setStorageError(null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Não foi possível persistir os dados locais.');
    }
  }, [key, value]);

  return [value, setValue, storageError] as const;
}
