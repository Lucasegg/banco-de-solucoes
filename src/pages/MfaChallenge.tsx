import { useState, type FormEvent } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { TotpInput } from '../components/TotpInput';
import { useAuth } from '../hooks/useAuth';

export function MfaChallenge({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { mfaStatus, mfaError, verifyMfaChallenge, logout, refreshMfaStatus } = useAuth();
  const [code, setCode] = useState(''); const busy = mfaStatus === 'verifying' || mfaStatus === 'loading';
  const submit = async (event: FormEvent) => { event.preventDefault(); const result = await verifyMfaChallenge(code); setCode(''); if (result.ok) onNavigate('profile'); };
  const leave = async () => { await logout(); onNavigate('login'); };
  return <section className="mx-auto max-w-lg rounded-[2rem] border border-line bg-white p-8 shadow-soft">
    <ShieldCheck className="text-primary" aria-hidden="true" /><h1 className="mt-4 text-3xl font-semibold">Confirme sua identidade</h1>
    <p className="mt-3 text-muted">Digite o código gerado pelo seu aplicativo autenticador.</p>
    <form onSubmit={submit} className="mt-6 space-y-4"><TotpInput value={code} onChange={setCode} disabled={busy} />
      <p aria-live="assertive" className="text-sm text-red-700">{mfaError}</p>
      <button disabled={busy || code.length !== 6} className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Verificando…' : 'Confirmar código'}</button>
    </form>
    {mfaStatus === 'error' && <button onClick={() => void refreshMfaStatus()} className="mt-3 w-full rounded-full border px-5 py-3 font-semibold">Tentar novamente</button>}
    <button onClick={leave} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-semibold"><LogOut size={16} /> Sair e voltar ao login</button>
  </section>;
}
