import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const migration = readFileSync('supabase/migrations/20260717262000_hotfix26_2_reconcile_legacy_schema.sql', 'utf8');
const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const audit = readFileSync('scripts/auditLegacySchema.ts', 'utf8');
test('reconciliation is additive and idempotent', () => {
 assert.doesNotMatch(migration, /\b(drop\s+table|truncate)\b/i);
 assert.match(migration, /add column if not exists/i); assert.match(migration, /create index if not exists/i);
 assert.match(migration, /pg_constraint/); assert.match(migration, /pg_policies/);
});
test('critical legacy objects and map permissions are covered', () => {
 for (const object of ['useful', 'liked', 'interesting', 'contribution_type', 'reviewing', 'contribution_audit', 'action text', 'message text', 'action_url', 'get_reaction_summary', 'review_contribution', 'create_notification', 'record_problem_timeline_sprint24']) assert.match(migration, new RegExp(object));
});
test('automation cannot force legacy migrations or repair history', () => {
 assert.doesNotMatch(workflow, /--include-all/i); assert.doesNotMatch(workflow, /run:\s+.*migration\s+repair/i); assert.match(workflow, /run:\s+.*\bdb push\b/i);
});
test('audit neither logs credentials nor exposes a frontend service role', () => {
 assert.match(audit, /SUPABASE_SERVICE_ROLE_KEY/); assert.doesNotMatch(audit, /console\.(log|error)\(`[^`]*\$\{key\}/i);
 const source = readFileSync('src/lib/supabase.ts', 'utf8'); assert.doesNotMatch(source, /SERVICE_ROLE/);
});
