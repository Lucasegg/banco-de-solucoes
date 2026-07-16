import { FormEvent, type ChangeEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eye, LockKeyhole } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const inputClass = 'rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';
const NEUTRAL_MESSAGE = 'Se houver uma conta associada a este e-mail, enviaremos um código de recuperação.';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email: string) {
  const [name, domain = ''] = email.split('@');
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

export function PasswordRecovery({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { isAuthenticated, requestPasswordRecovery, verifyPasswordRecoveryCode, updateRecoveredPassword, clearRecoverySession, recoveryStatus, recoveryError } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const firstField = useRef<HTMLInputElement | null>(null);
  const busy = recoveryStatus === 'requesting-code' || recoveryStatus === 'verifying-code' || recoveryStatus === 'updating-password';
  const criteria = { length: password.length >= 8, letter: /[A-Za-z]/.test(password), number: /\d/.test(password) };
  const strong = Object.values(criteria).every(Boolean);

  useEffect(() => { firstField.current?.focus(); }, [step]);
  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown > 0]);
  useEffect(() => () => { void clearRecoverySession(); }, []);

  const request = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || cooldown) return;
    setError(''); setMessage('');
    if (!emailPattern.test(email.trim())) { setError('Informe um e-mail válido.'); return; }
    const result = await requestPasswordRecovery(email);
    if (!result.ok) { setError(result.message ?? 'Não foi possível enviar o código.'); return; }
    setEmail(email.trim().toLowerCase()); setMessage(NEUTRAL_MESSAGE); setCooldown(60); setStep(2);
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    const normalized = code.replace(/\s+/g, ''); setError('');
    if (!normalized) { setError('Digite o código completo recebido por e-mail.'); return; }
    const result = await verifyPasswordRecoveryCode(email, normalized);
    if (!result.ok) { setError(result.message ?? 'Código inválido ou expirado.'); return; }
    setCode(''); setMessage('Código confirmado. Crie uma nova senha.'); setStep(3);
  };

  const update = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return; setError('');
    if (!strong) { setError('A senha ainda não atende a todos os critérios.'); return; }
    if (password !== confirmation) { setError('A confirmação de senha não confere.'); return; }
    const result = await updateRecoveredPassword(password);
    if (!result.ok) { setError(result.message ?? 'Não foi possível alterar a senha.'); return; }
    setPassword(''); setConfirmation(''); setEmail(''); setCode(''); setMessage('Senha alterada com sucesso.');
    window.setTimeout(() => onNavigate('login'), 1200);
  };

  const cancel = async () => {
    const result = await clearRecoverySession();
    setEmail(''); setCode(''); setPassword(''); setConfirmation(''); setError(''); setMessage('');
    if (!result.ok) { setError(result.message ?? 'Não foi possível encerrar a recuperação.'); return; }
    onNavigate('login');
  };

  if (isAuthenticated) return <section className="mx-auto max-w-xl rounded-[2rem] border border-line bg-white p-8 shadow-soft"><h1 className="text-2xl font-semibold">Você já está conectado</h1><p className="mt-3 text-muted">Use as configurações da conta para gerenciar seu acesso. A recuperação não altera silenciosamente uma sessão normal.</p><button type="button" className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" onClick={() => onNavigate('account')}>Ir para minha conta</button></section>;

  return <section className="mx-auto max-w-xl rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium"><LockKeyhole size={16} /> Recuperação segura</span>
    <h1 className="mt-5 text-3xl font-semibold">Recuperar senha</h1>
    <p className="mt-2 text-sm text-muted">Etapa {step} de 3 — {step === 1 ? 'informar e-mail' : step === 2 ? 'inserir código' : 'criar nova senha'}</p>
    <div className="mt-4 flex gap-2" aria-hidden="true">{[1, 2, 3].map((item) => <span key={item} className={`h-2 flex-1 rounded-full ${item <= step ? 'bg-slate-900' : 'bg-slate-200'}`} />)}</div>

    {step === 1 && <form className="mt-7 grid gap-4" onSubmit={request}><label className="grid gap-2 text-sm font-medium" htmlFor="recovery-email">E-mail</label><input ref={firstField} id="recovery-email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required /><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Enviando...' : 'Enviar código'}</button></form>}
    {step === 2 && <form className="mt-7 grid gap-4" onSubmit={verify}><p className="text-sm text-muted">Código enviado para <strong className="text-slate-800">{maskEmail(email)}</strong>.</p><label className="grid gap-2 text-sm font-medium" htmlFor="recovery-code">Código de recuperação</label><input ref={firstField} id="recovery-code" className={inputClass} autoComplete="one-time-code" inputMode="numeric" maxLength={12} value={code} onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\s/g, ''))} required /><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Verificando...' : 'Verificar código'}</button><button type="button" className="rounded-full border border-line px-5 py-3 text-sm font-semibold disabled:opacity-50" disabled={busy || cooldown > 0} onClick={() => request()}>{cooldown ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}</button></form>}
    {step === 3 && recoveryStatus !== 'success' && <form className="mt-7 grid gap-4" onSubmit={update}><label className="grid gap-2 text-sm font-medium" htmlFor="new-password">Nova senha</label><div className="relative"><input ref={firstField} id="new-password" className={`${inputClass} w-full pr-12`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required /><button type="button" className="absolute right-3 top-3 text-muted" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((value) => !value)}><Eye /></button></div><label className="grid gap-2 text-sm font-medium" htmlFor="confirm-password">Confirmar nova senha</label><input id="confirm-password" className={inputClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmation(e.target.value)} required /><ul className="grid gap-1 text-sm">{[[criteria.length, 'Pelo menos 8 caracteres'], [criteria.letter, 'Pelo menos uma letra'], [criteria.number, 'Pelo menos um número']].map(([ok, label]) => <li key={String(label)} className={ok ? 'text-emerald-700' : 'text-muted'}><CheckCircle2 className="mr-2 inline" size={15} aria-hidden="true" />{label}</li>)}</ul><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Alterando...' : 'Alterar senha'}</button></form>}
    <div aria-live="polite">{(error || recoveryError) && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error || recoveryError}</p>}{message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}</div>
    <button className="mt-5 w-full text-sm font-semibold text-slate-700 underline" type="button" onClick={cancel}>Voltar para o login</button>
  </section>;
}
