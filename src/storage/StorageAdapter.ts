export type StorageValidator<T> = (value: unknown) => value is T;
export type StorageNormalizer<T> = (value: unknown) => T;

export type StorageReadOptions<T> = {
  validator?: StorageValidator<T>;
  normalizer?: StorageNormalizer<T>;
  fallback: T;
};

export type StorageListOptions<T> = {
  validator?: StorageValidator<T>;
  normalizer?: StorageNormalizer<T | null>;
};

export type StorageTransactionOperation =
  | { type: 'set'; key: string; value: unknown }
  | { type: 'remove'; key: string };

export interface StorageAdapter {
  get<T>(key: string, options: StorageReadOptions<T>): T;
  set<T>(key: string, value: T): boolean;
  remove(key: string): boolean;
  list<T>(key: string, options: StorageListOptions<T>): T[];
  transaction(operations: StorageTransactionOperation[]): boolean;
  clear(keys?: string[]): boolean;
  has(key: string): boolean;
}
