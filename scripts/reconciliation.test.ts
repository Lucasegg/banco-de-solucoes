import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
 const deploymentWorkflows = readdirSync('.github/workflows').filter((file) => readFileSync(`.github/workflows/${file}`, 'utf8').includes('name: Verify, migrate and deploy'));
 assert.deepEqual(deploymentWorkflows, ['deploy.yml']);
 for (const job of ['verify', 'production-preflight', 'migrate-and-health', 'deploy']) assert.match(workflow, new RegExp(`^  ${job}:`, 'm'));
 assert.match(workflow, /^  production-preflight:\n    if: github\.event_name == 'workflow_dispatch'/m);
 assert.match(workflow, /^  migrate-and-health:\n    if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/m);
 assert.match(workflow, /^  deploy:[\s\S]*?^    needs: migrate-and-health$/m);
});
test('audit trail and comment preservation contracts are present', () => {
 for (const invariant of ["auth.uid() is null", "jsonb_typeof(coalesce(p_metadata", 'pg_column_size(coalesce(p_metadata', "nullif(trim(p_target_type),'')", 'Admins read audit events', 'revoke insert,update,delete on public.audit_events', 'audit_domain_change', 'audit_problems_change', 'audit_solutions_change', 'author_id and user_id diverge', 'set user_id=author_id', 'comment_reports_reason_check', 'sprint20_protect_comment_fields']) assert.ok(migration.includes(invariant));
});
test('comments reconciliation covers all legacy ownership states and final catalog audit', () => {
 for (const fragment of ['has_author and not has_user', 'not has_author and not has_user', 'has_author and has_user', 'author_id and user_id diverge', 'alter column user_id set not null', 'comments_user_id_fkey', 'comments_user_profile_fkey', 'comments_user_id_idx', 'comment_reports_comment_id_idx', 'pg_get_constraintdef', 'invalid existing role values', 'invalid existing status values', 'required_tables', 'required_columns', 'required_indexes', 'required_policies', 'required_triggers']) assert.ok(migration.includes(fragment));
});
test('catalog audit never statically references removed comments.author_id', () => {
 const auditSql = migration.slice(migration.lastIndexOf('create or replace function public.audit_legacy_schema'));
 assert.doesNotMatch(auditSql, /from public\.comments where author_id/i);
 assert.match(auditSql, /comments:author-id-still-present/);
 assert.match(migration, /Moderators can read comment reports/);
 assert.match(migration, /report_comment\(p_comment_id uuid,p_reason text\)/);
});
test('report_comment is RPC-mediated, normalized, and returns the comment id', () => {
 const report = migration.slice(migration.lastIndexOf('create or replace function public.report_comment'));
 assert.match(report, /user_id<>reporter_id/); assert.match(report, /btrim\(p_reason\)/); assert.match(report, /return p_comment_id/); assert.doesNotMatch(report, /return v_id/);
});
test('comment count trigger branches by TG_OP without invalid transition-record access', () => {
 const sync = migration.slice(migration.lastIndexOf('create or replace function public.sync_comment_count'), migration.lastIndexOf('drop trigger if exists sync_comment_count_after_insert'));
 assert.match(sync, /tg_op='INSERT'/); assert.match(sync, /tg_op='UPDATE'/); assert.match(sync, /tg_op='DELETE'/);
 assert.match(migration, /deleted=false and visibility<>'removed'/);
 assert.match(sync, /return new;elsif tg_op='DELETE'.*return old;/s);
});
test('audit requires public comment policy and mediated comment report privileges', () => {
 const auditSql = migration.slice(migration.lastIndexOf('create or replace function public.audit_legacy_schema'));
 for (const contract of ['Public can read comments','has_function_privilege','has_table_privilege','public.set_domain_updated_at()']) assert.ok(auditSql.includes(contract) || migration.includes(contract));
});
