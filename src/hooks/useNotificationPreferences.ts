import { useCallback, useEffect, useState } from 'react';
import { NotificationRepository } from '../repositories/notifications';
import type { NotificationPreferences } from '../types/notification';

const defaults: NotificationPreferences = { contributions: true, comments: true, favorites: true, updatedAt: '' };
export function useNotificationPreferences(userId?: string) {
  const [preferences,setPreferences]=useState(defaults); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const load=useCallback(async()=>{ if(!userId||!NotificationRepository){setLoading(false);return;} setLoading(true); const result=await NotificationRepository.getPreferences(); if(result.ok)setPreferences(result.data); else setMessage(result.message); setLoading(false);},[userId]);
  useEffect(()=>{void load();},[load]);
  const save=async(next: NotificationPreferences)=>{if(!NotificationRepository)return false;setBusy(true);setMessage('');const result=await NotificationRepository.updatePreferences(next);setBusy(false);if(result.ok){setPreferences(next);return true;}setMessage(result.message);return false;};
  const cleanup=async()=>{if(!NotificationRepository)return null;setBusy(true);setMessage('');const result=await NotificationRepository.cleanupRead();setBusy(false);if(result.ok)return result.data;setMessage(result.message);return null;};
  return {preferences,loading,busy,message,save,cleanup};
}
