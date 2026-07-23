import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync('supabase/migrations/20260723100000_sprint30_collaborative_contributions.sql', 'utf8');
const repository = readFileSync('src/repositories/contributions/ContributionRepository.ts', 'utf8');

test('withdrawal is status-based and never deletes contributions', () => {
  assert.match(sql, /withdraw_contribution[\s\S]*?set status='withdrawn'/i);
  assert.match(sql, /revoke delete on table public\.contributions from authenticated/i);
  assert.doesNotMatch(sql, /create policy "Authors delete editable contributions"/i);
  assert.doesNotMatch(repository, /\.from\('contributions'\)\.delete\(/i);
  assert.match(sql, /audit_contribution_write_sprint30[\s\S]*?action.*withdrawn/i);
});

test('only the RPC can modify moderation state', () => {
  assert.match(sql, /create policy "Authors update editable contributions"[\s\S]*?with check \(user_id=auth\.uid\(\) and status in \('pending','changes_requested'\)\)/i);
  assert.match(sql, /guard_contribution_author_update_sprint30[\s\S]*?new\.status <> old\.status[\s\S]*?new\.moderator_id is distinct from old\.moderator_id/i);
  assert.match(sql, /review_contribution[\s\S]*?update public\.contributions set status=p_status/i);
});

test('review validates every payload change before applying it', () => {
  assert.match(sql, /is_valid_contribution_payload_sprint30/i);
  assert.match(sql, /jsonb_object_keys\(p_payload\)/i);
  assert.match(sql, /field_name is null or not field_name=any\(allowed\)/i);
  assert.match(sql, /jsonb_typeof\(item->'proposedValue'\)/i);
  assert.match(sql, /Unable to process contribution/i);
});

test('all legacy values are normalized before constraints are replaced', () => {
  const normalize = sql.indexOf('update public.contributions set status=case');
  const constraint = sql.indexOf('add constraint contributions_status_check');
  assert.ok(normalize >= 0 && normalize < constraint);
  assert.match(sql, /else 'pending' end/i);
  assert.match(sql, /else 'other' end/i);
});
