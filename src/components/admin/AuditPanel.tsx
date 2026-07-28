import type { ChangeEvent } from 'react';
import { useAuditEvents } from '../../hooks/useAuditEvents';
import { useTranslation } from '../../i18n/I18nProvider';
import { formatDateTime } from '../../i18n/format';
import { userRoleKeys } from '../../i18n/presentation';
import type { TranslationKey } from '../../i18n/resources';

const eventTypes = ['user.role_changed','contribution.approved','contribution.rejected','moderation.action','problem.created','problem.updated','problem.deleted','solution.created','solution.updated','solution.deleted','security.unauthorized_attempt'] as const;
const eventKeys = Object.fromEntries(eventTypes.map((event) => [event, `audit.event.${event}`])) as Record<(typeof eventTypes)[number], TranslationKey>;

export function AuditPanel({ enabled }: { enabled: boolean }) {
  const { locale, t } = useTranslation();
  const audit = useAuditEvents(enabled);
  const change = (key: string, value: string | boolean | number) => audit.setFilters({ ...audit.filters, [key]: value, page: key === 'page' ? Number(value) : 0 });
  return <div className="space-y-4">
    <div className="grid gap-3 rounded-3xl border border-line bg-white p-4 md:grid-cols-4">
      <input aria-label={t('audit.searchA11y')} placeholder={t('common.search')} value={audit.filters.search} onChange={(event: ChangeEvent<HTMLInputElement>) => change('search', event.target.value)} className="rounded-2xl border border-line p-3" />
      <select aria-label={t('audit.event')} value={audit.filters.eventType} onChange={(event: ChangeEvent<HTMLSelectElement>) => change('eventType', event.target.value)} className="rounded-2xl border border-line p-3"><option value="">{t('audit.allEvents')}</option>{eventTypes.map((event) => <option key={event} value={event}>{t(eventKeys[event])}</option>)}</select>
      <input aria-label={t('audit.target')} placeholder={t('audit.targetPlaceholder')} value={audit.filters.targetType} onChange={(event: ChangeEvent<HTMLInputElement>) => change('targetType', event.target.value)} className="rounded-2xl border border-line p-3" />
      <select aria-label={t('audit.actor')} value={audit.filters.actorId} onChange={(event: ChangeEvent<HTMLSelectElement>) => change('actorId', event.target.value)} className="rounded-2xl border border-line p-3"><option value="">{t('audit.allActors')}</option>{audit.users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select>
      <input type="date" aria-label={t('audit.startDate')} value={audit.filters.from} onChange={(event: ChangeEvent<HTMLInputElement>) => change('from', event.target.value)} className="rounded-2xl border border-line p-3" />
      <input type="date" aria-label={t('audit.endDate')} value={audit.filters.to} onChange={(event: ChangeEvent<HTMLInputElement>) => change('to', event.target.value)} className="rounded-2xl border border-line p-3" />
      <select aria-label={t('common.sort')} value={audit.filters.ascending ? 'oldest' : 'newest'} onChange={(event: ChangeEvent<HTMLSelectElement>) => change('ascending', event.target.value === 'oldest')} className="rounded-2xl border border-line p-3"><option value="newest">{t('sort.newest')}</option><option value="oldest">{t('sort.oldest')}</option></select>
    </div>
    <p aria-live="polite" className="text-sm text-rose-700">{audit.error}</p>
    {audit.loading ? <p>{t('common.loading')}</p> : audit.events.map((event) => <article key={event.id} className="rounded-3xl border border-line bg-white p-5"><strong>{event.eventType in eventKeys ? t(eventKeys[event.eventType as keyof typeof eventKeys]) : event.eventType}</strong><p className="text-sm text-muted">{formatDateTime(event.createdAt, locale)} · {event.actorName} · {event.targetType ?? t('audit.noTarget')}{event.targetId ? ` (${event.targetId.slice(0, 8)}…)` : ''}</p><pre className="mt-2 overflow-auto rounded-xl bg-slate-50 p-3 text-xs">{JSON.stringify(event.metadata, null, 2)}</pre></article>)}
    <div className="flex justify-between"><button disabled={!audit.filters.page} onClick={() => change('page', audit.filters.page - 1)} className="rounded-full border px-4 py-2 disabled:opacity-40">{t('pagination.previous')}</button><button disabled={audit.events.length < 50} onClick={() => change('page', audit.filters.page + 1)} className="rounded-full border px-4 py-2 disabled:opacity-40">{t('pagination.next')}</button></div>
  </div>;
}

export function RoleManager() {
  const { t } = useTranslation();
  const audit = useAuditEvents(true);
  return <section className="space-y-3"><h2 className="text-xl font-semibold">{t('audit.roles')}</h2>{audit.users.map((user) => <label key={user.id} className="flex items-center justify-between rounded-2xl border bg-white p-4"><span>{user.name}</span><select value={user.role} onChange={(event: ChangeEvent<HTMLSelectElement>) => void audit.updateRole(user.id, event.target.value as typeof user.role)} className="rounded-xl border p-2">{Object.entries(userRoleKeys).map(([role, key]) => <option key={role} value={role}>{t(key)}</option>)}</select></label>)}<p className="text-sm text-rose-700">{audit.error}</p></section>;
}
