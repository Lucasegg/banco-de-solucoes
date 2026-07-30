import { useState } from 'react';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { useTranslation } from '../../i18n/I18nProvider';

export function NotificationPreferences({userId}:{userId?:string}) {
  const {t}=useTranslation(); const state=useNotificationPreferences(userId); const [confirm,setConfirm]=useState(false); const [status,setStatus]=useState('');
  if(state.loading)return <p>{t('notifications.preferencesLoading')}</p>;
  const toggle=async(key:'contributions'|'comments'|'favorites')=>{const ok=await state.save({...state.preferences,[key]:!state.preferences[key]});setStatus(ok?t('notifications.preferencesSaved'):'');};
  return <section className="rounded-[2rem] border border-line bg-white p-6 shadow-soft" aria-labelledby="notification-preferences-title">
    <h2 id="notification-preferences-title" className="text-2xl font-semibold">{t('notifications.preferencesTitle')}</h2><p className="mt-2 text-muted">{t('notifications.preferencesDescription')}</p>
    <fieldset disabled={state.busy} className="mt-5 space-y-3"><legend className="sr-only">{t('notifications.preferencesTitle')}</legend>{(['contributions','comments','favorites'] as const).map(key=><label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border p-3"><span>{t(`notifications.${key}`)}</span><input type="checkbox" checked={state.preferences[key]} onChange={()=>void toggle(key)} className="h-5 w-5 focus-visible:ring-2 focus-visible:ring-sky-600" /></label>)}</fieldset>
    <p className="mt-3 text-sm text-muted">{t('notifications.criticalAlwaysOn')}</p><div aria-live="polite" className="mt-3 text-sm">{(status||state.message)&&<p>{status||t('notifications.preferencesError')}</p>}</div>
    <div className="mt-6 border-t pt-5"><h3 className="font-semibold">{t('notifications.cleanupTitle')}</h3><p className="mt-1 text-sm text-muted">{t('notifications.cleanupDescription')}</p>{!confirm?<button onClick={()=>setConfirm(true)} className="mt-3 rounded-full border px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-sky-600">{t('notifications.cleanupAction')}</button>:<div className="mt-3 rounded-xl bg-amber-50 p-4"><p>{t('notifications.cleanupConfirm')}</p><div className="mt-3 flex gap-2"><button onClick={()=>setConfirm(false)} className="rounded-full border px-4 py-2">{t('common.cancel')}</button><button disabled={state.busy} onClick={async()=>{const count=await state.cleanup();if(count!==null){setStatus(t('notifications.cleanupDone',{count}));setConfirm(false);}}} className="rounded-full bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{t('common.confirm')}</button></div></div>}</div>
  </section>;
}
