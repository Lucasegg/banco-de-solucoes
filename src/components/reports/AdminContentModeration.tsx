import { useCallback,useEffect,useRef,useState } from 'react';
import { AdminModerationRepository,type ContentModerationAction,type ContentTarget,type ModerationHistoryItem } from '../../repositories/adminModeration';
import { useTranslation } from '../../i18n/I18nProvider';
import { canSubmitModeration,moderationActionForStatus } from './adminModerationState';

export function AdminContentModeration({targetType,targetId,reportId,title,onChanged}:{targetType:ContentTarget;targetId:string;reportId:string;title:string;onChanged:()=>void}) {
  const {t}=useTranslation();
  const [history,setHistory]=useState<ModerationHistoryItem[]>([]);
  const [currentStatus,setCurrentStatus]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [message,setMessage]=useState('');
  const [action,setAction]=useState<ContentModerationAction>('archive');
  const [reason,setReason]=useState('');
  const [note,setNote]=useState('');
  const dialog=useRef<HTMLDialogElement|null>(null);
  const reasonInput=useRef<HTMLTextAreaElement|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try {
      if (!AdminModerationRepository) { setMessage(t('reports.unavailable'));setCurrentStatus(null);setHistory([]);return; }
      const [stateResult,historyResult]=await Promise.all([
        AdminModerationRepository.state(targetType,targetId),
        AdminModerationRepository.history(targetType,targetId),
      ]);
      if (!stateResult.ok) { setMessage(stateResult.message);setCurrentStatus(null); }
      else setCurrentStatus(stateResult.data.currentStatus);
      if (!historyResult.ok) { setMessage(historyResult.message);setHistory([]); }
      else setHistory(historyResult.data);
      if (stateResult.ok&&historyResult.ok) setMessage('');
    } catch { setMessage(t('reports.unavailable'));setCurrentStatus(null);setHistory([]); }
    finally { setLoading(false); }
  },[targetId,targetType,t]);
  useEffect(()=>{void load()},[load]);

  const open=(next:ContentModerationAction)=>{setAction(next);setReason('');setNote('');dialog.current?.showModal();requestAnimationFrame(()=>reasonInput.current?.focus())};
  const submit=async(e:{preventDefault:()=>void})=>{
    e.preventDefault();
    if(!canSubmitModeration(reason,submitting)||!AdminModerationRepository)return;
    setSubmitting(true);
    try {
      const result=await AdminModerationRepository.moderate(targetType,targetId,action,reason,note,reportId);
      if(result.ok){dialog.current?.close();setMessage(t('reports.moderation.success'));await load();onChanged()}
      else setMessage(result.message);
    } catch { setMessage(t('reports.unavailable')); }
    finally { setSubmitting(false); }
  };
  const nextAction=currentStatus?moderationActionForStatus(targetType,currentStatus):null;

  return <div className="mt-4 border-t pt-4">
    <dl className="grid gap-1 text-sm">
      <div><dt className="inline font-semibold">{t('reports.moderation.type')}: </dt><dd className="inline">{t(`reports.${targetType}` as 'reports.problem')}</dd></div>
      <div><dt className="inline font-semibold">{t('reports.moderation.title')}: </dt><dd className="inline">{title}</dd></div>
      <div><dt className="inline font-semibold">{t('reports.moderation.status')}: </dt><dd className="inline">{currentStatus??t('reports.moderation.unavailableStatus')}</dd></div>
    </dl>
    <div className="mt-3">{nextAction&&<button disabled={loading} onClick={()=>open(nextAction)} className={nextAction==='restore'?"rounded-full bg-blue-700 px-4 py-2 text-white":"rounded-full bg-red-700 px-4 py-2 text-white"}>{t(`reports.moderation.${nextAction}` as 'reports.moderation.archive')}</button>}</div>
    {message&&<p className="mt-2" aria-live="polite">{message}</p>}
    <section className="mt-4" aria-labelledby={`history-${reportId}`}><h3 id={`history-${reportId}`} className="font-semibold">{t('reports.moderation.history')}</h3>{loading?<p>{t('reports.loading')}</p>:history.length===0?<p>{t('reports.moderation.noHistory')}</p>:<ol className="mt-2 space-y-2">{history.map(item=><li key={item.id} className="rounded-lg bg-slate-50 p-2 text-sm"><strong>{t(`reports.moderation.${item.action}` as 'reports.moderation.archive')}</strong> — {item.previousStatus} → {item.resultingStatus}<br/>{item.reason}{item.moderatorNote&&<><br/>{item.moderatorNote}</>}<br/><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></li>)}</ol>}</section>
    <dialog ref={dialog} onClose={()=>setSubmitting(false)} className="w-full max-w-lg rounded-2xl p-6 backdrop:bg-black/50"><form onSubmit={submit}><h2 className="text-xl font-semibold">{t(`reports.moderation.confirm.${action}` as 'reports.moderation.confirm.archive')}</h2><p className="mt-2">{t(`reports.moderation.impact.${action}` as 'reports.moderation.impact.archive')}</p><label className="mt-4 block font-semibold" htmlFor={`reason-${reportId}`}>{t('reports.moderation.reason')}</label><textarea ref={reasonInput} id={`reason-${reportId}`} required maxLength={500} value={reason} onChange={(e:{target:{value:string}})=>setReason(e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border p-3"/><label className="mt-3 block font-semibold" htmlFor={`admin-note-${reportId}`}>{t('reports.moderation.optionalNote')}</label><textarea id={`admin-note-${reportId}`} maxLength={2000} value={note} onChange={(e:{target:{value:string}})=>setNote(e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border p-3"/><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={submitting} onClick={()=>dialog.current?.close()} className="rounded-full border px-4 py-2">{t('reports.moderation.cancel')}</button><button disabled={!canSubmitModeration(reason,submitting)} className="rounded-full bg-red-700 px-4 py-2 text-white">{submitting?t('reports.moderation.submitting'):t('reports.moderation.confirm')}</button></div></form></dialog>
  </div>;
}
