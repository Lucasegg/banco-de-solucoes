import { DatabaseZap } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import type { TranslationKey } from '../i18n/resources';

const links: ReadonlyArray<[string, TranslationKey]> = [
  ['#/contact', 'footer.contact'], ['#/privacy', 'footer.privacy'], ['#/terms', 'footer.terms'], ['#/lgpd', 'footer.lgpd'],
];

export function InstitutionalFooter() {
  const { t } = useTranslation();
  return <footer aria-label={t('footer.label')} className="border-t border-slate-200 bg-slate-950 text-slate-200">
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-[1fr_auto] md:items-start">
      <div className="flex gap-3"><DatabaseZap aria-hidden="true" className="mt-0.5 shrink-0" size={22} /><div><strong className="text-white">{t('app.name')}</strong><p className="mt-1 text-sm text-slate-300">{t('footer.description')}</p></div></div>
      <nav aria-label={t('footer.label')}><ul className="grid gap-3 text-sm sm:grid-cols-2">
        {links.map(([href, label]) => <li key={href}><a href={href} className="rounded-sm text-left underline decoration-slate-500 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{t(label)}</a></li>)}
      </ul></nav>
      <p className="border-t border-slate-700 pt-6 text-xs text-slate-400 md:col-span-2">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
    </div>
  </footer>;
}
