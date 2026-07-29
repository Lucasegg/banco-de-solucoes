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
import { useTranslation } from '../i18n/I18nProvider';
import { formatDurationClock } from '../i18n/format';

const inputClass = 'rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';
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

export function PasswordRecovery({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { locale, t } = useTranslation();
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
    if (!emailPattern.test(normalizedEmail)) { setError(t('recovery.invalidEmail')); return; }
    clearPasswordRecoveryFlowState();
    setSending(true);
    try {
      const result = await requestPasswordRecovery(normalizedEmail);
      if (!result.ok) { setError(result.message ?? t('recovery.requestFailed')); return; }
      setEmail(normalizedEmail);
      writeRecoveryStorage(PASSWORD_RECOVERY_EMAIL_KEY, normalizedEmail);
      writeRecoveryStorage(PASSWORD_RECOVERY_SENT_KEY, 'true');
      startCooldown();
      setMessage(t('recovery.neutral'));
      setSent(true);
    } finally { setSending(false); }
  };

  const resend = async () => {
    if (anyBusy || cooldown > 0 || !email) return;
    setError(''); setMessage(''); setResending(true);
    try {
      const result = await requestPasswordRecovery(email);
      if (!result.ok) { setError(result.message ?? t('recovery.requestFailed')); return; }
      startCooldown();
      setMessage(t('recovery.resent'));
    } finally { setResending(false); }
  };

  const update = async (event: FormEvent) => {
    event.preventDefault();
    if (anyBusy) return;
    setError(''); setMessage('');
    if (!strong) { setError(t('recovery.weak')); return; }
    if (password !== confirmation) { setError(t('recovery.mismatch')); return; }
    setUpdating(true);
    try {
      const result = await updateRecoveredPassword(password);
      if (!result.ok) { setError(result.message ?? t('recovery.updateFailed')); return; }
      setPassword(''); setConfirmation(''); setEmail(''); clearPasswordRecoveryFlowState(); cleanPasswordRecoveryCallbackUrl();
      setMessage(t('recovery.success'));
      window.setTimeout(() => onNavigate('login'), 1200);
    } finally { setUpdating(false); }
  };

  const cancel = async () => {
    if (anyBusy) return;
    const result = await clearRecoverySession();
    clearPasswordRecoveryFlowState(); cleanPasswordRecoveryCallbackUrl();
    setEmail(''); setPassword(''); setConfirmation(''); setError(''); setMessage(''); setSent(false);
    if (!result.ok) { setError(result.message ?? t('recovery.cancelFailed')); return; }
    onNavigate('login');
  };

  if (isAuthenticated) return <section className="mx-auto max-w-xl rounded-[2rem] border border-line bg-white p-8 shadow-soft"><h1 className="text-2xl font-semibold">{t('recovery.alreadySignedIn')}</h1><p className="mt-3 text-muted">{t('recovery.alreadySignedInDescription')}</p><button type="button" className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" onClick={() => onNavigate('account')}>{t('recovery.goAccount')}</button></section>;

  return <section className="mx-auto max-w-xl rounded-[2rem] border border-line bg-white p-6 shadow-soft sm:p-8">
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium"><LockKeyhole size={16} /> {t('recovery.secure')}</span>
    <h1 className="mt-5 text-3xl font-semibold">{linkReady ? t('recovery.newPasswordTitle') : processingLink ? t('recovery.validatingTitle') : sent ? t('recovery.checkEmailTitle') : t('recovery.title')}</h1>
    <p className="mt-2 text-sm text-muted">{linkReady ? t('recovery.strongHint') : processingLink ? t('recovery.validatingDescription') : sent ? t('recovery.sentDescription', { email: maskEmail(email) }) : t('recovery.emailDescription')}</p>

    {!linkReady && !processingLink && !sent && <form className="mt-7 grid gap-4" onSubmit={request}><label className="grid gap-2 text-sm font-medium" htmlFor="recovery-email">{t('form.email')}</label><input ref={firstField} id="recovery-email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} disabled={sending} required /><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={sending} type="submit">{sending ? t('recovery.sending') : t('recovery.sendLink')}</button></form>}
    {!linkReady && !processingLink && sent && <div className="mt-7 grid gap-4"><button type="button" className="rounded-full border border-line px-5 py-3 text-sm font-semibold disabled:opacity-50" disabled={anyBusy || cooldown > 0} onClick={resend}>{resending ? t('recovery.requesting') : cooldown > 0 ? t('recovery.cooldown', { time: formatDurationClock(cooldown, locale) }) : t('recovery.resend')}</button></div>}
    {processingLink && <div className="mt-7 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-muted" role="status">{t('recovery.processing')}</div>}
    {linkReady && <form className="mt-7 grid gap-4" onSubmit={update}><label className="grid gap-2 text-sm font-medium" htmlFor="new-password">{t('recovery.newPassword')}</label><div className="relative"><input ref={firstField} id="new-password" className={`${inputClass} w-full pr-12`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} disabled={updating} required /><button type="button" className="absolute right-3 top-3 text-muted" aria-label={showPassword ? t('form.hidePassword') : t('form.showPassword')} onClick={() => setShowPassword((value) => !value)}><Eye /></button></div><label className="grid gap-2 text-sm font-medium" htmlFor="confirm-password">{t('recovery.confirmPassword')}</label><input id="confirm-password" className={inputClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmation(event.target.value)} disabled={updating} required /><ul className="grid gap-1 text-sm">{[[criteria.length, t('password.length')], [criteria.letter, t('password.letter')], [criteria.number, t('password.number')]].map(([ok, label]) => <li key={String(label)} className={ok ? 'text-emerald-700' : 'text-muted'}><CheckCircle2 className="mr-2 inline" size={15} aria-hidden="true" />{label}</li>)}</ul><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={updating} type="submit">{updating ? t('recovery.updating') : t('recovery.update')}</button></form>}
    <div aria-live="polite" aria-atomic="true">{(error || recoveryError) && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error || recoveryError}</p>}{message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}</div>
    {!processingLink && <button className="mt-5 w-full text-sm font-semibold text-slate-700 underline disabled:opacity-50" disabled={anyBusy} type="button" onClick={cancel}>{t('recovery.backLogin')}</button>}
  </section>;
}
