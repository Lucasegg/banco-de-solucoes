import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { NotificationFilters } from '../components/notifications/NotificationFilters';
import { NotificationList } from '../components/notifications/NotificationList';
import { useNotifications } from '../hooks/useNotifications';
import { notificationMessages, safeNotificationActionUrl } from '../notifications/presentation';
import type { NotificationItem } from '../types/notification';

export function Notifications() {
  const notifications = useNotifications();
  const [status, setStatus] = useState('');
  const open = async (item: NotificationItem) => {
    if (!item.readAt && !await notifications.markRead(item.id)) return;
    const url = safeNotificationActionUrl(item.actionUrl);
    if (url) window.location.hash = `#${url}`;
    else setStatus(notificationMessages.unavailable);
  };
  return <section className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-bold">Notificações</h1><p className="mt-1 text-muted" aria-live="polite">{notifications.unreadCount} {notifications.unreadCount === 1 ? 'notificação não lida' : 'notificações não lidas'}</p></div>
      <button disabled={notifications.busy || notifications.unreadCount === 0} onClick={() => void notifications.markAllRead()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={18} />Marcar todas como lidas</button></header>
    <NotificationFilters category={notifications.category} unreadOnly={notifications.unreadOnly} onChange={(category, unreadOnly) => { notifications.setCategory(category); notifications.setUnreadOnly(Boolean(unreadOnly)); }} />
    {status && <p role="status" aria-live="polite" className="rounded-xl bg-amber-50 p-4 text-amber-900">{status}</p>}
    {notifications.error && <p role="alert" aria-live="assertive" className="rounded-xl bg-rose-50 p-4 text-rose-800">{notificationMessages.loadedError}</p>}
    {notifications.loading && notifications.items.length === 0 && <div aria-live="polite" className="space-y-3"><div className="h-24 animate-pulse rounded-2xl bg-slate-200" /><div className="h-24 animate-pulse rounded-2xl bg-slate-200" /></div>}
    {!notifications.loading && !notifications.error && notifications.items.length === 0 && <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-muted">Você não possui novas notificações.</div>}
    <NotificationList items={notifications.items} busy={notifications.busy} onOpen={(item) => void open(item)} onMarkRead={(id) => void notifications.markRead(id)} />
    {notifications.hasMore && <div className="text-center"><button disabled={notifications.loading || notifications.busy} onClick={() => void notifications.loadMore()} className="rounded-xl border border-slate-300 bg-white px-5 py-2 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:opacity-50">{notifications.loading ? 'Carregando...' : 'Carregar mais'}</button></div>}
  </section>;
}
