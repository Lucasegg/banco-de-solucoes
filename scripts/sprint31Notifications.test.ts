import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync('supabase/migrations/20260723110000_sprint31_notifications.sql', 'utf8');
const repository = readFileSync('src/repositories/notifications/NotificationRepository.ts', 'utf8');
const presentation = readFileSync('src/notifications/presentation.tsx', 'utf8');
const page = readFileSync('src/pages/Notifications.tsx', 'utf8');
const bell = readFileSync('src/components/notifications/NotificationBell.tsx', 'utf8');
const badge = readFileSync('src/components/notifications/NotificationBadge.tsx', 'utf8');

test('private RPC checks identity, owns rows, clamps pagination and keeps stable order', () => {
  assert.match(sql, /auth\.uid\(\) is null/i);
  assert.match(sql, /n\.recipient_id=auth\.uid\(\)/i);
  assert.match(sql, /least\(greatest\(coalesce\(p_limit,20\),1\),50\)/i);
  assert.match(sql, /offset greatest\(coalesce\(p_offset,0\),0\)/i);
  assert.match(sql, /order by n\.created_at desc,n\.id desc/i);
  assert.match(sql, /revoke all on function[\s\S]*?from public, anon/i);
  assert.match(sql, /revoke all on public\.notifications from anon/i);
});

test('repository delegates filtering and pagination to the private RPC without exposing metadata', () => {
  assert.match(repository, /p_type: filters\.category/);
  assert.match(repository, /Math\.min\(50/);
  assert.match(repository, /metadata: \{\}/);
  assert.doesNotMatch(repository, /\.from\('notifications'\)/);
});

test('safe navigation rejects executable and external URLs and accepts only known content routes', () => {
  assert.match(presentation, /!value\.startsWith\('\/'\)/);
  assert.match(presentation, /javascript\|data\|https?/i);
  assert.match(presentation, /\(problems\|solutions\|contributions\)/);
  assert.match(page, /await notifications\.markRead/);
  assert.match(bell, /safeNotificationActionUrl/);
});

test('accessible central has filters, loading, empty/error states, badge and no component data query', () => {
  assert.match(page, /NotificationFilters/);
  assert.match(page, /aria-live/);
  assert.match(page, /Você não possui novas notificações/);
  assert.match(badge, /99\+/);
  for (const source of [page, bell]) assert.doesNotMatch(source, /\.rpc\(/);
});
