import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { notificationPage } from '../src/repositories/notifications/pagination.ts';
import { pageFromHash } from '../src/routing/hashRouter.ts';

const migration = readFileSync('supabase/migrations/20260730130000_sprint44_in_app_notifications.sql', 'utf8');
const assertions = readFileSync('scripts/fixtures/sprint44_notifications_assertions.sql', 'utf8');
const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const repository = readFileSync('src/repositories/notifications/NotificationRepository.ts', 'utf8');
const translations = readFileSync('src/i18n/locales/engagement.ts', 'utf8');
const presentation = readFileSync('src/notifications/presentation.tsx', 'utf8');
const navigation = readFileSync('src/notifications/navigation.ts', 'utf8');
const notificationTypes = readFileSync('src/types/notification.ts', 'utf8');
const legacyTypes = ['contribution.received','contribution.approved','contribution.rejected','contribution.changes_requested','comment.created','comment.replied','comment.reacted','favorite.content_updated','user.role_changed'];

test('migration defines deterministic, private and idempotent persistence', () => {
  assert.match(migration, /notification_order bigint generated always as identity/);
  assert.match(migration, /event_key text[\s\S]*unique \(event_key\)/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /revoke insert, update, delete on table public\.notifications from authenticated/);
  assert.match(migration, /on conflict \(event_key\) do nothing/);
  assert.match(migration, /order by n\.notification_order desc/);
  assert.match(migration, /limit p_limit \+ 1 offset p_offset/);
  for (const type of legacyTypes) {
    assert.ok(migration.includes(`'${type}'`), `migration lost ${type}`);
    assert.ok(notificationTypes.includes(`'${type}'`), `TypeScript lost ${type}`);
    assert.ok(repository.includes(`'${type}'`), `repository lost ${type}`);
  }
});

test('automatic events contain no administrative identities, notes or report metadata', () => {
  const triggerSection = migration.slice(migration.indexOf('create function public.notify_report_status_sprint44'));
  assert.doesNotMatch(triggerSection, /moderator_id|moderator_note/i);
  assert.match(triggerSection, /create_event_notification\(\s*new\.reporter_id/);
  assert.doesNotMatch(triggerSection, /jsonb_build_object/i);
  for (const type of ['report.reviewing','report.resolved','report.dismissed','content.archived','content.restored']) assert.ok(migration.includes(type));
  assert.match(migration, /case when n\.type like 'report\.%' or n\.type like 'content\.%' then null else n\.actor_id end/);
  assert.match(assertions, /s44:private-actor[\s\S]*leaked_actor is not null or leaked_name is not null/);
});

test('all client RPCs derive ownership from auth.uid and have fixed search paths', () => {
  for (const name of ['get_my_notifications','get_my_unread_notification_count','mark_my_notification_read','mark_all_my_notifications_read']) {
    const start = migration.indexOf(`create function public.${name}`);
    const body = migration.slice(start, migration.indexOf('$$;', start) + 3);
    assert.match(body, /security definer set search_path = pg_catalog, public/);
    assert.match(body, /auth\.uid\(\)/);
    assert.doesNotMatch(body, /p_recipient_id/);
  }
});

test('repository uses only Sprint 44 RPCs and maps the safe projection', () => {
  for (const name of ['get_my_notifications','get_my_unread_notification_count','mark_my_notification_read','mark_all_my_notifications_read']) assert.ok(repository.includes(name));
  assert.match(repository, /row\.notification_type \?\? row\.type/);
  assert.match(repository, /reportId: row\.report_id/);
  assert.match(repository, /actorName: String\(row\.actor_name \?\? 'Sistema'\)/);
  assert.match(repository, /notificationPage\(items, limit\)/);
  assert.doesNotMatch(repository, /get_unread_notification_count'|mark_notification_read'|mark_all_notifications_read'/);
});

test('new event copy is localized in pt-BR and en-US without changing legacy copy', () => {
  for (const key of ['reportReviewing','reportResolved','reportDismissed','contentArchived','contentRestored']) {
    assert.equal(translations.match(new RegExp(`notifications\\.event\\.${key}\\.title`, 'g'))?.length, 2);
    assert.equal(translations.match(new RegExp(`notifications\\.event\\.${key}\\.message`, 'g'))?.length, 2);
    assert.ok(presentation.includes(`notifications.event.${key}.title`));
  }
  assert.match(translations, /'notifications\.event\.reportResolved\.title':'Report resolved'/);
});

test('report notifications navigate to allowlisted content and unsupported report routes use not-found', () => {
  assert.ok(migration.includes("'/'||new.target_type||'s/'||new.target_id"));
  assert.doesNotMatch(navigation, /reports/);
  const uuid = '123e4567-e89b-12d3-a456-426614174000';
  assert.equal(pageFromHash(`#/problems/${uuid}`), `problema:${uuid}`);
  assert.equal(pageFromHash(`#/solutions/${uuid}`), `solucao:${uuid}`);
  assert.equal(pageFromHash(`#/reports/${uuid}`), 'not-found');
});

test('pagination distinguishes incomplete, exactly full and real next pages', () => {
  assert.deepEqual(notificationPage([1,2], 3), {items:[1,2],hasMore:false});
  assert.deepEqual(notificationPage([1,2,3], 3), {items:[1,2,3],hasMore:false});
  assert.deepEqual(notificationPage([1,2,3,4], 3), {items:[1,2,3],hasMore:true});
  assert.equal(notificationPage(Array.from({length:51}),50).items.length,50);
});

test('SQL assertions and CI cover behavior, isolation, rollback and concurrency', () => {
  for (const phrase of ['idempotency','rollback','isolation','pagination','concurrency','privacy']) assert.match(assertions, new RegExp(phrase, 'i'));
  assert.ok(workflow.includes('20260730130000_sprint44_in_app_notifications.sql'));
  assert.ok(workflow.includes('sprint44_notifications_assertions.sql'));
  assert.ok(workflow.includes('npm run test:sprint44'));
});

test('batch read assertion sequences mutation before observing unread state', () => {
  const batch = assertions.slice(assertions.indexOf('declare marked_count'), assertions.indexOf('reset role;', assertions.indexOf('declare marked_count')));
  assert.ok(batch.indexOf('mark_all_my_notifications_read() into marked_count') < batch.indexOf('get_my_unread_notification_count() into remaining_unread'));
  assert.doesNotMatch(batch, /mark_all_my_notifications_read\(\)[^;]*\bor\b[^;]*get_my_unread_notification_count\(\)/i);
  assert.match(batch, /batch mark failed: marked %, remaining %/);
});
