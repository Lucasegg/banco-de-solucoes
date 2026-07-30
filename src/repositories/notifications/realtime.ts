import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { NotificationItem } from '../../types/notification';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'polling';
export type RealtimeEvent = { eventType: 'INSERT' | 'UPDATE'; row: Record<string, unknown> };

export function mergeNotifications(current: NotificationItem[], incoming: NotificationItem, limit = Infinity) {
  const previous = current.find((item) => item.id === incoming.id);
  // notification_order never changes. For UPDATE, read_at is monotonic: an old
  // replica event must not turn a notification unread again.
  const merged = previous
    ? { ...previous, ...incoming, readAt: previous.readAt ?? incoming.readAt }
    : incoming;
  return [...current.filter((item) => item.id !== incoming.id), merged]
    .sort((a, b) => (b.notificationOrder ?? 0) - (a.notificationOrder ?? 0))
    .slice(0, limit);
}

export class NotificationRealtimeSubscription {
  private channel: RealtimeChannel | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = true;
  private readonly client: SupabaseClient;
  private readonly userId: string;
  private readonly onEvent: (event: RealtimeEvent) => void;
  private readonly recover: () => void | Promise<void>;
  private readonly onState: (state: ConnectionState) => void;
  private readonly documentRef: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  private readonly pollMs: number;

  constructor(
    client: SupabaseClient, userId: string, onEvent: (event: RealtimeEvent) => void,
    recover: () => void | Promise<void>, onState: (state: ConnectionState) => void,
    documentRef: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> = document,
    pollMs = 60_000,
  ) { this.client=client;this.userId=userId;this.onEvent=onEvent;this.recover=recover;this.onState=onState;this.documentRef=documentRef;this.pollMs=pollMs; }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.onState('connecting');
    this.documentRef.addEventListener('visibilitychange', this.visibilityChanged);
    this.channel = this.client.channel(`notifications:${this.userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${this.userId}`,
      }, (payload) => {
        if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
          this.onEvent({ eventType: payload.eventType, row: payload.new as Record<string, unknown> });
        }
      })
      .subscribe((status) => {
        if (this.stopped) return;
        if (status === 'SUBSCRIBED') {
          this.stopPolling();
          this.onState('connected');
          void this.recover();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.onState('reconnecting');
          this.startPolling();
        }
      });
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.documentRef.removeEventListener('visibilitychange', this.visibilityChanged);
    this.stopPolling();
    if (this.channel) void this.client.removeChannel(this.channel);
    this.channel = null;
  }

  private visibilityChanged = () => {
    if (this.documentRef.visibilityState === 'visible') {
      void this.recover();
      if (this.channel) return;
      this.startPolling();
    } else this.stopPolling();
  };

  private startPolling() {
    if (this.stopped || this.pollTimer || this.documentRef.visibilityState !== 'visible') return;
    this.onState('polling');
    void this.recover();
    this.pollTimer = setInterval(() => void this.recover(), this.pollMs);
  }
  private stopPolling() { if (this.pollTimer) clearInterval(this.pollTimer); this.pollTimer = null; }
}
