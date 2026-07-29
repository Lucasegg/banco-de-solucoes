import { useState, type ChangeEvent, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useLegalConsent, type ConsentState } from '../../context/LegalConsentContext';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAuth } from '../../hooks/useAuth';
import type { LegalLocale } from '../../legal/versions';

export type LegalConsentGateMode = 'bypass' | 'loading' | 'error' | 'consent' | 'granted';
export function resolveLegalConsentGateMode(bypass: boolean, consent: Pick<ConsentState, 'state' | 'status'>): LegalConsentGateMode {
  if (bypass) return 'bypass';
  if (consent.state === 'error') return 'error';
  if (consent.state !== 'ready' || !consent.status) return 'loading';
  return consent.status.pending ? 'consent' : 'granted';
}

export function LegalConsentGate({ bypass, onLogout, children }: { bypass: boolean; onLogout: () => void; children: ReactNode }) {
  const { locale } = useTranslation(); const { logout } = useAuth(); const consent = useLegalConsent();
  const mode = resolveLegalConsentGateMode(bypass, consent);
  if (mode === 'bypass' || mode === 'granted') return <>{children}</>;
  const signOut = async () => { const result = await logout(); if (result.ok) onLogout(); };
  return <LegalConsentPrompt mode={mode} locale={locale} onAccept={consent.accept} onRetry={consent.reload} onLogout={signOut} />;
}

export function LegalConsentPrompt({ mode, locale, onAccept, onRetry, onLogout }: { mode: Exclude<LegalConsentGateMode, 'bypass' | 'granted'>; locale: LegalLocale; onAccept: (locale: LegalLocale) => Promise<boolean>; onRetry: () => Promise<void>; onLogout: () => Promise<void> }) {
  const { t } = useTranslation(); const [confirmed, setConfirmed] = useState(false);
  return <section className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-white p-8 shadow-soft" aria-labelledby="legal-consent-title" aria-busy={mode === 'loading'}>
    <h1 id="legal-consent-title" className="text-3xl font-semibold">{t('consent.title')}</h1><p className="mt-4 text-muted">{t('consent.description')}</p>
    {mode === 'consent' && <><ul className="mt-5 list-disc space-y-2 pl-6"><li><a className="font-semibold text-primary underline focus:outline-none focus:ring-2 focus:ring-slate-900" href="#/terms" target="_blank" rel="noreferrer">{t('consent.terms')}</a></li><li><a className="font-semibold text-primary underline focus:outline-none focus:ring-2 focus:ring-slate-900" href="#/privacy" target="_blank" rel="noreferrer">{t('consent.privacy')}</a></li></ul><label className="mt-6 flex items-start gap-3"><input type="checkbox" checked={confirmed} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmed(e.target.checked)} className="mt-1 focus:ring-2 focus:ring-slate-900" /><span>{t('consent.confirm')}</span></label><button disabled={!confirmed} onClick={() => void onAccept(locale)} className="mt-6 rounded-full bg-primary px-5 py-3 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50">{t('consent.accept')}</button></>}
    {mode === 'loading' && <p className="mt-5" role="status">{t('consent.loading')}</p>}
    {mode === 'error' && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-red-800" role="alert"><p>{t('consent.error')}</p><button className="mt-3 underline focus:outline-none focus:ring-2 focus:ring-red-800" onClick={() => void onRetry()}>{t('consent.retry')}</button></div>}
    <button onClick={() => void onLogout()} className="mt-6 inline-flex items-center gap-2 rounded-full border px-5 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"><LogOut size={16} />{t('consent.logout')}</button>
  </section>;
}
