import type { SupportedLocale, TranslationKey } from '../i18n/resources.ts';
import { formatDate, formatMessageCount } from '../i18n/format.ts';
export function formatNotificationDate(value: string, locale: SupportedLocale, translate: (key: TranslationKey, values?: Record<string, string | number>) => string, now = new Date()): string {
  const date = new Date(value); const elapsed = now.getTime() - date.getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return formatDate(date, locale);
  if (elapsed < 60_000) return translate('time.now');
  if (elapsed < 3_600_000) return formatMessageCount(Math.floor(elapsed / 60_000), locale, translate, 'time.minutesAgo.one', 'time.minutesAgo.other');
  if (elapsed < 86_400_000) return formatMessageCount(Math.floor(elapsed / 3_600_000), locale, translate, 'time.hoursAgo.one', 'time.hoursAgo.other');
  if (elapsed < 172_800_000) return translate('time.yesterday');
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}
