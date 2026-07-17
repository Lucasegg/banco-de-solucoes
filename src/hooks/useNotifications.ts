import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { NotificationRepository } from '../repositories/notifications';
import type { NotificationItem, NotificationType } from '../types/notification';

export function useNotifications(pageSize = 20) {
  const { isAuthenticated } = useAuth();
  const mounted = useRef(true); const [items,setItems]=useState<NotificationItem[]>([]); const [unreadCount,setUnreadCount]=useState(0);
  const [type,setType]=useState<NotificationType|undefined>(undefined); const [unreadOnly,setUnreadOnly]=useState(false); const [loading,setLoading]=useState(false);
  const [error,setError]=useState(''); const [hasMore,setHasMore]=useState(false); const [busy,setBusy]=useState(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const load=useCallback(async(append=false)=>{if(!isAuthenticated||!NotificationRepository)return; setLoading(true);setError('');
    const offset=append?items.length:0; const [listed,counted]=await Promise.all([NotificationRepository.list({type,unreadOnly,limit:pageSize,offset}),NotificationRepository.getUnreadCount()]);
    if(!mounted.current)return; if(listed.ok){setItems(current=>append?[...current,...listed.data.items]:listed.data.items);setHasMore(listed.data.hasMore);}else setError(listed.message);
    if(counted.ok)setUnreadCount(counted.data);else if(listed.ok)setError(counted.message);setLoading(false);
  },[isAuthenticated,items.length,pageSize,type,unreadOnly]);
  useEffect(()=>{void load(false);},[type,unreadOnly,isAuthenticated]); // load intentionally changes with result length
  const markRead=useCallback(async(id:string)=>{if(!NotificationRepository||busy)return false;setBusy(true);const result=await NotificationRepository.markRead(id);if(mounted.current){setBusy(false);if(result.ok){setItems(current=>current.map(item=>item.id===id&&item.readAt===null?{...item,readAt:new Date().toISOString()}:item));setUnreadCount(current=>Math.max(0,current-1));}else setError(result.message);}return result.ok;},[busy]);
  const markAllRead=useCallback(async()=>{if(!NotificationRepository||busy)return;setBusy(true);const result=await NotificationRepository.markAllRead();if(!mounted.current)return;setBusy(false);if(result.ok){const now=new Date().toISOString();setItems(current=>current.map(item=>item.readAt?item:{...item,readAt:now}));setUnreadCount(0);}else setError(result.message);},[busy]);
  return {items,unreadCount,type,setType,unreadOnly,setUnreadOnly,loading,error,hasMore,busy,reload:()=>load(false),loadMore:()=>load(true),markRead,markAllRead};
}
