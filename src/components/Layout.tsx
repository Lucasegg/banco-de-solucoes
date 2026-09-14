import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { DatabaseZap, LogIn, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { NotificationBell } from './notifications/NotificationBell';
import { useTranslation } from '../i18n/I18nProvider';
import type { TranslationKey } from '../i18n/resources';
import { InstitutionalFooter } from './InstitutionalFooter';
import { PUBLIC_VERSION } from '../version';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const links: [string, TranslationKey][] = [['home', 'nav.home'], ['problemas', 'nav.problems'], ['mapa', 'nav.map'], ['solucoes', 'nav.solutions'], ['search', 'nav.search'], ['novo-problema', 'nav.newProblem'], ['nova-solucao', 'nav.newSolution'], ['sobre', 'nav.about']];

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const permissions = usePermissions(user);
  const { locale, setLocale, t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const focusMainContent = (event: FormEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById('main-content')?.focus({ preventScroll: false });
  };

  const navigate = (page: string) => {
    setMobileMenuOpen(false);
    onNavigate(page);
  };

  const navButtonClass = (active: boolean) => `w-full rounded-xl px-3 py-2.5 text-left text-sm transition md:w-auto md:rounded-full md:py-2 ${
    active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
  }`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-ink">
      <a href="#main-content" onClick={focusMainContent} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-950 focus:shadow-lg">{t('a11y.skipToContent')}</a>
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => navigate('home')}>
              <span className="shrink-0 rounded-2xl border border-slate-200 bg-slate-950 p-2 text-white shadow-sm">
                <DatabaseZap size={20} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm tracking-tight">{t('app.name')}</strong>
                <span className="hidden text-xs text-muted sm:block">{t('app.tagline')}</span>
              </span>
            </button>

            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="primary-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 md:hidden"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div id="primary-navigation" className="hidden flex-wrap items-center justify-end gap-2 md:flex">
              {links.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => navigate(id)}
                  className={navButtonClass(currentPage === id || (currentPage === 'problema' && id === 'problemas') || (currentPage === 'solucao' && id === 'solucoes'))}
                >
                  {t(label)}
                </button>
              ))}
              {isAuthenticated && user ? (
                <>
                  <NotificationBell onNavigate={navigate} />
                  <button onClick={() => navigate('favorites')} className={navButtonClass(currentPage === 'favorites')}>{t('nav.favorites')}</button>
                  <button onClick={() => navigate('contributions')} className={navButtonClass(currentPage === 'contributions' || currentPage === 'contribution')}>{t('nav.contributions')}</button>
                  {permissions.canReviewTaxonomy && <button onClick={() => navigate('admin-taxonomy')} className={navButtonClass(currentPage === 'admin-taxonomy')}>{t('nav.taxonomy')}</button>}
                  {permissions.canAccessAdmin && <button onClick={() => navigate('admin')} className={navButtonClass(currentPage === 'admin')}>{t('nav.admin')}</button>}
                  <button onClick={() => navigate('account')} className={navButtonClass(currentPage === 'account')}>{t('nav.account')}</button>
                  <button onClick={() => navigate('profile')} className={`${navButtonClass(currentPage === 'profile')} inline-flex items-center gap-2`}>
                    <img src={user.avatarUrl} alt={t('a11y.avatar', { name: user.name })} className="h-7 w-7 rounded-full object-cover" />
                    {t('nav.profile')}
                  </button>
                </>
              ) : (
                <button onClick={() => navigate('login')} className={`${navButtonClass(currentPage === 'login' || currentPage === 'register')} inline-flex items-center gap-2`}>
                  <LogIn size={16} /> {t('nav.login')}
                </button>
              )}
              <label className="sr-only" htmlFor="language-selector">{t('language.label')}</label>
              <select id="language-selector" aria-label={t('language.label')} value={locale} onChange={(event: { target: { value: string } }) => setLocale(event.target.value as 'pt-BR' | 'en-US')} className="rounded-full border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="pt-BR">{t('language.pt-BR')}</option><option value="en-US">{t('language.en-US')}</option>
              </select>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="mt-3 max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-xl md:hidden">
              <div className="grid gap-1">
                {links.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => navigate(id)}
                    className={navButtonClass(currentPage === id || (currentPage === 'problema' && id === 'problemas') || (currentPage === 'solucao' && id === 'solucoes'))}
                  >
                    {t(label)}
                  </button>
                ))}
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center justify-between rounded-xl px-3 py-2">
                      <span className="text-sm text-slate-600">Notificações</span>
                      <NotificationBell onNavigate={navigate} />
                    </div>
                    <button onClick={() => navigate('favorites')} className={navButtonClass(currentPage === 'favorites')}>{t('nav.favorites')}</button>
                    <button onClick={() => navigate('contributions')} className={navButtonClass(currentPage === 'contributions' || currentPage === 'contribution')}>{t('nav.contributions')}</button>
                    {permissions.canReviewTaxonomy && <button onClick={() => navigate('admin-taxonomy')} className={navButtonClass(currentPage === 'admin-taxonomy')}>{t('nav.taxonomy')}</button>}
                    {permissions.canAccessAdmin && <button onClick={() => navigate('admin')} className={navButtonClass(currentPage === 'admin')}>{t('nav.admin')}</button>}
                    <button onClick={() => navigate('account')} className={navButtonClass(currentPage === 'account')}>{t('nav.account')}</button>
                    <button onClick={() => navigate('profile')} className={`${navButtonClass(currentPage === 'profile')} inline-flex items-center gap-2`}>
                      <img src={user.avatarUrl} alt={t('a11y.avatar', { name: user.name })} className="h-7 w-7 rounded-full object-cover" />
                      {t('nav.profile')}
                    </button>
                  </>
                ) : (
                  <button onClick={() => navigate('login')} className={`${navButtonClass(currentPage === 'login' || currentPage === 'register')} inline-flex items-center gap-2`}>
                    <LogIn size={16} /> {t('nav.login')}
                  </button>
                )}
                <div className="border-t border-line px-1 pt-2">
                  <label className="sr-only" htmlFor="mobile-language-selector">{t('language.label')}</label>
                  <select id="mobile-language-selector" aria-label={t('language.label')} value={locale} onChange={(event: { target: { value: string } }) => setLocale(event.target.value as 'pt-BR' | 'en-US')} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                    <option value="pt-BR">{t('language.pt-BR')}</option><option value="en-US">{t('language.en-US')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <p className="sr-only" aria-label={`Versão pública ${PUBLIC_VERSION}`}>v{PUBLIC_VERSION}</p>
      <InstitutionalFooter />
    </div>
  );
}
