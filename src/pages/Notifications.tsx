import { Bell, CheckCircle2, Heart, MessageCircle, ShieldCheck } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationType } from '../types/notification';
import { formatNotificationDate } from '../utils/formatNotificationDate';

const options: { value: '' | NotificationType; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'contribution.approved', label: 'Contribuições aprovadas' },
  { value: 'contribution.rejected', label: 'Contribuições rejeitadas' },
  { value: 'comment.created', label: 'Comentários' },
  { value: 'comment.replied', label: 'Respostas' },
  { value: 'comment.reacted', label: 'Reações' },
  { value: 'favorite.content_updated', label: 'Favoritos atualizados' },
  { value: 'user.role_changed', label: 'Alterações de papel' },
];

function TypeIcon({ type }: { type: NotificationType }) {
  if (type.startsWith('comment.')) return <MessageCircle size={20} />;
  if (type === 'favorite.content_updated') return <Heart size={20} />;
  if (type === 'user.role_changed') return <ShieldCheck size={20} />;
  return <Bell size={20} />;
}

export function Notifications() {
  const notifications = useNotifications();

  const open = async (id: string, readAt: string | null, url: string | null) => {
    if (!readAt) await notifications.markRead(id);
    if (url) window.location.hash = `#${url}`;
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="mt-1 text-muted" aria-live="polite">
            {notifications.unreadCount}{' '}
            {notifications.unreadCount === 1 ? 'notificação não lida' : 'notificações não lidas'}
          </p>
        </div>
        <button
          disabled={notifications.busy || notifications.unreadCount === 0}
          onClick={() => void notifications.markAllRead()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 size={18} />
          Marcar todas como lidas
        </button>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center">
        <label className="text-sm font-semibold">
          Tipo
          <select
            value={notifications.type ?? ''}
            onChange={(event: { target: { value: string } }) => notifications.setType(
              (event.target.value || undefined) as NotificationType | undefined,
            )}
            className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={notifications.unreadOnly}
            onChange={(event: { target: { checked: boolean } }) => notifications.setUnreadOnly(event.target.checked)}
            className="h-4 w-4 accent-sky-700"
          />
          Somente não lidas
        </label>
      </div>

      {notifications.error && (
        <p role="alert" aria-live="assertive" className="rounded-xl bg-rose-50 p-4 text-rose-800">
          {notifications.error}
        </p>
      )}
      {notifications.loading && notifications.items.length === 0 && (
        <p aria-live="polite" className="text-muted">Carregando notificações...</p>
      )}
      {!notifications.loading && !notifications.error && notifications.items.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-muted">
          {notifications.unreadOnly
            ? 'Não há notificações não lidas.'
            : 'Você ainda não possui notificações.'}
        </div>
      )}

      <ul className="space-y-3">
        {notifications.items.map((item) => (
          <li key={item.id}>
            <button
              disabled={notifications.busy}
              onClick={() => void open(item.id, item.readAt, item.actionUrl)}
              className={`flex w-full gap-4 rounded-2xl border p-4 text-left shadow-sm transition hover:border-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:opacity-60 ${item.readAt ? 'bg-white' : 'border-sky-200 bg-sky-50'}`}
            >
              <span className={`rounded-full p-2 ${item.readAt ? 'bg-slate-100 text-slate-600' : 'bg-sky-100 text-sky-800'}`}>
                <TypeIcon type={item.type} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{item.title}</strong>
                  <time className="text-xs text-slate-500">{formatNotificationDate(item.createdAt)}</time>
                </span>
                <span className="mt-1 block text-sm text-slate-700">{item.message}</span>
                {item.actorId && <span className="mt-2 block text-xs text-muted">Por {item.actorName}</span>}
                <span className="mt-2 block text-xs font-semibold text-sky-700">
                  {item.actionUrl ? 'Ver conteúdo relacionado' : 'Marcar como lida'}
                </span>
              </span>
              {!item.readAt && (
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-600" aria-label="Não lida" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {notifications.hasMore && (
        <div className="text-center">
          <button
            disabled={notifications.loading || notifications.busy}
            onClick={() => void notifications.loadMore()}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:opacity-50"
          >
            {notifications.loading ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}
    </section>
  );
}
