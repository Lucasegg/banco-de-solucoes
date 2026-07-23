import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { formatNotificationDate } from '../../utils/formatNotificationDate';
import { safeNotificationActionUrl } from '../../notifications/navigation';
import { NotificationBadge } from './NotificationBadge';

export function NotificationBell({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const {
    recentItems,
    unreadCount,
    loading,
    error,
    busy,
    markRead,
  } = useNotificationsContext();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const activate = async (id: string, readAt: string | null, url: string | null) => {
    if (!readAt) await markRead(id);
    setOpen(false);
    const destination = safeNotificationActionUrl(url);
    if (destination) window.location.hash = `#${destination}`;
  };

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notificações: ${unreadCount} não lidas`}
        aria-expanded={open}
        className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
      >
        <Bell size={19} />
        <NotificationBadge count={unreadCount} />
      </button>
      {open && (
        <section
          aria-label="Notificações recentes"
          className="absolute right-0 top-12 z-30 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <strong>Notificações</strong>
            <button
              onClick={() => {
                setOpen(false);
                onNavigate('notifications');
              }}
              className="text-sm font-semibold text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              Ver todas
            </button>
          </div>
          <div aria-live="polite">
            {loading && <p className="p-4 text-sm text-muted">Carregando...</p>}
            {error && <p className="p-4 text-sm text-rose-700">{error}</p>}
            {!loading && !error && recentItems.length === 0 && (
              <p className="p-4 text-sm text-muted">Você ainda não possui notificações.</p>
            )}
            {recentItems.map((item) => (
              <button
                disabled={busy}
                key={item.id}
                onClick={() => void activate(item.id, item.readAt, item.actionUrl)}
                className="block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-600 disabled:opacity-60"
              >
                <span className="flex items-start gap-2">
                  {!item.readAt && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-600" aria-label="Não lida" />
                  )}
                  <span>
                    <strong className="block text-sm">{item.title}</strong>
                    <span className="line-clamp-2 block text-xs text-muted">{item.message}</span>
                    <time className="mt-1 block text-xs text-slate-500">
                      {formatNotificationDate(item.createdAt)}
                    </time>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
