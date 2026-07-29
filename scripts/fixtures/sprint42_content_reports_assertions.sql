-- Sprint 42 assertions run after the canonical Sprint 35 taxonomy fixture.
do $$
declare fn text;
begin
  if to_regclass('public.content_reports') is null then raise exception 'content_reports missing'; end if;
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.content_reports'::regclass) then raise exception 'RLS must be enabled and forced'; end if;
  foreach fn in array array['report_content(text,uuid,text,text)','get_my_content_reports()','get_admin_content_reports(text,text,text,integer,integer)','moderate_content_report(uuid,text,text)'] loop
    if has_function_privilege('anon','public.'||fn,'execute') then raise exception 'anon can execute %',fn; end if;
    if not has_function_privilege('authenticated','public.'||fn,'execute') then raise exception 'authenticated cannot execute %',fn; end if;
    if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.oid=('public.'||fn)::regprocedure and 'search_path=pg_catalog, public'=any(p.proconfig)) then raise exception 'unsafe search_path on %',fn; end if;
  end loop;
  if has_table_privilege('anon','public.content_reports','select,insert,update,delete') or has_table_privilege('authenticated','public.content_reports','select,insert,update,delete') then raise exception 'direct table privilege exposed'; end if;
  if pg_get_function_result('public.get_my_content_reports()'::regprocedure) ~ '(reporter_id|moderator_id|moderator_note)' then raise exception 'private field in user result'; end if;
  if pg_get_function_result('public.get_admin_content_reports(text,text,text,integer,integer)'::regprocedure) ~ '(reporter_id|moderator_id)' then raise exception 'identity in admin result'; end if;
end $$;

set role anon;
do $$ begin
  begin perform * from public.content_reports; raise exception 'anon SELECT accepted'; exception when insufficient_privilege then null; end;
  begin perform public.get_my_content_reports(); raise exception 'anon RPC accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;

insert into public.profiles(id,role) values
('42000000-0000-0000-0000-000000000001','member'),
('42000000-0000-0000-0000-000000000002','member'),
('42000000-0000-0000-0000-000000000099','admin');
insert into public.problems(id,author_id,title,description,category,city,state,status,created_at) values
('42000000-0000-0000-0001-000000000001','42000000-0000-0000-0000-000000000002','Problema de B','Visível','Infraestrutura','Cidade','UF','Reportado','2026-07-29 10:00Z'),
('42000000-0000-0000-0001-000000000002','42000000-0000-0000-0000-000000000001','Problema de A','Visível','Infraestrutura','Cidade','UF','Reportado','2026-07-29 10:01Z'),
('42000000-0000-0000-0001-000000000003','42000000-0000-0000-0000-000000000002','Problema arquivado','Arquivado','Infraestrutura','Cidade','UF','Arquivado','2026-07-29 10:02Z');
insert into public.solutions(id,author_id,title,summary,description,category,organization,status,impact_metric,created_at) values
('42000000-0000-0000-0002-000000000001','42000000-0000-0000-0000-000000000002','Solução de B','Resumo','Visível','Infraestrutura','Organização','Proposta','Métrica','2026-07-29 10:03Z'),
('42000000-0000-0000-0002-000000000002','42000000-0000-0000-0000-000000000002','Solução arquivada','Resumo','Arquivada','Infraestrutura','Organização','Arquivada','Métrica','2026-07-29 10:04Z');

set role authenticated;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',false);
do $$ begin
  begin perform * from public.content_reports; raise exception 'authenticated SELECT accepted'; exception when insufficient_privilege then null; end;
  begin insert into public.content_reports(reporter_id,target_type,target_id,reason) values(auth.uid(),'problem',gen_random_uuid(),'spam'); raise exception 'direct INSERT accepted'; exception when insufficient_privilege then null; end;
  begin update public.content_reports set status='dismissed'; raise exception 'direct UPDATE accepted'; exception when insufficient_privilege then null; end;
  begin delete from public.content_reports; raise exception 'direct DELETE accepted'; exception when insufficient_privilege then null; end;
  begin perform public.get_admin_content_reports(); raise exception 'member admin listing accepted'; exception when insufficient_privilege then null; end;
  begin perform public.moderate_content_report(gen_random_uuid(),'resolved',null); raise exception 'member moderation accepted'; exception when insufficient_privilege then null; end;
end $$;

select id from public.report_content('problem','42000000-0000-0000-0001-000000000001','spam',null);
select id from public.report_content('problem','42000000-0000-0000-0001-000000000001','spam','ignored by idempotency');
select id from public.report_content('solution','42000000-0000-0000-0002-000000000001','other','Detalhes necessários');
do $$ begin
  if (select count(*) from public.get_my_content_reports())<>2 then raise exception 'active report idempotency failed'; end if;
  begin perform public.report_content('problem','42000000-0000-0000-0001-000000000002','spam',null);raise exception 'self report accepted';exception when insufficient_privilege then null;end;
  begin perform public.report_content('problem','42000000-0000-0000-0001-000000000099','spam',null);raise exception 'missing target accepted';exception when no_data_found then null;end;
  begin perform public.report_content('problem','42000000-0000-0000-0001-000000000003','spam',null);raise exception 'archived problem accepted';exception when no_data_found then null;end;
  begin perform public.report_content('solution','42000000-0000-0000-0002-000000000002','spam',null);raise exception 'archived solution accepted';exception when no_data_found then null;end;
  begin perform public.report_content('user','42000000-0000-0000-0001-000000000001','spam',null);raise exception 'invalid type accepted';exception when invalid_parameter_value then null;end;
  begin perform public.report_content('problem','42000000-0000-0000-0001-000000000001','invalid',null);raise exception 'invalid reason accepted';exception when invalid_parameter_value then null;end;
  begin perform public.report_content('problem','42000000-0000-0000-0001-000000000001','other',null);raise exception 'other without description accepted';exception when invalid_parameter_value then null;end;
  begin perform public.report_content('problem','42000000-0000-0000-0001-000000000001','spam',repeat('x',1001));raise exception 'long description accepted';exception when invalid_parameter_value then null;end;
end $$;

select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000002',false);
do $$ begin if exists(select 1 from public.get_my_content_reports()) then raise exception 'user B sees user A reports';end if;end $$;

select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',false);
do $$
declare first_row record; second_row record; problem_report uuid; solution_report uuid;
begin
  if (select count(*) from public.get_admin_content_reports())<>2 then raise exception 'admin queue failed';end if;
  select * into first_row from public.get_admin_content_reports(null,null,null,1,0);
  select * into second_row from public.get_admin_content_reports(null,null,null,1,1);
  if first_row.id=second_row.id or (first_row.created_at,first_row.id)>(second_row.created_at,second_row.id) then raise exception 'pagination is not deterministic';end if;
  select id into problem_report from public.get_admin_content_reports('open','problem','spam',25,0);
  select id into solution_report from public.get_admin_content_reports('open','solution','other',25,0);
  if problem_report is null or solution_report is null then raise exception 'filters failed';end if;
  perform public.moderate_content_report(problem_report,'reviewing','Em análise');
  if not exists(select 1 from public.get_admin_content_reports('reviewing','problem','spam',25,0) where id=problem_report and reviewed_at is null) then raise exception 'open to reviewing failed';end if;
  perform public.moderate_content_report(problem_report,'resolved','Resolvida');
  perform public.moderate_content_report(solution_report,'dismissed','Descartada');
  if not exists(select 1 from public.get_admin_content_reports('resolved','problem','spam',25,0) where id=problem_report and reviewed_at is not null) then raise exception 'reviewing to resolved failed';end if;
  if not exists(select 1 from public.get_admin_content_reports('dismissed','solution','other',25,0) where id=solution_report and reviewed_at is not null) then raise exception 'open to dismissed failed';end if;
  begin perform public.moderate_content_report(problem_report,'dismissed',null);raise exception 'final report changed';exception when check_violation then null;end;
  begin perform public.moderate_content_report(solution_report,'resolved',repeat('x',2001));raise exception 'long note accepted';exception when invalid_parameter_value then null;end;
end $$;
reset role;

do $$ begin
  if exists(select 1 from public.content_reports where status='reviewing' and reviewed_at is not null) then raise exception 'reviewed_at set before final state';end if;
  if (select count(*) from public.content_reports where moderator_id='42000000-0000-0000-0000-000000000099' and reviewed_at is not null)<>2 then raise exception 'moderator identity or reviewed_at not server-derived';end if;
  if (select count(*) from public.content_reports)<>2 then raise exception 'history count changed';end if;
end $$;
