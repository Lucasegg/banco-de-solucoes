import { useEffect, useState } from 'react';
import { checkSupabaseHealth } from './client';
import { supabaseConfig } from './config';
import { usePersistence } from './PersistenceProvider';

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.1.0';

type HealthStatus = 'pending' | 'ok' | 'error';

export function SupabaseStatus() {
  const { activeAdapterName, mode } = usePersistence();
  const [health, setHealth] = useState<{ status: HealthStatus; message: string }>({ status: 'pending', message: 'Verificando...' });

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
    ['Adapter ativo', activeAdapterName],
    ['Supabase configurado', supabaseConfig.isConfigured ? 'Sim' : 'Não'],
    ['URL configurada', supabaseConfig.url ? supabaseConfig.url : 'Não informada'],
    ['Health check', `${health.status === 'pending' ? 'Pendente' : health.status === 'ok' ? 'OK' : 'Erro'} — ${health.message}`],
    ['Versão da aplicação', appVersion],
    ['Modo', mode === 'local' ? 'Local' : 'Supabase'],
  ];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Diagnósticos</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Infraestrutura Supabase</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Esta tela valida apenas a infraestrutura preparada. A aplicação permanece usando armazenamento local e nenhuma funcionalidade foi migrada para Supabase.
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
