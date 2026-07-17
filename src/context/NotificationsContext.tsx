import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import { NotificationRepository } from '../repositories/notifications';
import type { NotificationItem } from '../types/notification';

interface NotificationsContextValue {
  recentItems: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  busy: boolean;
  error: string;
  readAtById: Record<string, string>;
  allReadAt: string | null;
  reload: () => Promise<void>;
  markRead: (notificationId: string) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const userId = isAuthenticated ? user?.id ?? null : null;
  const mounted = useRef(true);
  const requestId = useRef(0);
  const busyRef = useRef(false);
  const activeUserId = useRef<string | null>(userId);
  activeUserId.current = userId;
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [recentItems, setRecentItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [readAtById, setReadAtById] = useState<Record<string, string>>({});
  const [allReadAt, setAllReadAt] = useState<string | null>(null);

  const setEmptyState = useCallback((stateUserId: string | null) => {
    setLoadedUserId(stateUserId);
    setRecentItems([]);
    setUnreadCount(0);
    setLoading(false);
    setBusy(false);
    busyRef.current = false;
    setError('');
    setReadAtById({});
    setAllReadAt(null);
  }, []);

  const clearState = useCallback(() => {
    setEmptyState(null);
  }, [setEmptyState]);

  const reload = useCallback(async () => {
    const requestedUserId = userId;
    if (!requestedUserId) {
      if (mounted.current) clearState();
      return;
    }
    if (!NotificationRepository) {
      if (mounted.current) setEmptyState(requestedUserId);
      return;
    }

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    const [listed, counted] = await Promise.all([
      NotificationRepository.list({ limit: 5 }),
      NotificationRepository.getUnreadCount(),
    ]);

    if (!mounted.current || currentRequest !== requestId.current) return;
    if (listed.ok) setRecentItems(listed.data.items);
    else setError(listed.message);
    if (counted.ok) setUnreadCount(counted.data);
    else if (listed.ok) setError(counted.message);
    setLoadedUserId(requestedUserId);
    setLoading(false);
  }, [clearState, setEmptyState, userId]);

  useEffect(() => {
    mounted.current = true;
    requestId.current += 1;
    clearState();
    void reload();
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [clearState, reload, userId]);

  const markRead = useCallback(async (notificationId: string) => {
    if (!userId || !NotificationRepository || busyRef.current) return false;
    const operationUserId = userId;
    busyRef.current = true;
    setBusy(true);
    setError('');
    const result = await NotificationRepository.markRead(notificationId);
    if (!mounted.current || activeUserId.current !== operationUserId) return false;
    busyRef.current = false;
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }

    const readAt = new Date().toISOString();
    setReadAtById((current) => ({ ...current, [notificationId]: readAt }));
    setRecentItems((current) => current.map((item) => (
      item.id === notificationId && !item.readAt ? { ...item, readAt } : item
    )));
    setUnreadCount((current) => Math.max(0, current - 1));
    return true;
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId || !NotificationRepository || busyRef.current) return false;
    const operationUserId = userId;
    busyRef.current = true;
    setBusy(true);
    setError('');
    const result = await NotificationRepository.markAllRead();
    if (!mounted.current || activeUserId.current !== operationUserId) return false;
    busyRef.current = false;
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }

    const readAt = new Date().toISOString();
    setAllReadAt(readAt);
    setRecentItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
    setUnreadCount(0);
    return true;
  }, [userId]);

  const belongsToCurrentUser = loadedUserId === userId && userId !== null;
  const value = useMemo<NotificationsContextValue>(() => ({
    recentItems: belongsToCurrentUser ? recentItems : [],
    unreadCount: belongsToCurrentUser ? unreadCount : 0,
    loading: belongsToCurrentUser ? loading : Boolean(userId),
    busy,
    error: belongsToCurrentUser ? error : '',
    readAtById: belongsToCurrentUser ? readAtById : {},
    allReadAt: belongsToCurrentUser ? allReadAt : null,
    reload,
    markRead,
    markAllRead,
  }), [allReadAt, belongsToCurrentUser, busy, error, loadedUserId, loading, markAllRead, markRead, readAtById, recentItems, reload, unreadCount, userId]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext) as NotificationsContextValue | undefined;
  if (!context) throw new Error('useNotificationsContext deve ser usado dentro de NotificationsProvider.');
  return context;
}
