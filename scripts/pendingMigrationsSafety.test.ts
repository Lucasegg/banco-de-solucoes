import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const migrationsDirectory = path.resolve('supabase/migrations');
const remoteBaseline = '20260717260000';
const sprint29 = '20260722290000_sprint29_authenticated_actions.sql';
const authorshipHotfix = '20260722300000_hotfix_favorites_authorship.sql';
const sprint30 = '20260723100000_sprint30_collaborative_contributions.sql';
const sprint31 = '20260723110000_sprint31_notifications.sql';
const sprint32 = '20260723120000_sprint32_advanced_search.sql';
const auditedRpcs = new Set([
  'create_solution_with_problems', 'update_solution_with_problems', 'report_comment',
  'mark_comment_best_answer', 'moderate_comment_visibility', 'review_contribution',
  'publish_problem_update', 'mark_notification_read', 'mark_all_notifications_read',
  'update_user_role', 'create_notification', 'write_audit_event',
]);
const appliedChecksums: Record<string, string> = {
  // Last migration known applied by the documented remote baseline.  This makes
  // an accidental edit to the pre-Sprint-29 history a review-blocking failure.
  '20260717260000_sprint26_system_health.sql': '680cc883ebe9bbdfbfb2b1f3792eeb07271764dcc83d1301394a38fc512f5316',
};

function files() {
  return readdirSync(migrationsDirectory).filter((file) => /^\d{14}_.+\.sql$/.test(file)).sort();
}
function version(file: string) { return file.slice(0, 14); }
function contents(file: string) { return readFileSync(path.join(migrationsDirectory, file), 'utf8'); }
function sha256(file: string) { return createHash('sha256').update(contents(file)).digest('hex'); }

test('pending migrations are ordered, transactional, and do not self-mark history', () => {
  const all = files();
  assert.deepEqual(all, [...all].sort(), 'migration filenames must be chronological');
  const pending = all.filter((file) => version(file) > remoteBaseline);
  assert.deepEqual(pending, [sprint29, authorshipHotfix, sprint30, sprint31, sprint32], 'documented remote baseline must leave pending migrations in order');
  for (const file of pending) {
    const sql = contents(file).trim().toLowerCase();
    assert.match(sql, /^--[\s\S]*?\bbegin\s*;/, `${file} must begin a transaction`);
    assert.match(sql, /\bcommit\s*;\s*$/, `${file} must commit its transaction`);
    assert.doesNotMatch(sql, /service_role/, `${file} must not introduce service role access`);
    assert.doesNotMatch(sql, /migration repair|schema_migrations|supabase_migrations/, `${file} must not mark itself applied`);
  }
});

test('pending migrations never use a rigid audited RPC signature unless created there with justification', () => {
  for (const file of files().filter((item) => version(item) > remoteBaseline)) {
    const sql = contents(file);
    const rigid = /(?:revoke|grant|alter|drop)\s+[\s\S]{0,80}?\bon\s+function\s+public\.([a-z_]+)\s*\([^;]*\)/gi;
    for (const match of sql.matchAll(rigid)) {
      const name = match[1];
      if (!auditedRpcs.has(name)) continue;
      const createsSameFunction = new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\s*\\(`, 'i').test(sql);
      assert.ok(createsSameFunction && /fixed signature justification/i.test(sql), `${file} rigidly references audited RPC ${name} without same-migration creation and justification`);
    }
  }
});

test('Sprint 29 resolves grants through pg_proc and regprocedure and keeps helpers internal', () => {
  const sql = contents(sprint29);
  assert.match(sql, /pg_proc/i);
  assert.match(sql, /pg_namespace/i);
  assert.match(sql, /oid::regprocedure/i);
  assert.match(sql, /format\s*\(/i);
  assert.match(sql, /internal_rpcs[\s\S]*create_notification[\s\S]*write_audit_event/i);
  assert.match(sql, /revoke all on function %s from authenticated/i);
});

test('previously applied baseline migration is unchanged', () => {
  for (const [file, expected] of Object.entries(appliedChecksums)) assert.equal(sha256(file), expected, `${file} checksum changed`);
});
