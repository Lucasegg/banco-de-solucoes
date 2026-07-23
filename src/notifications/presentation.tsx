import { Bell, Heart, MessageCircle, ShieldCheck } from 'lucide-react';
import type { NotificationCategory, NotificationType } from '../types/notification';

export const notificationCategories: { value: NotificationCategory | 'unread' | ''; label: string }[] = [
  { value: '', label: 'Todas' }, { value: 'unread', label: 'Não lidas' },
  { value: 'contributions', label: 'Contribuições' }, { value: 'comments', label: 'Comentários' },
  { value: 'favorites', label: 'Favoritos' }, { value: 'account', label: 'Conta' },
];

export function notificationCategory(type: NotificationType): NotificationCategory {
  if (type.startsWith('contribution.')) return 'contributions';
  if (type.startsWith('comment.')) return 'comments';
  if (type.startsWith('favorite.')) return 'favorites';
  return 'account';
}

export function notificationIcon(type: NotificationType): any {
  const category = notificationCategory(type);
  return category === 'comments' ? MessageCircle : category === 'favorites' ? Heart : category === 'account' ? ShieldCheck : Bell;
}

export const notificationMessages = {
  unavailable: 'Este conteúdo não está mais disponível.',
  loadedError: 'Não foi possível carregar suas notificações.',
  allRead: 'Todas as notificações foram marcadas como lidas.',
};

/** Accept only known, non-administrative hash routes. */
export function safeNotificationActionUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 500 || /[\\\x00-\x1f\x7f?#]/.test(value)) return null;
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  return value === '/profile' || new RegExp(`^/(?:problems|solutions|contributions)/${uuid}$`, 'i').test(value) ? value : null;
}
