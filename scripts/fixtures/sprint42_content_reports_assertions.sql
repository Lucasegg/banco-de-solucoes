do $$ begin
  if to_regclass('public.content_reports') is null then raise exception 'content_reports missing'; end if;
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.content_reports'::regclass) then raise exception 'RLS must be enabled and forced'; end if;
  if has_table_privilege('anon','public.content_reports','insert,update,delete') or has_table_privilege('authenticated','public.content_reports','insert,update,delete') then raise exception 'direct DML exposed'; end if;
  if has_function_privilege('anon','public.report_content(text,uuid,text,text)','execute') then raise exception 'anon report RPC exposed'; end if;
  if not has_function_privilege('authenticated','public.report_content(text,uuid,text,text)','execute') then raise exception 'authenticated report RPC missing'; end if;
  if (select proconfig from pg_proc where oid='public.report_content(text,uuid,text,text)'::regprocedure)::text not like '%search_path=pg_catalog, public%' then raise exception 'unsafe search_path'; end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and indexname='content_reports_one_active_per_reporter_target_idx') then raise exception 'idempotency index missing'; end if;
end $$;

insert into public.profiles(id,role) values
('42000000-0000-0000-0000-000000000001','member'),('42000000-0000-0000-0000-000000000002','member'),('42000000-0000-0000-0000-000000000099','admin');
insert into public.problems(id,author_id,title,description,category,city,state,status) values
('42000000-0000-0000-0001-000000000001','42000000-0000-0000-0000-000000000002','Alvo Sprint 42','Visível','Teste','Cidade','UF','Reportado'),
('42000000-0000-0000-0001-000000000002','42000000-0000-0000-0000-000000000001','Próprio','Visível','Teste','Cidade','UF','Reportado');

set role authenticated;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',false);
select id from public.report_content('problem','42000000-0000-0000-0001-000000000001','spam',null);
select id from public.report_content('problem','42000000-0000-0000-0001-000000000001','spam',null);
do $$ begin
  if (select count(*) from public.get_my_content_reports()) <> 1 then raise exception 'idempotency or own list failed'; end if;
  begin perform public.report_content('problem','42000000-0000-0000-0001-000000000099','spam',null); raise exception 'missing target accepted'; exception when no_data_found then null; end;
  begin perform public.report_content('comment','42000000-0000-0000-0001-000000000001','spam',null); raise exception 'invalid type accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.report_content('problem','42000000-0000-0000-0001-000000000001','bad',null); raise exception 'invalid reason accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.report_content('problem','42000000-0000-0000-0001-000000000002','spam',null); raise exception 'own target accepted'; exception when insufficient_privilege then null; end;
  begin perform public.moderate_content_report((select id from public.get_my_content_reports() limit 1),'resolved',null); raise exception 'member moderation accepted'; exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000002',false);
do $$ begin if exists(select 1 from public.get_my_content_reports()) then raise exception 'cross-user leak'; end if; end $$;

select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',false);
do $$ declare v_id uuid; begin
  select id into v_id from public.get_admin_content_reports('open',null,null,25,0) limit 1;
  if v_id is null then raise exception 'admin queue failed'; end if;
  perform public.moderate_content_report(v_id,'resolved','reviewed');
  if not exists(select 1 from public.get_admin_content_reports('resolved',null,null,25,0) r where r.id=v_id and r.reviewed_at is not null) then raise exception 'moderation server fields failed'; end if;
  begin perform public.moderate_content_report(v_id,'dismissed',null); raise exception 'final transition accepted'; exception when check_violation then null; end;
end $$;
reset role;
