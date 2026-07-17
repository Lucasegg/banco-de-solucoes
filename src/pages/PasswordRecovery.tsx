import { FormEvent, type ChangeEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eye, LockKeyhole } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  clearPasswordRecoveryFlowState,
  PASSWORD_RECOVERY_EMAIL_KEY,
  PASSWORD_RECOVERY_RESEND_AT_KEY,
  PASSWORD_RECOVERY_SENT_KEY,
  readRecoveryStorage,
  writeRecoveryStorage,
} from '../repositories/users/passwordRecoveryState';
import { cleanPasswordRecoveryCallbackUrl } from '../repositories/users/passwordRecoveryCallback';

const inputClass = 'rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';
const NEUTRAL_MESSAGE = 'Caso exista uma conta associada a este e-mail, enviaremos um link para redefinir sua senha.';
const COOLDOWN_MS = 90_000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email: string) {
  const [name, domain = ''] = email.split('@');
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

function remainingSeconds() {
  const resendAt = Number(readRecoveryStorage(PASSWORD_RECOVERY_RESEND_AT_KEY));
  return Number.isFinite(resendAt) ? Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)) : 0;
}

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function PasswordRecovery({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { isAuthenticated, requestPasswordRecovery, updateRecoveredPassword, clearRecoverySession, recoveryStatus, recoveryError } = useAuth();
  const savedEmail = readRecoveryStorage(PASSWORD_RECOVERY_EMAIL_KEY) ?? '';
  const [email, setEmail] = useState(savedEmail);
  const [sent, setSent] = useState(readRecoveryStorage(PASSWORD_RECOVERY_SENT_KEY) === 'true' && Boolean(savedEmail));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(remainingSeconds);
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const firstField = useRef<HTMLInputElement | null>(null);
  const linkReady = recoveryStatus === 'link-ready';
  const processingLink = recoveryStatus === 'processing-link';
  const criteria = { length: password.length >= 8, letter: /[A-Za-z]/.test(password), number: /\d/.test(password) };
  const strong = Object.values(criteria).every(Boolean);
  const anyBusy = sending || resending || updating || processingLink;

  useEffect(() => { firstField.current?.focus(); }, [sent, linkReady]);
  useEffect(() => {
    const updateClock = () => setCooldown(remainingSeconds());
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (recoveryError?.startsWith('O link de recuperação expirou')) {
      setSent(false);
      setEmail('');
      clearPasswordRecoveryFlowState();
    }
  }, [recoveryError]);

  const startCooldown = () => {
    writeRecoveryStorage(PASSWORD_RECOVERY_RESEND_AT_KEY, String(Date.now() + COOLDOWN_MS));
    setCooldown(90);
  };

  const request = async (event: FormEvent) => {
    event.preventDefault();
    if (anyBusy) return;
    setError(''); setMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) { setError('Informe um e-mail válido.'); return; }
    clearPasswordRecoveryFlowState();
    setSending(true);
    try {
      const result = await requestPasswordRecovery(normalizedEmail);
      if (!result.ok) { setError(result.message ?? 'Não foi possível solicitar o link. Tente novamente mais tarde.'); return; }
      setEmail(normalizedEmail);
      writeRecoveryStorage(PASSWORD_RECOVERY_EMAIL_KEY, normalizedEmail);
      writeRecoveryStorage(PASSWORD_RECOVERY_SENT_KEY, 'true');
      startCooldown();
      setMessage(NEUTRAL_MESSAGE);
      setSent(true);
    } finally { setSending(false); }
  };

  const resend = async () => {
    if (anyBusy || cooldown > 0 || !email) return;
    setError(''); setMessage(''); setResending(true);
    try {
      const result = await requestPasswordRecovery(email);
      if (!result.ok) { setError(result.message ?? 'Não foi possível solicitar o link. Tente novamente mais tarde.'); return; }
      startCooldown();
      setMessage('Um novo link de recuperação foi solicitado.');
    } finally { setResending(false); }
  };

  const update = async (event: FormEvent) => {
    event.preventDefault();
    if (anyBusy) return;
    setError(''); setMessage('');
    if (!strong) { setError('A senha ainda não atende a todos os critérios.'); return; }
    if (password !== confirmation) { setError('A confirmação de senha não confere.'); return; }
    setUpdating(true);
    try {
      const result = await updateRecoveredPassword(password);
      if (!result.ok) { setError(result.message ?? 'Não foi possível alterar a senha. Solicite um novo link e tente novamente.'); return; }
      setPassword(''); setConfirmation(''); setEmail(''); clearPasswordRecoveryFlowState(); cleanPasswordRecoveryCallbackUrl();
      setMessage('Senha alterada com sucesso.');
      window.setTimeout(() => onNavigate('login'), 1200);
    } finally { setUpdating(false); }
  };

  const cancel = async () => {
    if (anyBusy) return;
    const result = await clearRecoverySession();
    clearPasswordRecoveryFlowState(); cleanPasswordRecoveryCallbackUrl();
    setEmail(''); setPassword(''); setConfirmation(''); setError(''); setMessage(''); setSent(false);
    if (!result.ok) { setError(result.message ?? 'Não foi possível encerrar a recuperação.'); return; }
    onNavigate('login');
  };

  if (isAuthenticated) return <section className="mx-auto max-w-xl rounded-[2rem] border border-line bg-white p-8 shadow-soft"><h1 className="text-2xl font-semibold">Você já está conectado</h1><p className="mt-3 text-muted">Use as configurações da conta para gerenciar seu acesso. A recuperação não altera silenciosamente uma sessão normal.</p><button type="button" className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" onClick={() => onNavigate('account')}>Ir para minha conta</button></section>;

  return <section className="mx-auto max-w-xl rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium"><LockKeyhole size={16} /> Recuperação segura</span>
    <h1 className="mt-5 text-3xl font-semibold">{linkReady ? 'Crie uma nova senha' : processingLink ? 'Validando link de recuperação' : sent ? 'Verifique seu e-mail' : 'Recuperar senha'}</h1>
    <p className="mt-2 text-sm text-muted">{linkReady ? 'Use uma senha forte e diferente da anterior.' : processingLink ? 'Aguarde enquanto validamos sua sessão de recuperação.' : sent ? <>Enviamos a solicitação para <strong className="text-slate-800">{maskEmail(email)}</strong>. Verifique sua caixa de entrada e a pasta de spam.</> : 'Informe o e-mail associado à sua conta.'}</p>

    {!linkReady && !processingLink && !sent && <form className="mt-7 grid gap-4" onSubmit={request}><label className="grid gap-2 text-sm font-medium" htmlFor="recovery-email">E-mail</label><input ref={firstField} id="recovery-email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} disabled={sending} required /><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={sending} type="submit">{sending ? 'Enviando...' : 'Enviar link de recuperação'}</button></form>}
    {!linkReady && !processingLink && sent && <div className="mt-7 grid gap-4"><button type="button" className="rounded-full border border-line px-5 py-3 text-sm font-semibold disabled:opacity-50" disabled={anyBusy || cooldown > 0} onClick={resend}>{resending ? 'Solicitando...' : cooldown > 0 ? `Você poderá solicitar um novo link em ${formatTime(cooldown)}.` : 'Enviar novamente'}</button></div>}
    {processingLink && <div className="mt-7 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-muted" role="status">Processando o retorno seguro do Supabase...</div>}
    {linkReady && <form className="mt-7 grid gap-4" onSubmit={update}><label className="grid gap-2 text-sm font-medium" htmlFor="new-password">Nova senha</label><div className="relative"><input ref={firstField} id="new-password" className={`${inputClass} w-full pr-12`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} disabled={updating} required /><button type="button" className="absolute right-3 top-3 text-muted" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((value) => !value)}><Eye /></button></div><label className="grid gap-2 text-sm font-medium" htmlFor="confirm-password">Confirmar nova senha</label><input id="confirm-password" className={inputClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmation(event.target.value)} disabled={updating} required /><ul className="grid gap-1 text-sm">{[[criteria.length, 'Pelo menos 8 caracteres'], [criteria.letter, 'Pelo menos uma letra'], [criteria.number, 'Pelo menos um número']].map(([ok, label]) => <li key={String(label)} className={ok ? 'text-emerald-700' : 'text-muted'}><CheckCircle2 className="mr-2 inline" size={15} aria-hidden="true" />{label}</li>)}</ul><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={updating} type="submit">{updating ? 'Alterando...' : 'Alterar senha'}</button></form>}
    <div aria-live="polite" aria-atomic="true">{(error || recoveryError) && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error || recoveryError}</p>}{message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}</div>
    {!processingLink && <button className="mt-5 w-full text-sm font-semibold text-slate-700 underline disabled:opacity-50" disabled={anyBusy} type="button" onClick={cancel}>Voltar para o login</button>}
  </section>;
}
