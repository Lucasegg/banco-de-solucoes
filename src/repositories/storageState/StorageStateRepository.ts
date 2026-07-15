import { LOCAL_STORAGE_EVENT, localStorageAdapter } from '../../storage/LocalStorageAdapter';
import type { StorageNormalizer, StorageValidator } from '../../storage/StorageAdapter';

type StoredValue<T> = {
  value: T;
  serialized: string | null;
};

export const StorageStateRepository = {
  eventName: LOCAL_STORAGE_EVENT,
  read<T>(key: string, fallback: T, validator?: StorageValidator<T>, normalizer?: StorageNormalizer<T>): StoredValue<T> {
    const value = localStorageAdapter.get(key, { fallback, validator, normalizer });
    return { value, serialized: localStorageAdapter.has(key) ? JSON.stringify(value) : null };
  },
  save<T>(key: string, value: T) {
    return localStorageAdapter.set(key, value);
  },
};
