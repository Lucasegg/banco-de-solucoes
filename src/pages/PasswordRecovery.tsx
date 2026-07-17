import { FormEvent, type ChangeEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eye, LockKeyhole } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  clearPasswordRecoveryFlowState,
  PASSWORD_RECOVERY_EMAIL_KEY,
  PASSWORD_RECOVERY_LEGACY_NOTICE_KEY,
  PASSWORD_RECOVERY_RESEND_AT_KEY,
  PASSWORD_RECOVERY_STEP_KEY,
  readRecoveryStorage,
  removeRecoveryStorage,
  writeRecoveryStorage,
} from '../repositories/users/passwordRecoveryState';

const inputClass = 'rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';
const NEUTRAL_MESSAGE = 'Caso exista uma conta associada a este e-mail, enviaremos um código de recuperação.';
const LEGACY_MESSAGE = 'Este método de recuperação não é mais utilizado. Solicite um novo código.';
const COOLDOWN_MS = 90_000;
const OTP_LENGTH = 6;
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
  const { isAuthenticated, requestPasswordRecovery, verifyPasswordRecoveryCode, updateRecoveredPassword, clearRecoverySession, recoveryStatus, recoveryError } = useAuth();
  const savedEmail = readRecoveryStorage(PASSWORD_RECOVERY_EMAIL_KEY) ?? '';
  const savedStep = readRecoveryStorage(PASSWORD_RECOVERY_STEP_KEY) === '2' && savedEmail ? 2 : 1;
  const [step, setStep] = useState<1 | 2 | 3>(recoveryStatus === 'code-verified' ? 3 : savedStep);
  const [email, setEmail] = useState(savedEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(() => readRecoveryStorage(PASSWORD_RECOVERY_LEGACY_NOTICE_KEY) === 'true' ? LEGACY_MESSAGE : '');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(remainingSeconds);
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [updating, setUpdating] = useState(false);
  const firstField = useRef<HTMLInputElement | null>(null);
  const criteria = { length: password.length >= 8, letter: /[A-Za-z]/.test(password), number: /\d/.test(password) };
  const strong = Object.values(criteria).every(Boolean);
  const anyBusy = sending || resending || verifying || updating;

  useEffect(() => { firstField.current?.focus(); }, [step]);
  useEffect(() => {
    if (recoveryStatus === 'code-verified') {
      setStep(3);
      removeRecoveryStorage(PASSWORD_RECOVERY_STEP_KEY);
      removeRecoveryStorage(PASSWORD_RECOVERY_EMAIL_KEY);
      removeRecoveryStorage(PASSWORD_RECOVERY_RESEND_AT_KEY);
    }
  }, [recoveryStatus]);
  useEffect(() => {
    const updateClock = () => setCooldown(remainingSeconds());
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
      if (!result.ok) { setError(result.message ?? 'Não foi possível enviar o código. Tente novamente mais tarde.'); return; }
      setEmail(normalizedEmail);
      writeRecoveryStorage(PASSWORD_RECOVERY_EMAIL_KEY, normalizedEmail);
      writeRecoveryStorage(PASSWORD_RECOVERY_STEP_KEY, '2');
      startCooldown();
      setMessage(NEUTRAL_MESSAGE);
      setStep(2);
    } finally { setSending(false); }
  };

  const resend = async () => {
    if (anyBusy || cooldown > 0 || !email) return;
    setError(''); setMessage(''); setResending(true);
    try {
      const result = await requestPasswordRecovery(email);
      if (!result.ok) { setError(result.message ?? 'Não foi possível enviar o código. Tente novamente mais tarde.'); return; }
      setCode('');
      startCooldown();
      setMessage('Um novo código foi solicitado.');
      firstField.current?.focus();
    } finally { setResending(false); }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (anyBusy) return;
    const normalized = code.replace(/\s/g, '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(normalized); setError(''); setMessage('');
    if (normalized.length !== OTP_LENGTH) { setError(`Digite o código de ${OTP_LENGTH} dígitos recebido por e-mail.`); return; }
    setVerifying(true);
    try {
      const result = await verifyPasswordRecoveryCode(email, normalized);
      if (!result.ok) { setError(result.message ?? 'Código inválido ou expirado. Verifique o código ou solicite um novo.'); return; }
      setCode(''); setMessage('Código confirmado. Crie uma nova senha.'); setStep(3);
    } finally { setVerifying(false); }
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
      if (!result.ok) { setError(result.message ?? 'Não foi possível alterar sua senha. Solicite um novo código e tente novamente.'); return; }
      setPassword(''); setConfirmation(''); setEmail(''); setCode(''); clearPasswordRecoveryFlowState();
      setMessage('Senha alterada com sucesso.');
      window.setTimeout(() => onNavigate('login'), 1200);
    } finally { setUpdating(false); }
  };

  const cancel = async () => {
    if (anyBusy) return;
    const result = await clearRecoverySession();
    clearPasswordRecoveryFlowState(); setEmail(''); setCode(''); setPassword(''); setConfirmation(''); setMessage('');
    if (!result.ok) { setError(result.message ?? 'Não foi possível encerrar a recuperação.'); return; }
    onNavigate('login');
  };

  if (isAuthenticated) return <section className="mx-auto max-w-xl rounded-[2rem] border border-line bg-white p-8 shadow-soft"><h1 className="text-2xl font-semibold">Você já está conectado</h1><p className="mt-3 text-muted">Use as configurações da conta para gerenciar seu acesso. A recuperação não altera silenciosamente uma sessão normal.</p><button type="button" className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" onClick={() => onNavigate('account')}>Ir para minha conta</button></section>;

  const title = step === 1 ? 'Recuperar senha' : step === 2 ? 'Verifique seu e-mail' : 'Crie uma nova senha';
  return <section className="mx-auto max-w-xl rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium"><LockKeyhole size={16} /> Recuperação segura</span>
    <h1 className="mt-5 text-3xl font-semibold">{title}</h1>
    <p className="mt-2 text-sm text-muted">{step === 1 ? 'Informe o e-mail associado à sua conta.' : step === 2 ? `Digite o código enviado para ${maskEmail(email)}.` : 'Use uma senha forte e diferente da anterior.'}</p>
    <p className="mt-2 text-xs text-muted">Etapa {step} de 3</p>
    <div className="mt-4 flex gap-2" aria-hidden="true">{[1, 2, 3].map((item) => <span key={item} className={`h-2 flex-1 rounded-full ${item <= step ? 'bg-slate-900' : 'bg-slate-200'}`} />)}</div>

    {step === 1 && <form className="mt-7 grid gap-4" onSubmit={request}><label className="grid gap-2 text-sm font-medium" htmlFor="recovery-email">E-mail</label><input ref={firstField} id="recovery-email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} disabled={sending} required /><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={sending} type="submit">{sending ? 'Enviando...' : 'Enviar código'}</button></form>}
    {step === 2 && <form className="mt-7 grid gap-4" onSubmit={verify}><label className="grid gap-2 text-sm font-medium" htmlFor="recovery-code">Código de recuperação</label><input ref={firstField} id="recovery-code" className={inputClass} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" maxLength={OTP_LENGTH} value={code} onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, OTP_LENGTH))} disabled={verifying || resending} required /><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={verifying || resending} type="submit">{verifying ? 'Verificando...' : 'Verificar código'}</button><button type="button" className="rounded-full border border-line px-5 py-3 text-sm font-semibold disabled:opacity-50" disabled={anyBusy || cooldown > 0} onClick={resend}>{resending ? 'Solicitando...' : cooldown > 0 ? `Você poderá solicitar um novo código em ${formatTime(cooldown)}.` : 'Reenviar código'}</button></form>}
    {step === 3 && recoveryStatus !== 'success' && <form className="mt-7 grid gap-4" onSubmit={update}><label className="grid gap-2 text-sm font-medium" htmlFor="new-password">Nova senha</label><div className="relative"><input ref={firstField} id="new-password" className={`${inputClass} w-full pr-12`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} disabled={updating} required /><button type="button" className="absolute right-3 top-3 text-muted" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((value) => !value)}><Eye /></button></div><label className="grid gap-2 text-sm font-medium" htmlFor="confirm-password">Confirmar nova senha</label><input id="confirm-password" className={inputClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmation(e.target.value)} disabled={updating} required /><ul className="grid gap-1 text-sm">{[[criteria.length, 'Pelo menos 8 caracteres'], [criteria.letter, 'Pelo menos uma letra'], [criteria.number, 'Pelo menos um número']].map(([ok, label]) => <li key={String(label)} className={ok ? 'text-emerald-700' : 'text-muted'}><CheckCircle2 className="mr-2 inline" size={15} aria-hidden="true" />{label}</li>)}</ul><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={updating} type="submit">{updating ? 'Alterando...' : 'Alterar senha'}</button></form>}
    <div aria-live="polite" aria-atomic="true">{(error || recoveryError) && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error || recoveryError}</p>}{message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}</div>
    <button className="mt-5 w-full text-sm font-semibold text-slate-700 underline disabled:opacity-50" disabled={anyBusy} type="button" onClick={cancel}>Voltar para o login</button>
  </section>;
}
