import { notificationIcon, safeNotificationActionUrl } from '../../notifications/presentation';
import type { NotificationItem as Notification } from '../../types/notification';
import { formatNotificationDate } from '../../utils/formatNotificationDate';

export function NotificationItem({ item, busy, onOpen, onMarkRead }: { item: Notification; busy: boolean; onOpen: (item: Notification) => void; onMarkRead: (id: string) => void }) {
  const Icon = notificationIcon(item.type); const destination = safeNotificationActionUrl(item.actionUrl);
  return <article className={`flex gap-4 rounded-2xl border p-4 shadow-sm ${item.readAt ? 'bg-white' : 'border-sky-200 bg-sky-50'}`}>
    <span className="rounded-full bg-slate-100 p-2 text-slate-700"><Icon size={20} aria-hidden="true" /></span>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{item.title}</h2><time className="text-xs text-slate-500">{formatNotificationDate(item.createdAt)}</time></div>
      <p className="mt-1 text-sm text-slate-700">{item.message}</p>
      {!item.readAt && <span className="mt-2 inline-block text-xs font-semibold text-sky-800">Não lida</span>}
      <div className="mt-3 flex gap-3"><button disabled={busy} onClick={() => onOpen(item)} className="text-sm font-semibold text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600">{destination ? 'Abrir conteúdo' : 'Ver detalhes'}</button>
      {!item.readAt && <button disabled={busy} onClick={() => onMarkRead(item.id)} className="text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600">Marcar como lida</button>}</div></div>
  </article>;
}
