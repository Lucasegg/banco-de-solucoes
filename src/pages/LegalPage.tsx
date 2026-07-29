import { useTranslation } from '../i18n/I18nProvider';
import type { TranslationKey } from '../i18n/resources';

export interface LegalSection { title: TranslationKey; body: TranslationKey; contact?: boolean }

export function LegalPage({ title, intro, sections, onNavigate }: { title: TranslationKey; intro: TranslationKey; sections: readonly LegalSection[]; onNavigate: (page: string) => void }) {
  const { t } = useTranslation();
  return <article className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-10">
    <header className="border-b border-line pb-6"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t(title)}</h1><p className="mt-4 text-lg leading-8 text-muted">{t(intro)}</p><p className="mt-4 text-sm font-medium text-slate-600"><time dateTime="2026-07-29">{t('legal.updatedLabel')}</time></p></header>
    <div className="mt-8 space-y-8">{sections.map((section) => <section key={section.title} aria-labelledby={section.title.replaceAll('.', '-')}>
      <h2 id={section.title.replaceAll('.', '-')} className="text-xl font-semibold text-slate-950">{t(section.title)}</h2><p className="mt-3 leading-7 text-slate-700">{t(section.body)}</p>
      {section.contact && <button onClick={() => onNavigate('contact')} className="mt-3 rounded-sm font-semibold text-sky-800 underline underline-offset-4 hover:text-sky-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-800">{t('legal.contactLink')}</button>}
    </section>)}</div>
  </article>;
}
