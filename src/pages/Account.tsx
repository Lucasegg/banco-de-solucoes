import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function Account({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, session, authMessage, logout } = useAuth();

  const signOut = async () => {
    const result = await logout();
    if (result.ok) onNavigate('login');
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-soft">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"><ShieldCheck size={16} aria-hidden="true" /> Conta</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Dados da sua conta</h1>
        <p className="mt-3 text-muted">Consulte as informações principais associadas à sua conta.</p>
        {authMessage && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{authMessage}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Nome" value={user?.name ?? '—'} />
        <Info label="E-mail" value={session?.user.email ?? user?.email ?? '—'} />
      </div>
      <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"><LogOut size={16} aria-hidden="true" /> Sair</button>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <article className="rounded-3xl border border-line bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-2 break-words text-lg font-semibold">{value}</p></article>;
}
