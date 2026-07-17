import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotificationsContext } from '../context/NotificationsContext';
import { useAuth } from './useAuth';
import { NotificationRepository } from '../repositories/notifications';
import type { NotificationItem, NotificationType } from '../types/notification';

export function useNotifications(pageSize = 20) {
  const { isAuthenticated, user } = useAuth();
  const global = useNotificationsContext();
  const mounted = useRef(true);
  const requestId = useRef(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [type, setType] = useState<NotificationType | undefined>(undefined);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (append = false) => {
    if (!isAuthenticated || !user || !NotificationRepository) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    const result = await NotificationRepository.list({
      type,
      unreadOnly,
      limit: pageSize,
      offset: append ? items.length : 0,
    });
    if (!mounted.current || currentRequest !== requestId.current) return;
    if (result.ok) {
      setItems((current) => append ? [...current, ...result.data.items] : result.data.items);
      setHasMore(result.data.hasMore);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, [isAuthenticated, items.length, pageSize, type, unreadOnly, user]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  useEffect(() => {
    requestId.current += 1;
    setItems([]);
    setHasMore(false);
    if (!isAuthenticated || !user) {
      setLoading(false);
      setError('');
      return;
    }
    void load(false);
  }, [isAuthenticated, type, unreadOnly, user?.id]);

  useEffect(() => {
    setItems((current) => current.map((item) => {
      const readAt = global.allReadAt ?? global.readAtById[item.id];
      return !item.readAt && readAt ? { ...item, readAt } : item;
    }));
  }, [global.allReadAt, global.readAtById]);

  const markRead = useCallback(async (notificationId: string) => {
    const success = await global.markRead(notificationId);
    if (success && mounted.current) {
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => (
        item.id === notificationId && !item.readAt ? { ...item, readAt } : item
      )));
    }
    return success;
  }, [global.markRead]);

  const markAllRead = useCallback(async () => {
    const success = await global.markAllRead();
    if (success && mounted.current) {
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
    }
    return success;
  }, [global.markAllRead]);

  return {
    items,
    unreadCount: global.unreadCount,
    type,
    setType,
    unreadOnly,
    setUnreadOnly,
    loading,
    error: error || global.error,
    hasMore,
    busy: global.busy,
    reload: () => load(false),
    loadMore: () => load(true),
    markRead,
    markAllRead,
  };
}
