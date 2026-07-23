import type { NotificationItem as Notification } from '../../types/notification';
import { NotificationItem } from './NotificationItem';
export function NotificationList({ items, busy, onOpen, onMarkRead }: { items: Notification[]; busy: boolean; onOpen: (item: Notification) => void; onMarkRead: (id: string) => void }) { return <ul className="space-y-3">{items.map((item) => <li key={item.id}><NotificationItem item={item} busy={busy} onOpen={onOpen} onMarkRead={onMarkRead} /></li>)}</ul>; }
