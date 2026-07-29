import type { ReactNode } from 'react';
import { DatabaseZap, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { NotificationBell } from './notifications/NotificationBell';
import { useTranslation } from '../i18n/I18nProvider';
import type { TranslationKey } from '../i18n/resources';
import { InstitutionalFooter } from './InstitutionalFooter';

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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-white/85 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <button className="flex items-center gap-3 text-left" onClick={() => onNavigate('home')}>
            <span className="rounded-2xl border border-slate-200 bg-slate-950 p-2 text-white shadow-sm">
              <DatabaseZap size={20} />
            </span>
            <span>
              <strong className="block text-sm tracking-tight">{t('app.name')}</strong>
              <span className="text-xs text-muted">{t('app.tagline')}</span>
            </span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {links.map(([id, label]) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`rounded-full px-3 py-2 text-sm transition ${
                  (currentPage === id || (currentPage === 'problema' && id === 'problemas') || (currentPage === 'solucao' && id === 'solucoes')) ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                {t(label)}
              </button>
            ))}
            {isAuthenticated && user ? (
              <>
              <NotificationBell onNavigate={onNavigate} />
              <button
                onClick={() => onNavigate('favorites')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'favorites' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                {t('nav.favorites')}
              </button>
              <button
                onClick={() => onNavigate('contributions')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'contributions' || currentPage === 'contribution' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                {t('nav.contributions')}
              </button>
              {permissions.canReviewTaxonomy && <button onClick={() => onNavigate('admin-taxonomy')} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'admin-taxonomy' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>{t('nav.taxonomy')}</button>}
              {permissions.canAccessAdmin && <button onClick={() => onNavigate('admin')} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'admin' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>{t('nav.admin')}</button>}
              <button
                onClick={() => onNavigate('account')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'account' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                {t('nav.account')}
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'profile' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <img src={user.avatarUrl} alt={t('a11y.avatar', { name: user.name })} className="h-7 w-7 rounded-full object-cover" />
                {t('nav.profile')}
              </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'login' || currentPage === 'register' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <LogIn size={16} /> {t('nav.login')}
              </button>
            )}
            <label className="sr-only" htmlFor="language-selector">{t('language.label')}</label>
            <select id="language-selector" aria-label={t('language.label')} value={locale} onChange={(event: { target: { value: string } }) => setLocale(event.target.value as 'pt-BR' | 'en-US')} className="rounded-full border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="pt-BR">{t('language.pt-BR')}</option><option value="en-US">{t('language.en-US')}</option>
            </select>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">{children}</main>
      <InstitutionalFooter />
    </div>
  );
}
