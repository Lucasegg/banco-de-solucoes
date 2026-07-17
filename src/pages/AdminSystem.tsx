import { useEffect, useState } from 'react';
import { supabaseClient } from '../integrations/supabase/client';
import { checkDatabaseHealth, type SystemHealth } from '../services/systemHealth';

export function AdminSystem() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => { setLoading(true); setHealth(await checkDatabaseHealth(supabaseClient)); setLoading(false); };
  useEffect(() => { void refresh(); }, []);
  return <section className="space-y-6"><header><p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Administração</p><h1 className="mt-2 text-4xl font-semibold">Diagnóstico do sistema</h1><p className="mt-2 text-muted">Saúde do banco, RPCs, contrato de colunas e versão do schema.</p></header><div className="flex items-center gap-4"><button onClick={() => void refresh()} disabled={loading} className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Verificando…' : 'Verificar novamente'}</button>{health && <span className={`font-semibold ${health.ok ? 'text-emerald-700' : 'text-red-700'}`}>{health.ok ? 'Sistema íntegro' : 'Atenção necessária'}</span>}</div>{health && <><div className="grid gap-4 md:grid-cols-2"><Card label="Versão do schema" value={health.schemaVersion ?? 'Indisponível'} /><Card label="Última verificação" value={new Date(health.checkedAt).toLocaleString('pt-BR')} /></div><div className="space-y-3">{health.checks.map((check) => <article key={check.name} className={`rounded-2xl border p-4 ${check.status === 'ok' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}><div className="flex justify-between gap-3"><strong>{check.name}</strong><span>{check.status === 'ok' ? 'OK' : 'Erro'}</span></div><p className="mt-1 text-sm text-slate-700">{check.message}</p></article>)}</div></>}</section>;
}
function Card({ label, value }: { label: string; value: string }) { return <article className="rounded-3xl border border-line bg-white p-5"><h2 className="text-sm text-muted">{label}</h2><p className="mt-2 text-lg font-semibold">{value}</p></article>; }
