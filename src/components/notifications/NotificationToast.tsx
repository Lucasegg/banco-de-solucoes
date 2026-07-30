import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { NotificationToastTimer } from '../../repositories/notifications/toast';
import type { NotificationItem } from '../../types/notification';

export function NotificationToast({ notification, onClose }: { notification: NotificationItem | null; onClose: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!notification) return;
    const timer = new NotificationToastTimer(onClose);
    timer.start();
    return () => timer.stop();
  }, [notification?.id, onClose]);
  if (!notification) return null;
  return <aside role="status" aria-live="polite" aria-atomic="true" className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-sky-200 bg-white p-4 shadow-xl">
    <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><strong className="block text-sm text-slate-950">{notification.title}</strong><p className="mt-1 text-sm text-slate-600">{notification.message}</p></div>
      <button type="button" onClick={onClose} aria-label={t('notifications.toastClose')} className="rounded-full p-1 text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"><X size={18} aria-hidden="true" /></button></div>
  </aside>;
}
