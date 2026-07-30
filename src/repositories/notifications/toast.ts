import type { NotificationItem } from '../../types/notification';
import type { NotificationPreferences } from '../../types/notification';
import type { NotificationSignal } from './realtime.ts';
import { optionalAlertEnabled } from './preferences.ts';

export function enqueueNotificationToast(queue: NotificationItem[], item: NotificationItem) {
  return queue.some((current) => current.id === item.id) ? queue : [...queue, item];
}

export function notificationToastForSignal(signal: NotificationSignal | undefined, items: NotificationItem[], preferences: NotificationPreferences, alerted: Set<string>) {
  if (!signal || signal.change_type !== 'INSERT' || alerted.has(signal.notification_id)) return null;
  const item = items.find((candidate) => candidate.id === signal.notification_id);
  if (!item || !optionalAlertEnabled(item, preferences)) return null;
  alerted.add(item.id);
  return item;
}

export class NotificationToastTimer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly close: () => void; private readonly delay: number; private readonly schedule: typeof setTimeout; private readonly cancel: typeof clearTimeout;
  constructor(close: () => void, delay = 6_000, schedule = setTimeout, cancel = clearTimeout) { this.close=close;this.delay=delay;this.schedule=schedule;this.cancel=cancel; }
  start() { if (!this.timer) this.timer = this.schedule(this.close, this.delay); }
  stop() { if (this.timer) this.cancel(this.timer); this.timer = null; }
}
