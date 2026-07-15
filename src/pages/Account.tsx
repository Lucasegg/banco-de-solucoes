import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function format(value?: string | number | null) {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR');
}

export function Account({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, session, authStatus, authMessage, isSupabaseConfigured, logout } = useAuth();
  const provider = session?.user.app_metadata?.provider || session?.user.identities?.[0]?.provider || 'email';

  const signOut = async () => {
    const result = await logout();
    if (result.ok) onNavigate('login');
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-soft">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"><ShieldCheck size={16} /> Conta</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Status da autenticação</h1>
        <p className="mt-3 text-muted">Informações seguras da sessão atual, sem exibir tokens ou chaves públicas.</p>
        {authMessage && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{authMessage}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Supabase configurado" value={isSupabaseConfigured ? 'Sim' : 'Não'} />
        <Info label="Status" value={authStatus} />
        <Info label="User ID" value={session?.user.id ?? user?.id ?? '—'} />
        <Info label="E-mail" value={session?.user.email ?? user?.email ?? '—'} />
        <Info label="Provider" value={provider} />
        <Info label="Conta criada em" value={format(session?.user.created_at ?? user?.createdAt)} />
        <Info label="Expiração da sessão" value={format(session?.expires_at)} />
        <Info label="Status do profile" value={user ? 'Disponível' : 'Indisponível'} />
        <Info label="Role" value={user?.roleKey ?? '—'} />
      </div>
      <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"><LogOut size={16} /> Sair</button>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <article className="rounded-3xl border border-line bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-2 break-words text-lg font-semibold">{value}</p></article>;
}
