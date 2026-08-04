import { useTranslation } from '../i18n/I18nProvider';

export function NotFound({ onHome }: { onHome: () => void }) {
  const { t } = useTranslation();
  return <section aria-labelledby="not-found-title" className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-white p-8 shadow-soft">
    <h1 id="not-found-title" className="text-3xl font-semibold">{t('route.notFound.title')}</h1>
    <p className="mt-4 text-muted">{t('route.notFound.description')}</p>
    <button type="button" onClick={onHome} className="mt-6 rounded-full bg-slate-950 px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{t('route.notFound.home')}</button>
  </section>;
}
