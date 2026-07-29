\set ON_ERROR_STOP on
do $$ begin
 if not (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.legal_acceptances'::regclass) then raise exception 'RLS is not forced'; end if;
 if has_table_privilege('authenticated','public.legal_acceptances','INSERT') or has_table_privilege('authenticated','public.legal_acceptances','UPDATE') or has_table_privilege('authenticated','public.legal_acceptances','DELETE') then raise exception 'append-only grants violated'; end if;
 if has_function_privilege('anon','public.accept_current_legal_documents(text)','EXECUTE') or has_function_privilege('anon','public.get_my_legal_consent_status()','EXECUTE') then raise exception 'anonymous grant found'; end if;
 if (select proconfig from pg_proc where oid='public.accept_current_legal_documents(text)'::regprocedure) <> array['search_path=public, pg_catalog'] then raise exception 'unsafe accept search_path'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
select public.accept_current_legal_documents('pt-BR'); select public.accept_current_legal_documents('pt-BR');
do $$ begin if (select count(*) from public.legal_acceptances) <> 2 then raise exception 'acceptance must be atomic and idempotent'; end if; end $$;
do $$ begin begin perform public.accept_current_legal_documents('es-ES'); raise exception 'invalid locale accepted'; exception when sqlstate '22023' then null; end; end $$;
reset role;
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='legal_acceptances' and column_name in ('ip','ip_address','user_agent','token','session','session_id')) then raise exception 'unnecessary sensitive column'; end if;
end $$;
