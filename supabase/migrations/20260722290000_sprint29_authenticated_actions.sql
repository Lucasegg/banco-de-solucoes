-- Sprint 29: database authority for authenticated mutations.
--
-- This migration was pending in production when corrected.  Do not replace the
-- catalogue-driven grants below with signatures inferred from application code:
-- a legitimate legacy deployment can have a missing RPC or a different overload.
begin;

do $$
declare
  required_table text;
begin
  foreach required_table in array array[
    'public.profiles', 'public.problems', 'public.solutions',
    'public.solution_problems', 'public.comments', 'public.comment_reports',
    'public.favorites', 'public.reactions', 'public.contributions',
    'public.contribution_audit', 'public.notifications',
    'public.problem_timeline', 'public.audit_events', 'storage.objects'
  ] loop
    if to_regclass(required_table) is null then
      raise exception 'Sprint 29 schema integrity failure: required table % is absent', required_table
        using errcode = '42P01';
    end if;
  end loop;
end $$;

-- Defense in depth: anon may read public catalog rows but can never mutate
-- application tables.  These tables are required by the preceding baseline.
revoke insert, update, delete on table public.profiles, public.problems, public.solutions, public.solution_problems, public.comments, public.comment_reports, public.favorites, public.reactions, public.contributions, public.contribution_audit, public.notifications, public.problem_timeline, public.audit_events from anon;
revoke insert, update, delete on table storage.objects from anon;

-- Resolve every existing overload by OID/regprocedure.  Client RPCs retain
-- authenticated EXECUTE; internal helpers remain inaccessible to clients.
do $$
declare
  fn record;
  client_rpcs constant text[] := array[
    'create_solution_with_problems', 'update_solution_with_problems',
    'report_comment', 'mark_comment_best_answer', 'moderate_comment_visibility',
    'review_contribution', 'publish_problem_update', 'mark_notification_read',
    'mark_all_notifications_read', 'update_user_role'
  ];
  internal_rpcs constant text[] := array['create_notification', 'write_audit_event'];
begin
  for fn in
    select p.proname, p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (client_rpcs || internal_rpcs)
  loop
    execute format('revoke all on function %s from public, anon', fn.signature);
    if fn.proname = any (client_rpcs) then
      execute format('grant execute on function %s to authenticated', fn.signature);
    else
      execute format('revoke all on function %s from authenticated', fn.signature);
    end if;
  end loop;
end $$;

-- Storage remains publicly readable under the existing select policy.  Bucket
-- names are intentionally checked in policy predicates so the policy remains
-- valid before a bucket is provisioned, while writes require the owner prefix.
drop policy if exists "Authenticated users upload own images" on storage.objects;
drop policy if exists "Authenticated users update own images" on storage.objects;
drop policy if exists "Authenticated users delete own images" on storage.objects;
create policy "Authenticated users upload own images" on storage.objects for insert to authenticated with check (bucket_id in ('avatars','problem-images','solution-images') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Authenticated users update own images" on storage.objects for update to authenticated using (bucket_id in ('avatars','problem-images','solution-images') and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id in ('avatars','problem-images','solution-images') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Authenticated users delete own images" on storage.objects for delete to authenticated using (bucket_id in ('avatars','problem-images','solution-images') and (storage.foldername(name))[1] = auth.uid()::text);
commit;
