import { FormEvent, type ChangeEvent, useState } from 'react';
import { ArrowRight, GitBranch, LockKeyhole, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { consumeAuthReturnTo } from '../components/auth/authReturnTo';
import { SOCIAL_AUTH_PROVIDERS, SOCIAL_PROVIDER_LABELS, type SocialAuthProvider } from '../repositories/users/oauth';
import { useTranslation } from '../i18n/I18nProvider';
import { formatNumber } from '../i18n/format';


function ProviderIcon({ provider }: { provider: SocialAuthProvider }) {
  if (provider === 'github') return <GitBranch size={16} aria-hidden="true" />;
  return <span aria-hidden="true" className="text-base font-bold text-red-600">G</span>;
}

function SocialAuthButtons({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const { signInWithProvider, socialAuthProvider, socialAuthError } = useAuth();
  const [localError, setLocalError] = useState('');
  const start = async (provider: SocialAuthProvider) => {
    setLocalError('');
    const result = await signInWithProvider(provider);
    if (!result.ok) setLocalError(result.message ?? t('auth.socialFailed'));
    else onSuccess?.();
  };
  const visibleError = localError || socialAuthError;
  return (
    <div className="mt-6">
      <div className="grid gap-3">
        {SOCIAL_AUTH_PROVIDERS.map((provider) => {
          const busy = socialAuthProvider === provider;
          const disabled = Boolean(socialAuthProvider);
          return (
            <button key={provider} className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={disabled} aria-busy={busy} onClick={() => start(provider)}>
              <ProviderIcon provider={provider} /> {busy ? t('auth.redirecting') : t('auth.continueWith', { provider: SOCIAL_PROVIDER_LABELS[provider] })}
            </button>
          );
        })}
      </div>
      {visibleError && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{visibleError}</p>}
    </div>
  );
}

const inputClass = 'rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

export function Login({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await login(email, password);
    if (!result.ok) {
      setError(result.message ?? t('auth.loginFailed'));
      return;
    }
    if (result.message) {
      setError(result.message);
      return;
    }
    window.location.hash = consumeAuthReturnTo();
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="min-w-0 rounded-[2rem] border border-line bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-4xl font-semibold tracking-tight">{t('auth.loginTitle')}</h1>
        <p className="mt-4 leading-7 text-muted">{t('auth.loginDescription')}</p>
        <div className="mt-8 flex items-start gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-900">
          <span className="rounded-2xl bg-white p-3 text-emerald-700 shadow-sm"><LockKeyhole size={22} aria-hidden="true" /></span>
          <div>
            <strong className="text-base text-slate-900">{t('auth.secureConnection')}</strong>
            <p className="mt-1 leading-6">{t('auth.secureDescription')}</p>
          </div>
        </div>
      </div>
      <form onSubmit={submit} className="min-w-0 rounded-[2rem] border border-line bg-white p-5 shadow-soft sm:p-8">
        <h2 className="text-2xl font-semibold">{t('auth.login')}</h2>
        <label className="mt-6 grid gap-2 text-sm font-medium">{t('form.email')}<input className={inputClass} type="email" autoComplete="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} required /></label>
        <label className="mt-4 grid gap-2 text-sm font-medium">{t('form.password')}<input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} required /></label>
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">{t('auth.signIn')} <ArrowRight size={16} /></button>
        <button className="mt-4 w-full text-sm font-semibold text-slate-700 underline" type="button" onClick={() => onNavigate('password-recovery')}>{t('auth.forgotPassword')}</button>
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted"><span className="h-px flex-1 bg-line" />{t('common.or')}<span className="h-px flex-1 bg-line" /></div>
        <SocialAuthButtons />
        <button className="mt-3 w-full rounded-full border border-line px-5 py-3 text-sm font-semibold" type="button" onClick={() => onNavigate('register')}>{t('auth.createAccount')}</button>
      </form>
    </section>
  );
}

export function Register({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { locale, t } = useTranslation();
  const { register, isUsernameAvailable } = useAuth();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '', organization: '', city: '', state: '', country: 'Brasil', bio: '', acceptedTerms: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSuccess('');
    if (!form.name.trim() || !form.email.trim() || !form.organization.trim() || !form.city.trim() || !form.state.trim() || !form.country.trim() || !form.bio.trim()) {
      setError(t('register.required'));
      return;
    }
    const normalizedUsername = form.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedUsername)) {
      setError(t('register.invalidUsername'));
      return;
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setError(t('register.invalidPassword'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('register.passwordMismatch'));
      return;
    }
    if (!form.acceptedTerms) {
      setError(t('register.acceptRequired'));
      return;
    }
    setSubmitting(true);
    const availability = await isUsernameAvailable(normalizedUsername);
    if (!availability.ok || !availability.available) {
      setSubmitting(false);
      setError(availability.message ?? t('register.usernameUsed'));
      return;
    }
    const result = await register({ ...form, username: normalizedUsername });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? t('register.failed'));
      return;
    }
    setSuccess(result.message ?? t('register.success'));
    if (!result.message) window.location.hash = consumeAuthReturnTo();
  };

  return (
    <section className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white p-8 shadow-soft">
      <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800"><UserPlus size={16} aria-hidden="true" /> {t('register.badge')}</span>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">{t('register.title')}</h1>
      <p className="mt-3 text-muted">{t('register.description')}</p>
      <SocialAuthButtons />
      <form onSubmit={submit} className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">{t('register.displayName')}<input maxLength={100} className={inputClass} value={form.name} onChange={(event: ChangeEvent<HTMLInputElement>) => update('name', event.target.value)} required /></label>
        <label className="grid gap-2 text-sm font-medium">{t('register.username')}<input maxLength={30} className={inputClass} value={form.username} onChange={(event: ChangeEvent<HTMLInputElement>) => update('username', event.target.value)} placeholder={t('register.usernamePlaceholder')} required /></label>
        <label className="grid gap-2 text-sm font-medium">{t('form.email')}<input className={inputClass} type="email" value={form.email} onChange={(event: ChangeEvent<HTMLInputElement>) => update('email', event.target.value)} required /></label>
        <label className="grid gap-2 text-sm font-medium">{t('form.password')}<input className={inputClass} type="password" value={form.password} onChange={(event: ChangeEvent<HTMLInputElement>) => update('password', event.target.value)} required /></label>
        <label className="grid gap-2 text-sm font-medium">{t('register.confirmPassword')}<input className={inputClass} type="password" value={form.confirmPassword} onChange={(event: ChangeEvent<HTMLInputElement>) => update('confirmPassword', event.target.value)} required /></label>
        <label className="grid gap-2 text-sm font-medium">{t('register.organization')}<input maxLength={120} className={inputClass} value={form.organization} onChange={(event: ChangeEvent<HTMLInputElement>) => update('organization', event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-medium">{t('register.city')}<input maxLength={100} className={inputClass} value={form.city} onChange={(event: ChangeEvent<HTMLInputElement>) => update('city', event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-medium">{t('register.state')}<input maxLength={100} className={inputClass} value={form.state} onChange={(event: ChangeEvent<HTMLInputElement>) => update('state', event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-medium">{t('register.country')}<input maxLength={100} className={inputClass} value={form.country} onChange={(event: ChangeEvent<HTMLInputElement>) => update('country', event.target.value)} required /></label>
        <label className="grid gap-2 text-sm font-medium md:col-span-2">{t('register.bio')}<textarea className={inputClass} value={form.bio} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => update('bio', event.target.value)} rows={4} maxLength={500} placeholder={t('register.bioPlaceholder')} required /><span className="text-xs text-muted">{t('register.characters', { count: formatNumber(form.bio.length, locale), max: formatNumber(500, locale) })}</span></label>
        <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-muted md:col-span-2"><input type="checkbox" checked={form.acceptedTerms} onChange={(event: ChangeEvent<HTMLInputElement>) => update('acceptedTerms', event.target.checked)} className="mt-1 h-4 w-4 accent-slate-950" required /><span>{t('register.terms')}</span></label>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">{error}</p>}
        {success && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 md:col-span-2">{success}</p>}
        <div className="flex flex-wrap gap-3 md:col-span-2"><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit" disabled={submitting}>{submitting ? t('register.submitting') : t('register.submit')}</button><button className="rounded-full border border-line px-5 py-3 text-sm font-semibold" type="button" onClick={() => onNavigate('login')}>{t('register.haveAccount')}</button></div>
      </form>
    </section>
  );
}
