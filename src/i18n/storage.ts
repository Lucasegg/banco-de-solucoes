import { LANGUAGE_STORAGE_KEY, normalizeLocale } from './core.ts';
import type { SupportedLocale } from './resources.ts';

export interface LocaleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readStoredLocale(storage?: LocaleStorage | null): SupportedLocale | null {
  if (!storage) return null;
  try {
    return normalizeLocale(storage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredLocale(storage: LocaleStorage | null | undefined, locale: SupportedLocale): boolean {
  if (!storage) return false;
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, locale);
    return true;
  } catch {
    return false;
  }
}

export function browserLocaleStorage(): LocaleStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
