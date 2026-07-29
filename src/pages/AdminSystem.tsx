import { useEffect, useState } from 'react';
import { supabaseClient } from '../integrations/supabase/client';
import { checkDatabaseHealth, EXPECTED_SCHEMA_VERSION, type SystemHealth } from '../services/systemHealth';
import { useTranslation } from '../i18n/I18nProvider';
import { formatDateTime, formatNumber } from '../i18n/format';

export function AdminSystem() {
  const { locale, t } = useTranslation();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => { setLoading(true); setHealth(await checkDatabaseHealth(supabaseClient)); setLoading(false); };
  useEffect(() => { void refresh(); }, []);

  return <section className="space-y-6">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{t('admin.label')}</p><h1 className="mt-2 text-4xl font-semibold">{t('system.title')}</h1><p className="mt-2 text-muted">{t('system.description')}</p></header>
    <div className="flex flex-wrap items-center gap-4"><button onClick={() => void refresh()} disabled={loading} className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? t('system.checking') : health?.ok ? t('system.checkAgain') : t('common.retry')}</button><span role="status" aria-live="polite" className={`font-semibold ${loading ? 'text-slate-600' : health?.ok ? 'text-emerald-700' : 'text-red-700'}`}>{loading ? t('system.inProgress') : health?.ok ? t('system.healthy') : t('system.attention')}</span></div>
    {health && <><div className="grid gap-4 md:grid-cols-3"><Summary label={t('system.expectedVersion')} value={EXPECTED_SCHEMA_VERSION} /><Summary label={t('system.foundVersion')} value={health.schema_version ?? t('common.unavailable')} /><Summary label={t('system.lastCheck')} value={formatDateTime(health.checked_at, locale)} /></div><div className="grid gap-3 md:grid-cols-2">{health.checks.map((check) => <article key={check.name} className={`rounded-2xl border p-4 ${check.status === 'ok' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}><div className="flex justify-between gap-3"><strong>{check.name}</strong><span>{check.status === 'ok' ? 'OK' : t('common.error')}</span></div><p className="mt-1 text-sm text-slate-700">{check.message}</p>{check.latency_ms !== undefined && <p className="mt-2 text-xs font-semibold text-slate-500">{t('system.latency', { value: formatNumber(check.latency_ms, locale) })}</p>}</article>)}</div></>}
  </section>;
}

function Summary({ label, value }: { label: string; value: string }) { return <article className="rounded-3xl border border-line bg-white p-5"><h2 className="text-sm text-muted">{label}</h2><p className="mt-2 break-words text-lg font-semibold">{value}</p></article>; }
