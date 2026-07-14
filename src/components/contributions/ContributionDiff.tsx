import type { ContributionChange, SerializableValue } from '../../types/contribution';

function formatValue(value: SerializableValue): string {
  if (value === null || value === '') return '— vazio —';
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : '— lista vazia —';
  if (typeof value === 'object') return Object.entries(value).map(([key, entry]) => `${key}: ${formatValue(entry)}`).join('; ') || '— objeto vazio —';
  return String(value);
}

export function ContributionDiff({ changes }: { changes: ContributionChange[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className="grid bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 md:grid-cols-3"><span>Campo</span><span>Antes</span><span>Depois</span></div>
      {changes.map((change) => (
        <div key={change.id} className="grid gap-2 border-t border-line px-4 py-4 text-sm md:grid-cols-3">
          <strong>{change.label}</strong>
          <p className="whitespace-pre-wrap break-words rounded-2xl bg-rose-50 p-3 text-rose-900">{formatValue(change.previousValue)}</p>
          <p className="whitespace-pre-wrap break-words rounded-2xl bg-emerald-50 p-3 text-emerald-900">{formatValue(change.proposedValue)}</p>
        </div>
      ))}
    </div>
  );
}
