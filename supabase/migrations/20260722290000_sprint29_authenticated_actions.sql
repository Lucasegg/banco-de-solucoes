-- Sprint 29: database authority for authenticated mutations. Existing migrations remain immutable.
begin;

-- Defense in depth: anon may read public catalog rows but can never mutate application tables.
revoke insert, update, delete on table public.profiles, public.problems, public.solutions, public.solution_problems, public.comments, public.comment_reports, public.favorites, public.reactions, public.contributions, public.contribution_audit, public.notifications, public.problem_timeline, public.audit_events from anon;
revoke insert, update, delete on table storage.objects from anon;

-- Explicitly remove PostgreSQL's default PUBLIC execute grant from every mutable RPC.
revoke all on function public.create_solution_with_problems(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text[],text[],uuid[]) from public, anon;
revoke all on function public.update_solution_with_problems(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text[],text[],uuid[]) from public, anon;
revoke all on function public.report_comment(uuid,text) from public, anon;
revoke all on function public.mark_comment_best_answer(uuid) from public, anon;
revoke all on function public.moderate_comment_visibility(uuid,text) from public, anon;
revoke all on function public.review_contribution(uuid,text,text) from public, anon;
revoke all on function public.publish_problem_update(uuid,text,text,text) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
revoke all on function public.update_user_role(uuid,text) from public, anon;
revoke all on function public.create_notification(uuid,text,text,text,text,uuid,text,jsonb,uuid) from public, anon;
revoke all on function public.write_audit_event(text,text,uuid,jsonb) from public, anon;

grant execute on function public.create_solution_with_problems(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text[],text[],uuid[]) to authenticated;
grant execute on function public.update_solution_with_problems(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text[],text[],uuid[]) to authenticated;
grant execute on function public.report_comment(uuid,text), public.mark_comment_best_answer(uuid), public.moderate_comment_visibility(uuid,text), public.review_contribution(uuid,text,text), public.publish_problem_update(uuid,text,text,text), public.mark_notification_read(uuid), public.mark_all_notifications_read(), public.update_user_role(uuid,text) to authenticated;

-- Storage remains publicly readable, while writes are scoped to the authenticated owner prefix.
drop policy if exists "Authenticated users upload own images" on storage.objects;
drop policy if exists "Authenticated users update own images" on storage.objects;
drop policy if exists "Authenticated users delete own images" on storage.objects;
create policy "Authenticated users upload own images" on storage.objects for insert to authenticated with check (bucket_id in ('avatars','problem-images','solution-images') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Authenticated users update own images" on storage.objects for update to authenticated using (bucket_id in ('avatars','problem-images','solution-images') and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id in ('avatars','problem-images','solution-images') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Authenticated users delete own images" on storage.objects for delete to authenticated using (bucket_id in ('avatars','problem-images','solution-images') and (storage.foldername(name))[1] = auth.uid()::text);
commit;
