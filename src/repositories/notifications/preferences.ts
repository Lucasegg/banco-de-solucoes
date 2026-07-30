import type { NotificationItem, NotificationPreferences } from '../../types/notification';

export function optionalAlertEnabled(item:NotificationItem,p:NotificationPreferences){
  if(item.type.startsWith('contribution.'))return p.contributions;
  if(item.type.startsWith('comment.'))return p.comments;
  if(item.type.startsWith('favorite.'))return p.favorites;
  return true;
}
