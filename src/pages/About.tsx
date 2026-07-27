import { Lightbulb, Network, UsersRound } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';

export function About() {
  const { t } = useTranslation();
  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-semibold tracking-tight">{t('about.title')}</h1>
        <p className="mt-5 text-lg leading-8 text-muted">{t('about.intro')}</p>
        <p className="mt-4 leading-7 text-muted">{t('about.community')}</p>
      </div>
      <aside className="rounded-3xl border border-line bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{t('about.proposal')}</h2>
        <ul className="mt-5 space-y-4 text-sm text-muted">
          <li className="flex gap-3"><Lightbulb className="shrink-0 text-amber-600" size={20} aria-hidden="true" /><span>{t('about.visibility')}</span></li>
          <li className="flex gap-3"><Network className="shrink-0 text-teal-700" size={20} aria-hidden="true" /><span>{t('about.connect')}</span></li>
          <li className="flex gap-3"><UsersRound className="shrink-0 text-slate-700" size={20} aria-hidden="true" /><span>{t('about.collaborate')}</span></li>
        </ul>
      </aside>
    </section>
  );
}
