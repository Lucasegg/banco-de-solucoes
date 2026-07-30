-- Sprint 43 behavioral, privilege, immutability, rollback and real-concurrency assertions.
do $$ declare fn text; begin
 if to_regclass('public.content_moderation_actions') is null then raise exception 'moderation audit missing';end if;
 if not(select c.relrowsecurity and c.relforcerowsecurity from pg_class c where c.oid='public.content_moderation_actions'::regclass) then raise exception 'RLS not forced';end if;
 foreach fn in array array['moderate_reported_content(text,uuid,text,text,text,uuid)','get_content_moderation_state(text,uuid)','get_content_moderation_history(text,uuid)'] loop
  if has_function_privilege('anon','public.'||fn,'execute') or not has_function_privilege('authenticated','public.'||fn,'execute') then raise exception 'bad RPC grants: %',fn;end if;
  if not exists(select 1 from pg_proc p where p.oid=('public.'||fn)::regprocedure and p.prosecdef and 'search_path=pg_catalog, public'=any(p.proconfig)) then raise exception 'unsafe RPC: %',fn;end if;
 end loop;
 if has_table_privilege('anon','public.content_moderation_actions','select,insert,update,delete') or has_table_privilege('authenticated','public.content_moderation_actions','select,insert,update,delete') then raise exception 'direct DML exposed';end if;
 if pg_get_function_result('public.get_content_moderation_history(text,uuid)'::regprocedure)~'moderator_id' then raise exception 'moderator identity exposed';end if;
end $$;

set role anon;
do $$ begin
 begin perform public.get_content_moderation_history('problem',gen_random_uuid());raise exception 'anon history accepted';exception when insufficient_privilege then null;end;
 begin perform public.moderate_reported_content('problem',gen_random_uuid(),'archive','x');raise exception 'anon moderation accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',false);
do $$ begin
 begin perform public.get_content_moderation_history('problem',gen_random_uuid());raise exception 'member history accepted';exception when insufficient_privilege then null;end;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','x');raise exception 'member moderation accepted';exception when insufficient_privilege then null;end;
 begin perform * from public.content_moderation_actions;raise exception 'direct SELECT accepted';exception when insufficient_privilege then null;end;
 begin insert into public.content_moderation_actions(target_type,target_id,moderator_id,action,reason,previous_status,resulting_status)values('problem',gen_random_uuid(),auth.uid(),'archive','x','Reportado','Arquivado');raise exception 'direct INSERT accepted';exception when insufficient_privilege then null;end;
 begin update public.content_moderation_actions set reason='x';raise exception 'direct UPDATE accepted';exception when insufficient_privilege then null;end;
 begin delete from public.content_moderation_actions;raise exception 'direct DELETE accepted';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',false);
do $$ declare v_report_id uuid;v_report_status text;begin
 select r.id,r.status into v_report_id,v_report_status from public.content_reports r where r.target_type='problem' and r.target_id='42000000-0000-0000-0001-000000000001';
 perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','Violação confirmada','Nota',v_report_id);
 if (select p.status from public.problems p where p.id='42000000-0000-0000-0001-000000000001')<>'Arquivado' then raise exception 'problem not archived';end if;
 if (select r.status from public.content_reports r where r.id=v_report_id)<>v_report_status then raise exception 'report silently changed';end if;
 if (select s.current_status from public.get_content_moderation_state('problem','42000000-0000-0000-0001-000000000001') s)<>'Arquivado' then raise exception 'state RPC differs from problem';end if;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','again');raise exception 'duplicate archive accepted';exception when check_violation then null;end;
 perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','restore','Revisão concluída',null,v_report_id);
 if (select p.status from public.problems p where p.id='42000000-0000-0000-0001-000000000001')<>'Reportado' then raise exception 'exact problem restore failed';end if;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','restore','again');raise exception 'duplicate restore accepted';exception when check_violation then null;end;
 perform public.moderate_reported_content('solution','42000000-0000-0000-0002-000000000001','archive','Violação confirmada');
 if (select s.current_status from public.get_content_moderation_state('solution','42000000-0000-0000-0002-000000000001') s)<>'Arquivada' then raise exception 'state RPC differs from solution';end if;
 perform public.moderate_reported_content('solution','42000000-0000-0000-0002-000000000001','restore','Revisão concluída');
 if (select s.status from public.solutions s where s.id='42000000-0000-0000-0002-000000000001')<>'Proposta' then raise exception 'exact solution restore failed';end if;
 begin perform public.moderate_reported_content('solution','42000000-0000-0000-0002-000000000001','restore','again');raise exception 'duplicate solution restore accepted';exception when check_violation then null;end;
 begin perform public.moderate_reported_content('solution','42000000-0000-0000-0002-000000000001','archive','x',null,v_report_id);raise exception 'mismatched report accepted';exception when check_violation then null;end;
 begin perform public.moderate_reported_content('user',gen_random_uuid(),'archive','x');raise exception 'bad target accepted';exception when invalid_parameter_value then null;end;
 begin perform public.moderate_reported_content('problem',gen_random_uuid(),'archive','x');raise exception 'missing content accepted';exception when no_data_found then null;end;
 begin perform public.get_content_moderation_state('problem',gen_random_uuid());raise exception 'missing state accepted';exception when no_data_found then null;end;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','delete','x');raise exception 'bad action accepted';exception when invalid_parameter_value then null;end;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','');raise exception 'empty reason accepted';exception when invalid_parameter_value then null;end;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive',repeat('x',501));raise exception 'long reason accepted';exception when invalid_parameter_value then null;end;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','x',repeat('x',2001));raise exception 'long note accepted';exception when invalid_parameter_value then null;end;
end $$;
reset role;

-- A manually archived row cannot reuse the latest (restore) audit action.
update public.problems p set status='Arquivado' where p.id='42000000-0000-0000-0001-000000000001';
set role authenticated;select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',false);
do $$ begin begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','restore','reuse');raise exception 'old archive reused after restore';exception when check_violation then null;end;end $$;
reset role;update public.problems p set status='Reportado' where p.id='42000000-0000-0000-0001-000000000001';
set role authenticated;select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',false);
do $$ begin begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000003','restore','manual');raise exception 'manual archive restored';exception when check_violation then null;end;end $$;
reset role;

-- Audit insert failure must roll the preceding status update back atomically.
create function public.sprint43_reject_audit() returns trigger language plpgsql as $$begin if new.reason='force audit failure' then raise exception 'forced audit failure' using errcode='55000';end if;return new;end$$;
create trigger sprint43_reject_audit before insert on public.content_moderation_actions for each row execute function public.sprint43_reject_audit();
set role authenticated;select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',false);
do $$ begin begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','force audit failure');raise exception 'forced audit insert accepted';exception when sqlstate '55000' then null;end;if(select p.status from public.problems p where p.id='42000000-0000-0000-0001-000000000001')<>'Reportado' then raise exception 'status did not roll back';end if;end $$;
reset role;drop trigger sprint43_reject_audit on public.content_moderation_actions;drop function public.sprint43_reject_audit();

-- Trigger blocks owner-level UPDATE and DELETE as well as revoked direct DML.
do $$ begin
 begin update public.content_moderation_actions a set reason='tampered' where true;raise exception 'history UPDATE succeeded';exception when sqlstate '55000' then null;end;
 begin delete from public.content_moderation_actions a where true;raise exception 'history DELETE succeeded';exception when sqlstate '55000' then null;end;
 if exists(select 1 from public.content_moderation_actions a where a.moderator_id<>'42000000-0000-0000-0000-000000000099') then raise exception 'moderator not server-derived';end if;
end $$;

-- Two independent PostgreSQL sessions genuinely contend for the same row lock.
create extension if not exists dblink;
create function public.sprint43_slow_problem_update() returns trigger language plpgsql as $$begin if new.id='42000000-0000-0000-0001-000000000001' then perform pg_sleep(1);end if;return new;end$$;
create trigger sprint43_slow_problem_update before update on public.problems for each row execute function public.sprint43_slow_problem_update();
create function public.sprint43_concurrent_archive() returns void language plpgsql as $$begin perform set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',true);perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','concurrent');end$$;
select dblink_connect('s43a','dbname='||current_database());select dblink_connect('s43b','dbname='||current_database());
select dblink_send_query('s43a','select public.sprint43_concurrent_archive()');select pg_sleep(0.1);select dblink_send_query('s43b','select public.sprint43_concurrent_archive()');
do $$ declare v_successes integer:=0;begin
 while dblink_is_busy('s43a')=1 or dblink_is_busy('s43b')=1 loop perform pg_sleep(0.1);end loop;
 begin perform * from dblink_get_result('s43a') as t(result text);v_successes:=v_successes+1;exception when check_violation then null;end;
 begin perform * from dblink_get_result('s43b') as t(result text);v_successes:=v_successes+1;exception when check_violation then null;end;
 if v_successes<>1 then raise exception 'expected exactly one concurrent success, got %',v_successes;end if;
 if(select count(*) from public.content_moderation_actions a where a.target_type='problem' and a.target_id='42000000-0000-0000-0001-000000000001' and a.reason='concurrent')<>1 then raise exception 'concurrency created incompatible actions';end if;
end $$;
select dblink_disconnect('s43a');select dblink_disconnect('s43b');
drop function public.sprint43_concurrent_archive();drop trigger sprint43_slow_problem_update on public.problems;drop function public.sprint43_slow_problem_update();
