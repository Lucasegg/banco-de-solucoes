import { useEffect, useState, type FormEvent } from 'react';
import { Heart, LogOut, ShieldCheck, X } from 'lucide-react';
import { TotpInput } from '../components/TotpInput';
import { useAuth } from '../hooks/useAuth';
import { useFavorites, type Favorite, type FavoriteKind } from '../hooks/useFavorites';
import { useTranslation } from '../i18n/I18nProvider';
import { useLegalConsent } from '../context/LegalConsentContext';
import type { LegalDocumentType } from '../legal/versions';
import { selectCurrentLegalAcceptance } from '../legal/selectCurrentAcceptance';

export function Account({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { t } = useTranslation();
  const legal = useLegalConsent();
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
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"><ShieldCheck size={16} aria-hidden="true" /> {t('account.badge')}</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">{t('account.title')}</h1>
        <p className="mt-3 text-muted">{t('account.description')}</p>
        {authMessage && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{authMessage}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label={t('account.name')} value={user?.name ?? '—'} />
        <Info label={t('account.email')} value={session?.user.email ?? user?.email ?? '—'} />
      </div>
      <section className="rounded-[2rem] border border-line bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">{t('account.legalTitle')}</h2><p className="mt-2 text-muted">{t('account.legalDescription')}</p>
        {legal.state === 'loading' && <p className="mt-4">{t('account.legalLoading')}</p>}{legal.state === 'error' && <p className="mt-4 text-red-700">{t('account.legalError')}</p>}
        {legal.status && <div className="mt-5 grid gap-4 md:grid-cols-2"><LegalDocument type="terms" label={t('account.termsVersion')} href="#/terms" link={t('account.viewTerms')} /><LegalDocument type="privacy" label={t('account.privacyVersion')} href="#/privacy" link={t('account.viewPrivacy')} /></div>}
      </section>
      <section className="rounded-[2rem] border border-line bg-white p-6 shadow-soft">
        <div className="flex items-center gap-2"><Heart size={20} aria-hidden="true" /><h2 className="text-2xl font-semibold">{t('account.favorites')}</h2></div>
        {favorites.error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{favorites.error}</p>}
        {favoriteMessage && <p aria-live="polite" className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">{favoriteMessage}</p>}
        {favorites.isLoading ? <p className="mt-5 text-sm text-muted">{t('account.loadingFavorites')}</p> : <div className="mt-5 grid gap-6 md:grid-cols-2">
          <FavoriteGroup title={t('account.favoriteProblems')} kind="problems" items={favorites.favorites.problems} emptyMessage={t('account.noFavoriteProblem')} onNavigate={onNavigate} onRemove={async (id, kind) => { const result = await favorites.toggleFavorite(id, kind); setFavoriteMessage(result.ok ? t('account.favoriteRemoved') : (result.message ?? t('account.favoriteRemoveFailed'))); }} />
          <FavoriteGroup title={t('account.favoriteSolutions')} kind="solutions" items={favorites.favorites.solutions} emptyMessage={t('account.noFavoriteSolution')} onNavigate={onNavigate} onRemove={async (id, kind) => { const result = await favorites.toggleFavorite(id, kind); setFavoriteMessage(result.ok ? t('account.favoriteRemoved') : (result.message ?? t('account.favoriteRemoveFailed'))); }} />
        </div>}
      </section>
      <section className="rounded-[2rem] border border-line bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">{t('account.mfaTitle')}</h2>
        <div aria-live="polite" className="mt-3 text-sm">{mfaMessage && <p className="text-emerald-700">{mfaMessage}</p>}{mfaError && <p className="text-red-700">{mfaError}</p>}{copied && <p className="text-emerald-700">{t('account.keyCopied')}</p>}</div>
        {mfaStatus === 'disabled' && <><p className="mt-3 text-muted">{t('account.mfaDisabledDescription')}</p><button onClick={() => void enrollTotp()} disabled={busy} className="mt-5 rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">{t('account.mfaEnable')}</button></>}
        {mfaEnrollment && <div className="mt-5 space-y-5"><p className="font-semibold">{t('account.mfaStep')}</p><img src={mfaEnrollment.qrCode} alt={t('account.qrAlt')} className="mx-auto max-w-64 rounded-xl border p-2" /><div><p className="text-sm text-muted">{t('account.manualKeyDescription')}</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 break-all rounded-xl bg-slate-100 p-3">{mfaEnrollment.secret}</code><button onClick={copySecret} aria-label={t('account.copyKeyA11y')} className="rounded-xl border px-4">{t('common.copy')}</button></div></div><form onSubmit={verifyEnrollment} className="space-y-4"><TotpInput value={code} onChange={setCode} disabled={busy} /><button disabled={busy || code.length !== 6} className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">{t('account.mfaConfirmEnable')}</button></form><button onClick={() => { setCode(''); void cancelTotpEnrollment(); }} disabled={busy} className="w-full rounded-full border px-5 py-3 font-semibold">{t('account.mfaCancelSetup')}</button></div>}
        {mfaStatus === 'enabled' && !mfaEnrollment && <div className="mt-4"><p><strong>{t('common.status')}</strong> {t('account.enabled')}</p><p><strong>{t('account.method')}</strong> {t('account.authenticatorApp')}</p><p className="mt-3 text-sm text-muted">{t('account.recoveryWarning')}</p>{!confirmDisable ? <button onClick={() => setConfirmDisable(true)} className="mt-5 rounded-full border border-red-300 px-5 py-3 font-semibold text-red-700">{t('account.mfaDisable')}</button> : <div className="mt-5 rounded-2xl bg-red-50 p-4"><p>{t('account.disableWarning')}</p>{currentAssuranceLevel !== 'aal2' && <div className="mt-4"><p className="mb-3 text-sm">{t('account.confirmCode')}</p><TotpInput value={code} onChange={setCode} disabled={busy} /></div>}<div className="mt-4 flex gap-3"><button onClick={() => { setConfirmDisable(false); setCode(''); }} className="rounded-full border px-5 py-2 font-semibold">{t('common.cancel')}</button><button onClick={() => void disable()} disabled={busy || (currentAssuranceLevel !== 'aal2' && code.length !== 6)} className="rounded-full bg-red-700 px-5 py-2 font-semibold text-white disabled:opacity-50">{t('common.disable')}</button></div></div>}</div>}
      </section>
      <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"><LogOut size={16} aria-hidden="true" /> {t('account.signOut')}</button>
    </section>
  );
}

function LegalDocument({ type, label, href, link }: { type: LegalDocumentType; label: string; href: string; link: string }) { const { t, locale } = useTranslation(); const { status } = useLegalConsent(); const acceptance = selectCurrentLegalAcceptance(status, type); return <article className="rounded-2xl bg-slate-50 p-4"><h3 className="font-semibold">{label}</h3><p className="mt-2">{acceptance?.documentVersion ?? t('account.notAccepted')}</p>{acceptance && <p className="mt-1 text-sm text-muted">{t('account.acceptedAt', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(acceptance.acceptedAt)) })}</p>}<a className="mt-3 inline-block font-semibold text-primary underline" href={href}>{link}</a></article>; }

function FavoriteGroup({ title, kind, items, emptyMessage, onNavigate, onRemove }: { title: string; kind: FavoriteKind; items: Favorite[]; emptyMessage: string; onNavigate: (page: string) => void; onRemove: (id: string, kind: FavoriteKind) => Promise<void> }) {
  const { t } = useTranslation();
  return <div><h3 className="font-semibold">{title}</h3>{items.length === 0 ? <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-muted">{emptyMessage}</p> : <ul className="mt-3 space-y-2">{items.map((favorite) => {
    const item = kind === 'problems' ? favorite.problem : favorite.solution; const id = favorite.problemId ?? favorite.solutionId;
    if (!item || !id) return null;
    return <li key={favorite.id} className="flex items-center gap-2 rounded-2xl border border-line p-3"><button type="button" onClick={() => onNavigate(`${kind === 'problems' ? 'problema' : 'solucao'}:${id}`)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-primary">{item.title}</button><button type="button" onClick={() => void onRemove(id, kind)} aria-label={t('account.removeFavorite', { title: item.title })} className="rounded-full border border-rose-200 p-2 text-rose-700"><X size={15} /></button></li>;
  })}</ul>}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <article className="rounded-3xl border border-line bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-2 break-words text-lg font-semibold">{value}</p></article>;
}
