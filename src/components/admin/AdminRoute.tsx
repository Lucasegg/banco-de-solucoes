import { useEffect, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';

interface AdminRouteProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  onLoginRequired: () => void;
  children: ReactNode;
}

export function AdminRoute({ isAuthenticated, isLoading, isAdmin, onLoginRequired, children }: AdminRouteProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) onLoginRequired();
  }, [isAuthenticated, isLoading, onLoginRequired]);

  if (isLoading) return <p className="text-sm text-muted" role="status">{t('admin.checking')}</p>;
  if (!isAuthenticated) return null;
  if (!isAdmin) return <ForbiddenPage />;
  return <>{children}</>;
}

export function ForbiddenPage() {
  const { t } = useTranslation();
  return <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/40">
    <AlertTriangle className="mx-auto text-amber-700 dark:text-amber-300" size={32} aria-hidden="true" />
    <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">{t('admin.error403')}</p>
    <h1 className="mt-2 text-3xl font-semibold">{t('admin.forbidden')}</h1>
    <p className="mt-3 text-muted dark:text-slate-300">{t('admin.forbiddenDescription')}</p>
  </section>;
}
