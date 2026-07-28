import { useAuth } from '../../hooks/useAuth';
import { useContributions } from '../../hooks/useContributions';
import type { ContributionTargetType } from '../../types/contribution';
import { useTranslation } from '../../i18n/I18nProvider';
import { formatDate } from '../../i18n/format';
import { contributionStatusKeys } from '../../i18n/presentation';

export function ContributionHistory({ targetType, targetId }: { targetType: ContributionTargetType; targetId: string }) {
  const { locale, t } = useTranslation();
  const { user } = useAuth();
  const { contributions, loading, error } = useContributions(user, { type: targetType, id: targetId });
  return <section className="rounded-[2rem] border border-line bg-white p-6" aria-labelledby={`${targetType}-contribution-history`}><h2 id={`${targetType}-contribution-history`} className="text-2xl font-semibold">{t('contribution.history')}</h2>{loading && <p className="mt-4 text-sm text-muted">{t('contribution.loadingHistory')}</p>}{error && <p className="mt-4 text-sm text-rose-700" role="alert">{error}</p>}{!loading && !error && contributions.length === 0 && <p className="mt-4 text-sm text-muted">{t('contribution.historyEmpty')}</p>}<div className="mt-4 grid gap-3">{contributions.map((item) => <article key={item.id} className="rounded-3xl bg-slate-50 p-4"><div className="flex items-center gap-3">{item.userAvatarUrl && <img src={item.userAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />}<div><strong>{item.userName}</strong><p className="text-xs text-muted">{formatDate(item.createdAt, locale)} · {t(contributionStatusKeys[item.status])}</p></div></div><p className="mt-3 text-sm leading-6">{item.payload.summary}</p></article>)}</div></section>;
}
