import { useTranslation } from '../i18n/I18nProvider';

export function RouteLoadingFallback() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-48 items-center justify-center px-4" role="status" aria-live="polite" aria-busy="true">
      <span className="text-sm font-medium text-slate-600">{t('route.loading')}</span>
    </div>
  );
}
