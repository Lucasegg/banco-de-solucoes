import { useEffect,useRef,useState,type ReactNode } from 'react';
import { Award,Globe2,MapPin,UsersRound } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import { formatCivilDateUtc,formatDateTime,formatNumber } from '../i18n/format';
import { publicProfileRepository } from '../repositories/publicProfiles';
import { publicActivityPage, type PublicProfilePayload } from '../repositories/publicProfiles/publicProfileCore';

type State={kind:'loading'}|{kind:'error'}|{kind:'ready';data:PublicProfilePayload};
export function PublicProfile({username,onNavigate}:{username:string;onNavigate:(page:string)=>void}) {
 const {locale,t}=useTranslation(); const [state,setState]=useState<State>({kind:'loading'}); const request=useRef(0); const [retry,setRetry]=useState(0);
 useEffect(()=>{const current=++request.current;const controller=new AbortController();setState({kind:'loading'});
  if(!publicProfileRepository){setState({kind:'error'});return()=>controller.abort();}
  publicProfileRepository.getByUsername(username,controller.signal).then(data=>{if(current===request.current)setState({kind:'ready',data});}).catch(error=>{if(current===request.current&&error?.name!=='AbortError')setState({kind:'error'});});
  return()=>controller.abort();},[username,retry]);
 if(state.kind==='loading')return <section aria-live="polite" aria-busy="true" className="rounded-3xl bg-white p-8 text-muted">{t('publicProfile.loading')}</section>;
 if(state.kind==='error')return <StateCard text={t('publicProfile.error')}><button className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={()=>setRetry(v=>v+1)}>{t('publicProfile.retry')}</button></StateCard>;
 if(state.data.status!=='public')return <StateCard text={t(state.data.status==='private'?'publicProfile.private':'publicProfile.notFound')}/>;
 const p=state.data.profile; const location=[p.city,p.state,p.country].filter(Boolean).join(', ');
 const metrics=[['reputation',p.metrics.reputation],['comments',p.metrics.comments],['discussions',p.metrics.discussions],['reactions',p.metrics.reactionsReceived],['bestAnswers',p.metrics.bestAnswers],['problems',p.metrics.problems],['solutions',p.metrics.solutions],['contributions',p.metrics.approvedContributions]] as const;
 return <article className="space-y-6 overflow-x-hidden">
  <header className="grid gap-5 rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:grid-cols-[auto_1fr] sm:items-center">
   {p.avatarUrl?<img src={p.avatarUrl} alt={p.displayName} className="h-28 w-28 rounded-3xl object-cover"/>:<span role="img" aria-label={t('publicProfile.noAvatar')} className="grid h-28 w-28 place-items-center rounded-3xl bg-slate-100"><UsersRound size={44}/></span>}
   <div className="min-w-0"><h1 className="break-words text-3xl font-semibold">{p.displayName}</h1><p className="text-muted">@{p.username}{p.organization?` · ${p.organization}`:''}</p>{location&&<p className="mt-2 inline-flex items-center gap-2 text-sm text-muted"><MapPin size={16}/><span>{location}</span></p>}<p className="mt-2 text-sm text-muted">{t('publicProfile.memberSince',{date:formatCivilDateUtc(p.joinedAt,locale)})}</p></div>
  </header>
  <div className="grid gap-6 lg:grid-cols-[1fr_320px]"><main className="space-y-6">
   <section className="rounded-[2rem] border border-line bg-white p-6"><h2 className="text-2xl font-semibold">{t('publicProfile.portfolio')}</h2><dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{metrics.filter(([,value])=>value>0).map(([key,value])=><div key={key} className="rounded-2xl bg-slate-50 p-4"><dt className="text-sm text-muted">{t(`publicProfile.${key}`)}</dt><dd className="mt-1 text-2xl font-semibold">{formatNumber(value,locale)}</dd></div>)}</dl>{metrics.every(([,v])=>v===0)&&<p className="mt-4 text-muted">{t('publicProfile.empty')}</p>}</section>
   <section className="rounded-[2rem] border border-line bg-white p-6"><h2 className="text-2xl font-semibold">{t('publicProfile.activity')}</h2><div className="mt-4 space-y-3">{p.activity.map(item=><button type="button" key={`${item.kind}:${item.id}`} onClick={()=>onNavigate(publicActivityPage(item))} className="block w-full rounded-2xl bg-slate-50 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><span className="text-xs font-semibold uppercase text-teal-700">{t(`publicProfile.activity.${item.kind}`)} · {formatDateTime(item.occurred_at,locale)}</span><span className="mt-1 block break-words">{item.title}</span></button>)}{p.activity.length===0&&<p className="text-muted">{t('publicProfile.empty')}</p>}</div></section>
  </main><aside className="space-y-6"><section className="rounded-[2rem] border border-line bg-white p-6"><h2 className="text-2xl font-semibold">{t('publicProfile.about')}</h2>{p.bio&&<p className="mt-4 whitespace-pre-line leading-7 text-muted">{p.bio}</p>}{p.website&&<a href={p.website} target="_blank" rel="noopener noreferrer" aria-label={t('publicProfile.website',{name:p.displayName})} className="mt-4 inline-flex max-w-full items-center gap-2 break-all font-semibold text-teal-700 focus-visible:outline"><Globe2 size={16}/>{new URL(p.website).hostname}</a>}</section>
   {p.achievements.length>0&&<section className="rounded-[2rem] border border-line bg-white p-6"><h2 className="flex items-center gap-2 text-2xl font-semibold"><Award size={22}/>{t('publicProfile.achievements')}</h2><ul className="mt-4 space-y-3">{p.achievements.map(a=><li key={a.key} className="rounded-2xl bg-teal-50 p-3"><strong>{t(`reputation.achievement.${a.key}.title`)}</strong><p className="text-sm text-muted">{t(`reputation.achievement.${a.key}.description`)}</p></li>)}</ul></section>}
  </aside></div>
 </article>;
}
function StateCard({text,children}:{text:string;children?:ReactNode}){return <section aria-live="polite" className="grid justify-items-start gap-4 rounded-3xl border border-line bg-white p-8"><h1 className="text-2xl font-semibold">{text}</h1>{children}</section>}
