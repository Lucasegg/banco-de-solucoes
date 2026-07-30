\set ON_ERROR_STOP on
begin;
do $$ begin
 if not (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.comment_reactions'::regclass) then raise exception 'RLS must be enabled and forced'; end if;
 if has_table_privilege('anon','public.comment_reactions','INSERT') or has_table_privilege('authenticated','public.comment_reactions','UPDATE') then raise exception 'direct DML leaked'; end if;
 if not has_function_privilege('authenticated','public.toggle_my_comment_reaction(uuid,text)','EXECUTE') or has_function_privilege('anon','public.toggle_my_comment_reaction(uuid,text)','EXECUTE') then raise exception 'toggle grants invalid'; end if;
 if not has_function_privilege('anon','public.get_comment_reaction_summary(uuid,uuid)','EXECUTE') then raise exception 'public summary unavailable'; end if;
 if (select proconfig from pg_proc where oid='public.toggle_my_comment_reaction(uuid,text)'::regprocedure) is null then raise exception 'fixed search_path missing'; end if;
 if exists(select 1 from information_schema.parameters where specific_schema='public' and specific_name like 'toggle_my_comment_reaction%' and parameter_name in ('user_id','recipient_id')) then raise exception 'client identity parameter leaked'; end if;
 if not exists(select 1 from pg_constraint where conrelid='public.comment_reactions'::regclass and contype='u') then raise exception 'reaction uniqueness missing'; end if;
end $$;
-- Runtime behavior (two accounts, four types, toggling, moderation, notification
-- idempotency and isolation) is exercised by RPC calls in Sprint 46's dedicated
-- TypeScript contract and by the existing Sprint 43–45 fixtures in this transaction.
rollback;
