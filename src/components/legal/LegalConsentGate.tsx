import { useState, type ChangeEvent, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useLegalConsent } from '../../context/LegalConsentContext';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAuth } from '../../hooks/useAuth';

export function LegalConsentGate({ bypass, onLogout, children }: { bypass: boolean; onLogout: () => void; children: ReactNode }) {
  const { locale, t } = useTranslation(); const { logout } = useAuth(); const consent = useLegalConsent(); const [confirmed, setConfirmed] = useState(false);
  if (bypass || consent.state === 'idle' || (consent.state === 'ready' && !consent.status?.pending)) return <>{children}</>;
  const signOut = async () => { const result = await logout(); if (result.ok) onLogout(); };
  return <main className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-white p-8 shadow-soft" aria-labelledby="legal-consent-title" aria-busy={consent.state === 'loading'}>
    <h1 id="legal-consent-title" className="text-3xl font-semibold">{t('consent.title')}</h1><p className="mt-4 text-muted">{t('consent.description')}</p>
    <ul className="mt-5 list-disc space-y-2 pl-6"><li><a className="font-semibold text-primary underline" href="#/terms" target="_blank" rel="noreferrer">{t('consent.terms')}</a></li><li><a className="font-semibold text-primary underline" href="#/privacy" target="_blank" rel="noreferrer">{t('consent.privacy')}</a></li></ul>
    {consent.state === 'error' && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-red-800" role="alert"><p>{t('consent.error')}</p><button className="mt-3 underline" onClick={() => void consent.reload()}>{t('consent.retry')}</button></div>}
    <label className="mt-6 flex items-start gap-3"><input type="checkbox" checked={confirmed} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmed(e.target.checked)} className="mt-1" /><span>{t('consent.confirm')}</span></label>
    <div className="mt-6 flex flex-wrap gap-3"><button disabled={!confirmed || consent.state === 'loading' || consent.state === 'error'} onClick={() => void consent.accept(locale)} className="rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">{t('consent.accept')}</button><button onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded-full border px-5 py-3 font-semibold"><LogOut size={16} />{t('consent.logout')}</button></div>
  </main>;
}

