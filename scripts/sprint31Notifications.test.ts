import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync('supabase/migrations/20260723110000_sprint31_notifications.sql', 'utf8');
const repository = readFileSync('src/repositories/notifications/NotificationRepository.ts', 'utf8');
const presentation = readFileSync('src/notifications/presentation.tsx', 'utf8');
const page = readFileSync('src/pages/Notifications.tsx', 'utf8');
const bell = readFileSync('src/components/notifications/NotificationBell.tsx', 'utf8');
const badge = readFileSync('src/components/notifications/NotificationBadge.tsx', 'utf8');

test('legacy technical type contract and new category RPC coexist', () => {
  assert.doesNotMatch(sql, /create or replace function public\.get_notifications\(/i);
  assert.match(sql, /get_notifications_page\(p_category text/i);
  assert.match(sql, /legacy get_notifications\(p_type/i);
  assert.match(sql, /p_category/i);
});

test('all private RPCs are audited and own notification rows', () => {
  for (const name of ['get_notifications', 'get_unread_notification_count', 'mark_notification_read', 'mark_all_notifications_read', 'create_notification']) assert.match(sql, new RegExp(`'${name}'`));
  assert.match(sql, /pg_proc/i);
  assert.match(sql, /auth\.uid\(\) is null/i);
  assert.match(sql, /n\.recipient_id=auth\.uid\(\)/i);
  assert.match(sql, /revoke all on function[\s\S]*?from public, anon/i);
  assert.match(sql, /create_notification[\s\S]*?revoke all on function %s from authenticated/i);
  assert.match(sql, /revoke all on public\.notifications from anon/i);
});

test('server pagination uses one extra row and stable bounded ordering', () => {
  assert.match(sql, /least\(greatest\(coalesce\(p_limit,20\),1\),50\) \+ 1/i);
  assert.match(sql, /offset greatest\(coalesce\(p_offset,0\),0\)/i);
  assert.match(sql, /order by n\.created_at desc,n\.id desc/i);
  assert.match(repository, /get_notifications_page/);
  assert.match(repository, /items: items\.slice\(0, limit\), hasMore: items\.length > limit/);
  assert.doesNotMatch(repository, /items\.length === limit/);
});

test('safe navigation permits only canonical internal UUID paths', () => {
  assert.match(presentation, /\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/i);
  assert.match(presentation, /\^\/\(\?:problems\|solutions\|contributions\)/);
  assert.match(presentation, /\[\\\\\\x00-\\x1f\\x7f\?#\]/);
  assert.match(presentation, /value === '\/profile'/);
  assert.match(page, /await notifications\.markRead/);
  assert.match(page, /notificationMessages\.unavailable/);
});

test('components stay repository-driven and accessible', () => {
  assert.match(page, /NotificationFilters/);
  assert.match(page, /role="status" aria-live="polite"/);
  assert.match(page, /Você não possui novas notificações/);
  assert.match(badge, /99\+/);
  for (const source of [page, bell]) assert.doesNotMatch(source, /\.rpc\(|\.from\(/);
});
