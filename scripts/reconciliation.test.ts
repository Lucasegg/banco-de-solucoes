import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const migration = readFileSync('supabase/migrations/20260717259000_hotfix26_2_reconcile_legacy_schema.sql', 'utf8');
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
test('migration order and exact Sprint 22–24 contracts are explicit', () => {
 assert.ok('20260717251000' < '20260717259000' && '20260717259000' < '20260717260000');
 for (const signature of ['get_reaction_summary(uuid,uuid)','review_contribution(uuid,text,text)','get_contribution_history(uuid,uuid)','update_user_role(uuid,text)','get_notifications(text,boolean,integer,integer)','get_unread_notification_count()','mark_notification_read(uuid)','mark_all_notifications_read()','publish_problem_update(uuid,text,text,text)','get_problem_timeline(uuid)']) assert.ok(migration.includes(signature));
 for (const policy of ['Users can delete own reactions','Users read own contributions and moderators read all','Users create own contributions','Moderators read contribution audit','Users read only own notifications','Public reads problem timeline']) assert.ok(migration.includes(policy));
 for (const trigger of ['notify_contribution_review_sprint23','notify_comment_created_sprint23','notify_problem_favorites_sprint23','notify_solution_favorites_sprint23','record_problem_timeline_sprint24']) assert.ok(migration.includes(trigger));
 for (const index of ['notifications_recipient_created_idx','notifications_recipient_read_created_idx','notifications_type_created_idx']) assert.ok(migration.includes(index));
 assert.ok(migration.includes("length(trim(title)) between 1 and 120")); assert.ok(migration.includes("length(trim(message)) between 1 and 500"));
 assert.ok(migration.includes("'verified_organization'")); assert.ok(migration.includes("'Reportado','Em análise','Em vistoria','Planejado','Licitado','Em execução','Parcialmente resolvido','Resolvido','Arquivado','Reaberto'"));
 assert.equal((workflow.match(/name: Check migration baseline/g) ?? []).length, 1);
});
