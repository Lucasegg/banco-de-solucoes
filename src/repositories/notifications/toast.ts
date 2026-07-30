import type { NotificationItem, NotificationPreferences } from '../../types/notification';
import type { NotificationSignal } from './realtime.ts';
import { optionalAlertEnabled } from './preferences.ts';

export function notificationToastForSignal(signal: NotificationSignal | undefined, items: NotificationItem[], preferences: NotificationPreferences, alerted: Set<string>) {
  if (!signal || signal.change_type !== 'INSERT' || alerted.has(signal.notification_id)) return null;
  const item = items.find((candidate) => candidate.id === signal.notification_id);
  if (!item || !optionalAlertEnabled(item, preferences)) return null;
  alerted.add(item.id);
  return item;
}

/** Stateful queue used by the provider and directly exercised by behavioral tests. */
export class NotificationAlertQueue {
  private queue: NotificationItem[] = [];
  private readonly alerted = new Set<string>();
  process(signal: NotificationSignal | undefined, items: NotificationItem[], preferences: NotificationPreferences) {
    const item = notificationToastForSignal(signal,items,preferences,this.alerted);
    if (item && !this.queue.some((current) => current.id === item.id)) this.queue = [...this.queue,item];
    return this.items;
  }
  dismiss() { this.queue=this.queue.slice(1);return this.items; }
  reset() { this.queue=[];this.alerted.clear();return this.items; }
  get items() { return [...this.queue]; }
 }

 export class NotificationToastTimer {
   private timer: ReturnType<typeof setTimeout> | null = null;
   private readonly close: () => void; private readonly delay: number; private readonly schedule: typeof setTimeout; private readonly cancel: typeof clearTimeout;
   constructor(close: () => void, delay = 6_000, schedule = setTimeout, cancel = clearTimeout) { this.close=close;this.delay=delay;this.schedule=schedule;this.cancel=cancel; }
   start() { if (!this.timer) this.timer = this.schedule(this.close, this.delay); }
   stop() { if (this.timer) this.cancel(this.timer); this.timer = null; }
 }
