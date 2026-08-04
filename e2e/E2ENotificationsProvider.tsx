import { useMemo, type ReactNode } from 'react';
import { NotificationsContext, type NotificationsContextValue } from '../src/context/NotificationsContext';

/** Deterministic notification contract for browser tests: no repository, timers or Realtime. */
export function E2ENotificationsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<NotificationsContextValue>(() => ({
    recentItems: [], unreadCount: 0, loading: false, busy: false, error: '',
    readAtById: {}, allReadAt: null, connectionState: 'connected', revision: 0,
    announcement: '', reload: async () => undefined,
    markRead: async () => true, markAllRead: async () => true,
  }), []);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
