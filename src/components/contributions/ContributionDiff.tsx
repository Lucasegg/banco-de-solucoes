import type { ContributionChange, SerializableValue } from '../../types/contribution';
import { useTranslation } from '../../i18n/I18nProvider';

export function ContributionDiff({ changes }: { changes: ContributionChange[] }) {
  const { locale, t } = useTranslation();
  const formatValue = (value: SerializableValue): string => {
    if (value === null || value === '') return t('diff.empty');
    if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : t('diff.emptyList');
    if (typeof value === 'object') return Object.entries(value).map(([key, entry]) => `${key}: ${formatValue(entry)}`).join('; ') || t('diff.emptyObject');
    return typeof value === 'number' ? new Intl.NumberFormat(locale).format(value) : String(value);
  };
  return <div className="overflow-hidden rounded-3xl border border-line bg-white">
    <div className="grid bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 md:grid-cols-3"><span>{t('diff.field')}</span><span>{t('diff.before')}</span><span>{t('diff.after')}</span></div>
    {changes.map((change, index) => <div key={change.id ?? `${change.field}-${index}`} className="grid gap-2 border-t border-line px-4 py-4 text-sm md:grid-cols-3"><strong>{change.label}</strong><p className="whitespace-pre-wrap break-words rounded-2xl bg-rose-50 p-3 text-rose-900">{formatValue(change.previousValue)}</p><p className="whitespace-pre-wrap break-words rounded-2xl bg-emerald-50 p-3 text-emerald-900">{formatValue(change.proposedValue)}</p></div>)}
  </div>;
}
