import type { SupportedLocale } from './resources.ts';
import type { TranslationKey } from './resources.ts';

const validDate = (value: string | number | Date | null | undefined) => { const date = value == null ? null : new Date(value); return date && !Number.isNaN(date.getTime()) ? date : null; };
export const formatDate = (value: string | number | Date | null | undefined, locale: SupportedLocale, fallback = '—') => { const date = validDate(value); return date ? new Intl.DateTimeFormat(locale).format(date) : fallback; };
export const formatDateTime = (value: string | number | Date | null | undefined, locale: SupportedLocale, fallback = '—') => { const date = validDate(value); return date ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : fallback; };
export const formatNumber = (value: number | null | undefined, locale: SupportedLocale, fallback = '—') => Number.isFinite(value) ? new Intl.NumberFormat(locale).format(value as number) : fallback;
export const formatCount = (value: number | null | undefined, locale: SupportedLocale, translate: (key: TranslationKey) => string, oneKey: TranslationKey, otherKey: TranslationKey, fallback = '—') => Number.isFinite(value) ? `${formatNumber(value, locale)} ${translate(new Intl.PluralRules(locale).select(value as number) === 'one' ? oneKey : otherKey)}` : fallback;
export const formatDurationClock = (seconds: number | null | undefined, locale: SupportedLocale, fallback = '—') => {
  if (!Number.isFinite(seconds) || (seconds as number) < 0) return fallback;
  const twoDigits = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
  return `${twoDigits.format(Math.floor((seconds as number) / 60))}:${twoDigits.format((seconds as number) % 60)}`;
};
