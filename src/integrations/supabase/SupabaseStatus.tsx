import { useEffect, useState } from 'react';
import { checkSupabaseHealth } from './client';
import { supabaseConfig } from './config';
import { usePersistence } from './PersistenceProvider';
import { useTranslation } from '../../i18n/I18nProvider';

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.1.0';

type HealthStatus = 'pending' | 'ok' | 'error';

export function SupabaseStatus() {
  const { t } = useTranslation();
  const { activeAdapterName, mode } = usePersistence();
  const [health, setHealth] = useState<{ status: HealthStatus; message: string }>({ status: 'pending', message: t('supabase.checking') });

  useEffect(() => {
    let isMounted = true;
    checkSupabaseHealth().then((result) => {
      if (!isMounted) return;
      setHealth({ status: result.ok ? 'ok' : 'error', message: result.message });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const items = [
    [t('supabase.activeAdapter'), activeAdapterName],
    [t('supabase.configured'), supabaseConfig.isConfigured ? t('common.yes') : t('common.no')],
    [t('supabase.urlConfigured'), supabaseConfig.url ? supabaseConfig.url : t('profile.notInformed')],
    [t('supabase.health'), `${health.status === 'pending' ? t('supabase.pending') : health.status === 'ok' ? 'OK' : t('common.error')} — ${health.message}`],
    [t('supabase.appVersion'), appVersion],
    [t('supabase.mode'), mode === 'local' ? t('supabase.local') : 'Supabase'],
  ];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{t('supabase.diagnostics')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{t('supabase.title')}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          {t('supabase.description')}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-line bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500">{label}</h2>
            <p className="mt-2 break-words text-lg font-semibold text-slate-950">{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
