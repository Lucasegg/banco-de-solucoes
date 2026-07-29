import { Bell, Heart, MessageCircle, ShieldCheck } from 'lucide-react';
import type { NotificationCategory, NotificationType } from '../types/notification';
import type { TranslationKey } from '../i18n/resources';
export { safeNotificationActionUrl } from './navigation';

export const notificationCategories: { value: NotificationCategory | 'unread' | ''; label: TranslationKey }[] = [
  { value: '', label: 'notifications.all' }, { value: 'unread', label: 'notifications.unreadPlural' },
  { value: 'contributions', label: 'notifications.contributions' }, { value: 'comments', label: 'notifications.comments' },
  { value: 'favorites', label: 'notifications.favorites' }, { value: 'account', label: 'notifications.account' },
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
