import { resources, type SupportedLocale, type TranslationKey } from './resources.ts';

export const DEFAULT_LOCALE: SupportedLocale = 'pt-BR';
export const LANGUAGE_STORAGE_KEY = 'banco-de-solucoes.locale';
export const supportedLocales = Object.keys(resources) as SupportedLocale[];

export function normalizeLocale(value?: string | null): SupportedLocale | null {
  if (!value) return null;
  const normalized = value.replace('_', '-').toLowerCase();
  if (normalized === 'pt' || normalized.startsWith('pt-')) return 'pt-BR';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en-US';
  return null;
}

export function detectLocale(stored: string | null, browserLanguages: readonly string[]): SupportedLocale {
  return normalizeLocale(stored) ?? browserLanguages.map(normalizeLocale).find(Boolean) ?? DEFAULT_LOCALE;
}

export function translate(locale: SupportedLocale, key: TranslationKey, values: Record<string, string | number> = {}): string {
  const template = resources[locale][key] ?? resources[DEFAULT_LOCALE][key] ?? key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)), template);
}
