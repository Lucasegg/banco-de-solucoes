import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, detectLocale, LANGUAGE_STORAGE_KEY, translate } from './core';
import type { SupportedLocale, TranslationKey } from './resources';

type I18nContextValue = { locale: SupportedLocale; setLocale: (locale: SupportedLocale) => void; t: (key: TranslationKey, values?: Record<string, string | number>) => string };
const I18nContext = createContext<I18nContextValue>({ locale: DEFAULT_LOCALE, setLocale: () => undefined, t: (key) => key });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => detectLocale(window.localStorage.getItem(LANGUAGE_STORAGE_KEY), navigator.languages));
  const setLocale = useCallback((next: SupportedLocale) => { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next); setLocaleState(next); }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, 'app.name');
    document.querySelector('meta[name="description"]')?.setAttribute('content', translate(locale, 'app.description'));
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t: (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values) }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useTranslation = () => useContext(I18nContext) as I18nContextValue;
