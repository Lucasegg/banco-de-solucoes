import type { SupportedLocale } from './resources.ts';

const validDate = (value: string | number | Date | null | undefined) => { const date = value == null ? null : new Date(value); return date && !Number.isNaN(date.getTime()) ? date : null; };
export const formatDate = (value: string | number | Date | null | undefined, locale: SupportedLocale, fallback = '—') => { const date = validDate(value); return date ? new Intl.DateTimeFormat(locale).format(date) : fallback; };
export const formatDateTime = (value: string | number | Date | null | undefined, locale: SupportedLocale, fallback = '—') => { const date = validDate(value); return date ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : fallback; };
export const formatNumber = (value: number | null | undefined, locale: SupportedLocale, fallback = '—') => Number.isFinite(value) ? new Intl.NumberFormat(locale).format(value as number) : fallback;
export const formatCount = (value: number | null | undefined, locale: SupportedLocale, singular: string, plural: string, fallback = '—') => Number.isFinite(value) ? `${formatNumber(value, locale)} ${new Intl.PluralRules(locale).select(value as number) === 'one' ? singular : plural}` : fallback;
