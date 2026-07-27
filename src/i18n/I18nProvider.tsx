import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, detectLocale, normalizeLocale, translate } from './core';
import type { SupportedLocale, TranslationKey } from './resources';
import { browserLocaleStorage, readStoredLocale, writeStoredLocale } from './storage';
import { applyLocaleToDocument } from './document';

type I18nContextValue = { locale: SupportedLocale; setLocale: (locale: SupportedLocale) => void; t: (key: TranslationKey, values?: Record<string, string | number>) => string };
const I18nContext = createContext<I18nContextValue>({ locale: DEFAULT_LOCALE, setLocale: () => undefined, t: (key) => key });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => detectLocale(readStoredLocale(browserLocaleStorage()), navigator.languages));
  const setLocale = useCallback((next: SupportedLocale) => {
    const safeLocale = normalizeLocale(next) ?? DEFAULT_LOCALE;
    writeStoredLocale(browserLocaleStorage(), safeLocale);
    setLocaleState(safeLocale);
  }, []);
  useEffect(() => {
    applyLocaleToDocument(document, locale);
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t: (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values) }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useTranslation = () => useContext(I18nContext) as I18nContextValue;
