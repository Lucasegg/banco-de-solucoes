import { notificationCategories } from '../../notifications/presentation';
import type { NotificationCategory } from '../../types/notification';
import { useTranslation } from '../../i18n/I18nProvider';

export function NotificationFilters({ category, unreadOnly, onChange }: { category?: NotificationCategory; unreadOnly: boolean; onChange: (category?: NotificationCategory, unreadOnly?: boolean) => void }) {
  const { t } = useTranslation();
  return <fieldset className="flex flex-wrap gap-2" aria-label={t('notifications.filter')}>
    {notificationCategories.map(({ value, label }) => {
      const selected = value === 'unread' ? unreadOnly : !unreadOnly && (value === '' ? !category : category === value);
      return <button key={value || 'all'} type="button" aria-pressed={selected} onClick={() => onChange(value === 'unread' ? undefined : (value || undefined) as NotificationCategory | undefined, value === 'unread')} className={`rounded-full px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${selected ? 'bg-slate-950 text-white' : 'border bg-white text-slate-700'}`}>{t(label)}</button>;
    })}
  </fieldset>;
}
