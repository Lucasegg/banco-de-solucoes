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

test('direct updates never bypass lifecycle protection based on a role', () => {
  const guard = sql.slice(sql.indexOf('create or replace function public.guard_contribution_author_update_sprint30'), sql.indexOf('drop trigger if exists guard_contribution_author_update_sprint30'));
  assert.doesNotMatch(guard, /is_contribution_moderator/i);
  assert.match(guard, /current_setting\('app\.contribution_rpc_write', true\) = 'true'/i);
  assert.match(guard, /old\.user_id <> auth\.uid\(\)/i);
  assert.match(guard, /old\.status not in \('pending','changes_requested'\)/i);
  assert.match(guard, /to_jsonb\(new\) - array\['payload','updated_at'\]/i);
  assert.match(guard, /to_jsonb\(old\) - array\['payload','updated_at'\]/i);
  assert.match(guard, /raise exception 'Not authorized'/i);
});

test('only the local RPC marker permits protected status and moderation updates', () => {
  const withdrawal = sql.slice(sql.indexOf('create or replace function public.withdraw_contribution'), sql.indexOf('create or replace function public.is_valid_contribution_payload_sprint30'));
  const review = sql.slice(sql.indexOf('create or replace function public.review_contribution'), sql.indexOf('alter table public.notifications'));
  for (const rpc of [withdrawal, review]) assert.match(rpc, /perform set_config\('app\.contribution_rpc_write', 'true', true\)/i);
  assert.match(review, /not public\.is_contribution_moderator\(\)/i);
  assert.match(withdrawal, /user_id=auth\.uid\(\) and status in \('pending','changes_requested'\)/i);
  assert.match(review, /update public\.contributions set status=p_status/i);
  assert.doesNotMatch(sql, /p_contribution_rpc_write|p_rpc_write|contribution_rpc_write text/i);
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
