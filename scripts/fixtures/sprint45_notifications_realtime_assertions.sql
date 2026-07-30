-- Behavioral/security assertions run after Sprint 45 migration.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then raise exception 'Realtime publication missing'; end if;
  if has_table_privilege('anon','public.notification_preferences','SELECT') or has_table_privilege('authenticated','public.notification_preferences','INSERT,UPDATE,DELETE') then raise exception 'preference grants too broad'; end if;
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.notification_preferences'::regclass) then raise exception 'preference RLS is not forced'; end if;
  if to_regprocedure('public.update_my_notification_preferences(boolean,boolean,boolean)') is null or to_regprocedure('public.delete_my_old_read_notifications()') is null then raise exception 'Sprint 45 RPC missing'; end if;
end $$;

-- Every behavioral RPC derives the account from auth.uid(); there is no recipient argument.
do $$ declare definition text; begin
  select pg_get_functiondef('public.delete_my_old_read_notifications()'::regprocedure) into definition;
  if definition not like '%auth.uid()%' or definition like '%p_recipient_id%' or definition not like '%read_at is not null%' or definition not like '%30 days%' then raise exception 'unsafe cleanup definition'; end if;
end $$;
