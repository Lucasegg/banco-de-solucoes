import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('supabase/migrations/20260730130000_sprint44_in_app_notifications.sql', 'utf8');
const assertions = readFileSync('scripts/fixtures/sprint44_notifications_assertions.sql', 'utf8');
const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const repository = readFileSync('src/repositories/notifications/NotificationRepository.ts', 'utf8');

test('migration defines deterministic, private and idempotent persistence', () => {
  assert.match(migration, /notification_order bigint generated always as identity/);
  assert.match(migration, /event_key text[\s\S]*unique \(event_key\)/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /revoke insert, update, delete on table public\.notifications from authenticated/);
  assert.match(migration, /on conflict \(event_key\) do nothing/);
  assert.match(migration, /order by n\.notification_order desc/);
});

test('automatic events contain no administrative identities, notes or report metadata', () => {
  const triggerSection = migration.slice(migration.indexOf('create function public.notify_report_status_sprint44'));
  assert.doesNotMatch(triggerSection, /moderator_id|moderator_note/i);
  assert.match(triggerSection, /create_event_notification\(\s*new\.reporter_id/);
  assert.doesNotMatch(triggerSection, /jsonb_build_object/i);
  for (const type of ['report.reviewing','report.resolved','report.dismissed','content.archived','content.restored']) assert.ok(migration.includes(type));
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
  assert.doesNotMatch(repository, /get_unread_notification_count'|mark_notification_read'|mark_all_notifications_read'/);
});

test('SQL assertions and CI cover behavior, isolation, rollback and concurrency', () => {
  for (const phrase of ['idempotency','rollback','isolation','pagination','concurrency','privacy']) assert.match(assertions, new RegExp(phrase, 'i'));
  assert.ok(workflow.includes('20260730130000_sprint44_in_app_notifications.sql'));
  assert.ok(workflow.includes('sprint44_notifications_assertions.sql'));
  assert.ok(workflow.includes('npm run test:sprint44'));
});
