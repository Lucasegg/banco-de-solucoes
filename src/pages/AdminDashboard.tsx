import { Activity, ClipboardList, FileWarning, MessageSquare, Settings, ShieldCheck, Users } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import type { TranslationKey } from '../i18n/resources';

export type AdminDestination = 'admin-users' | 'admin-problems' | 'admin-solutions' | 'admin-comments' | 'admin-reports' | 'admin-audit' | 'admin-system' | 'admin-taxonomy';

interface AdminDashboardProps {
  onNavigate: (page: AdminDestination) => void;
}

const adminSections: Array<{ destination: AdminDestination; title: TranslationKey; description: TranslationKey; icon: typeof Users }> = [
  { destination: 'admin-users', title: 'admin.users', description: 'admin.usersDescription', icon: Users },
  { destination: 'admin-problems', title: 'admin.problems', description: 'admin.problemsDescription', icon: ClipboardList },
  { destination: 'admin-solutions', title: 'admin.solutions', description: 'admin.solutionsDescription', icon: ShieldCheck },
  { destination: 'admin-comments', title: 'admin.comments', description: 'admin.commentsDescription', icon: MessageSquare },
  { destination: 'admin-reports', title: 'admin.reports', description: 'admin.reportsDescription', icon: FileWarning },
  { destination: 'admin-audit', title: 'admin.audit', description: 'admin.auditDescription', icon: Activity },
  { destination: 'admin-taxonomy', title: 'admin.taxonomy', description: 'admin.taxonomyDescription', icon: ShieldCheck },
  { destination: 'admin-system', title: 'admin.system', description: 'admin.systemDescription', icon: Settings },
];

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { t } = useTranslation();
  return <section className="space-y-8">
    <header>
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">{t('admin.label')}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t('admin.dashboard')}</h1>
      <p className="mt-3 max-w-2xl text-muted dark:text-slate-300">{t('admin.dashboardDescription')}</p>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {adminSections.map(({ destination, title, description, icon: Icon }) => <article key={destination} className="flex min-h-56 flex-col rounded-3xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <span className="inline-flex w-fit rounded-2xl bg-teal-50 p-3 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><Icon size={22} aria-hidden="true" /></span>
        <h2 className="mt-5 text-xl font-semibold">{t(title)}</h2>
        <p className="mt-2 text-sm leading-6 text-muted dark:text-slate-300">{t(description)}</p>
        <button onClick={() => onNavigate(destination)} className="mt-auto w-fit rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300">{t('admin.open')}</button>
      </article>)}
    </div>
  </section>;
}
