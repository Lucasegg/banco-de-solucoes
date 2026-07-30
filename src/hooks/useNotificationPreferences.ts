import {useCallback,useEffect,useRef,useState} from 'react';
import {NotificationRepository} from '../repositories/notifications';
import type {NotificationPreferences} from '../types/notification';
const defaults:NotificationPreferences={contributions:true,comments:true,favorites:true,updatedAt:''};
export function useNotificationPreferences(userId?:string){
 const [preferences,setPreferences]=useState(defaults);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const generation=useRef(0);const active=useRef(userId);active.current=userId;
 const load=useCallback(async()=>{const account=userId;const token=++generation.current;if(!account||!NotificationRepository){setPreferences(defaults);setLoading(false);return;}setLoading(true);const result=await NotificationRepository.getPreferences();if(active.current!==account||token!==generation.current)return;if(result.ok)setPreferences(result.data);else setMessage(result.message);setLoading(false);},[userId]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 const save=async(next:NotificationPreferences)=>{const account=userId;if(!account||!NotificationRepository)return false;const token=++generation.current;setBusy(true);setMessage('');const result=await NotificationRepository.updatePreferences(next);if(active.current!==account||token!==generation.current)return false;setBusy(false);if(result.ok){setPreferences(next);window.dispatchEvent(new CustomEvent('notification-preferences-changed',{detail:next}));return true;}setMessage(result.message);return false;};
 const cleanup=async()=>{const account=userId;if(!account||!NotificationRepository)return null;const token=++generation.current;setBusy(true);setMessage('');const result=await NotificationRepository.cleanupRead();if(active.current!==account||token!==generation.current)return null;setBusy(false);if(result.ok)return result.data;setMessage(result.message);return null;};
 return{preferences,loading,busy,message,save,cleanup};
}
