import { useEffect, useState, type FormEvent } from 'react';
import { Heart, LogOut, ShieldCheck, X } from 'lucide-react';
import { TotpInput } from '../components/TotpInput';
import { useAuth } from '../hooks/useAuth';
import { useFavorites, type Favorite, type FavoriteKind } from '../hooks/useFavorites';

export function Account({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, session, authMessage, logout, mfaStatus, mfaError, mfaMessage, mfaEnrollment, enrollTotp, verifyTotpEnrollment, cancelTotpEnrollment, disableTotp, refreshMfaStatus, currentAssuranceLevel } = useAuth();
  const [code, setCode] = useState(''); const [copied, setCopied] = useState(false); const [confirmDisable, setConfirmDisable] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const favorites = useFavorites();
  useEffect(() => { void refreshMfaStatus(); }, []);
  const busy = mfaStatus === 'loading' || mfaStatus === 'verifying';
  const verifyEnrollment = async (event: FormEvent) => { event.preventDefault(); const result = await verifyTotpEnrollment(code); if (result.ok) setCode(''); };
  const copySecret = async () => { if (!mfaEnrollment) return; await navigator.clipboard.writeText(mfaEnrollment.secret); setCopied(true); window.setTimeout(() => setCopied(false), 2500); };
  const disable = async () => { const result = await disableTotp(code); if (result.ok) { setCode(''); setConfirmDisable(false); } };

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
      <section className="rounded-[2rem] border border-line bg-white p-6 shadow-soft">
        <div className="flex items-center gap-2"><Heart size={20} aria-hidden="true" /><h2 className="text-2xl font-semibold">Favoritos</h2></div>
        {favorites.error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{favorites.error}</p>}
        {favoriteMessage && <p aria-live="polite" className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">{favoriteMessage}</p>}
        {favorites.isLoading ? <p className="mt-5 text-sm text-muted">Carregando favoritos...</p> : <div className="mt-5 grid gap-6 md:grid-cols-2">
          <FavoriteGroup title="Problemas favoritos" kind="problems" items={favorites.favorites.problems} emptyMessage="Nenhum problema favorito." onNavigate={onNavigate} onRemove={async (id, kind) => { const result = await favorites.toggleFavorite(id, kind); setFavoriteMessage(result.ok ? 'Favorito removido.' : (result.message ?? 'Não foi possível remover o favorito.')); }} />
          <FavoriteGroup title="Soluções favoritas" kind="solutions" items={favorites.favorites.solutions} emptyMessage="Nenhuma solução favorita." onNavigate={onNavigate} onRemove={async (id, kind) => { const result = await favorites.toggleFavorite(id, kind); setFavoriteMessage(result.ok ? 'Favorito removido.' : (result.message ?? 'Não foi possível remover o favorito.')); }} />
        </div>}
      </section>
      <section className="rounded-[2rem] border border-line bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">Autenticação em dois fatores</h2>
        <div aria-live="polite" className="mt-3 text-sm">{mfaMessage && <p className="text-emerald-700">{mfaMessage}</p>}{mfaError && <p className="text-red-700">{mfaError}</p>}{copied && <p className="text-emerald-700">Chave copiada.</p>}</div>
        {mfaStatus === 'disabled' && <><p className="mt-3 text-muted">Adicione uma camada extra de proteção à sua conta usando um aplicativo autenticador.</p><button onClick={() => void enrollTotp()} disabled={busy} className="mt-5 rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">Ativar autenticação em dois fatores</button></>}
        {mfaEnrollment && <div className="mt-5 space-y-5"><p className="font-semibold">Etapa 2 de 2 — Leia o QR Code e confirme o código</p><img src={mfaEnrollment.qrCode} alt="QR Code para configurar o aplicativo autenticador" className="mx-auto max-w-64 rounded-xl border p-2" /><div><p className="text-sm text-muted">Se não puder ler o QR Code, use esta chave manual:</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 break-all rounded-xl bg-slate-100 p-3">{mfaEnrollment.secret}</code><button onClick={copySecret} aria-label="Copiar chave manual" className="rounded-xl border px-4">Copiar</button></div></div><form onSubmit={verifyEnrollment} className="space-y-4"><TotpInput value={code} onChange={setCode} disabled={busy} /><button disabled={busy || code.length !== 6} className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">Confirmar e ativar</button></form><button onClick={() => { setCode(''); void cancelTotpEnrollment(); }} disabled={busy} className="w-full rounded-full border px-5 py-3 font-semibold">Cancelar configuração</button></div>}
        {mfaStatus === 'enabled' && !mfaEnrollment && <div className="mt-4"><p><strong>Status:</strong> Ativada</p><p><strong>Método:</strong> Aplicativo autenticador</p><p className="mt-3 text-sm text-muted">Caso perca acesso ao aplicativo autenticador, será necessário utilizar um procedimento de recuperação administrado pelo suporte.</p>{!confirmDisable ? <button onClick={() => setConfirmDisable(true)} className="mt-5 rounded-full border border-red-300 px-5 py-3 font-semibold text-red-700">Desativar autenticação em dois fatores</button> : <div className="mt-5 rounded-2xl bg-red-50 p-4"><p>Desativar a autenticação em dois fatores reduzirá a segurança da sua conta.</p>{currentAssuranceLevel !== 'aal2' && <div className="mt-4"><p className="mb-3 text-sm">Confirme um código do aplicativo autenticador para continuar.</p><TotpInput value={code} onChange={setCode} disabled={busy} /></div>}<div className="mt-4 flex gap-3"><button onClick={() => { setConfirmDisable(false); setCode(''); }} className="rounded-full border px-5 py-2 font-semibold">Cancelar</button><button onClick={() => void disable()} disabled={busy || (currentAssuranceLevel !== 'aal2' && code.length !== 6)} className="rounded-full bg-red-700 px-5 py-2 font-semibold text-white disabled:opacity-50">Desativar</button></div></div>}</div>}
      </section>
      <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"><LogOut size={16} aria-hidden="true" /> Sair</button>
    </section>
  );
}

function FavoriteGroup({ title, kind, items, emptyMessage, onNavigate, onRemove }: { title: string; kind: FavoriteKind; items: Favorite[]; emptyMessage: string; onNavigate: (page: string) => void; onRemove: (id: string, kind: FavoriteKind) => Promise<void> }) {
  return <div><h3 className="font-semibold">{title}</h3>{items.length === 0 ? <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-muted">{emptyMessage}</p> : <ul className="mt-3 space-y-2">{items.map((favorite) => {
    const item = kind === 'problems' ? favorite.problem : favorite.solution; const id = favorite.problemId ?? favorite.solutionId;
    if (!item || !id) return null;
    return <li key={favorite.id} className="flex items-center gap-2 rounded-2xl border border-line p-3"><button type="button" onClick={() => onNavigate(`${kind === 'problems' ? 'problema' : 'solucao'}:${id}`)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-primary">{item.title}</button><button type="button" onClick={() => void onRemove(id, kind)} aria-label={`Remover ${item.title} dos favoritos`} className="rounded-full border border-rose-200 p-2 text-rose-700"><X size={15} /></button></li>;
  })}</ul>}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <article className="rounded-3xl border border-line bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-2 break-words text-lg font-semibold">{value}</p></article>;
}
