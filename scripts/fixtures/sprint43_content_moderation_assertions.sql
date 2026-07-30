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
 if not exists(select 1 from pg_attribute a where a.attrelid='public.content_moderation_actions'::regclass and a.attname='action_order' and a.attidentity='a' and a.atttypid='bigint'::regtype) then raise exception 'action_order must be a generated-always bigint identity';end if;
 if not exists(select 1 from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey) where i.indrelid='public.content_moderation_actions'::regclass and i.indisunique and a.attname='action_order') then raise exception 'action_order is not unique';end if;
 if pg_get_functiondef('public.moderate_reported_content(text,uuid,text,text,text,uuid)'::regprocedure)~*'order by\s+a\.created_at\s+desc|order by\s+a\.id\s+desc' then raise exception 'last action still depends on timestamp or UUID';end if;
 if pg_get_functiondef('public.moderate_reported_content(text,uuid,text,text,text,uuid)'::regprocedure)!~*'order by\s+a\.action_order\s+desc' then raise exception 'last action does not use monotonic order';end if;
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
 begin insert into public.content_moderation_actions(action_order,target_type,target_id,moderator_id,action,reason,previous_status,resulting_status)values(1,'problem',gen_random_uuid(),auth.uid(),'archive','x','Reportado','Arquivado');raise exception 'client controlled action_order';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',false);
do $$ declare v_report_id uuid;v_report_status text;v_actual_status text;v_actual_report_status text;v_history_actions text[];v_archive_order bigint;v_restore_order bigint;begin
 select ar.id,ar.status into v_report_id,v_report_status
   from public.get_admin_content_reports(null,'problem',null,100,0) ar
  where ar.target_type='problem' and ar.target_id='42000000-0000-0000-0001-000000000001';
 if v_report_id is null or v_report_status is null then raise exception 'administrative report RPC did not return the problem report';end if;
 perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','Violação confirmada','Nota',v_report_id);
 select ms.current_status into v_actual_status from public.get_content_moderation_state('problem','42000000-0000-0000-0001-000000000001') ms;
 if v_actual_status is distinct from 'Arquivado' then raise exception 'problem not archived through state RPC: %',v_actual_status;end if;
 select ar.status into v_actual_report_status from public.get_admin_content_reports(null,'problem',null,100,0) ar where ar.id=v_report_id;
 if v_actual_report_status is distinct from v_report_status then raise exception 'report silently changed: expected %, got %',v_report_status,v_actual_report_status;end if;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','again');raise exception 'duplicate archive accepted';exception when check_violation then null;end;
 perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','restore','Revisão concluída',null,v_report_id);
 select ms.current_status into v_actual_status from public.get_content_moderation_state('problem','42000000-0000-0000-0001-000000000001') ms;
 if v_actual_status is distinct from 'Reportado' then raise exception 'exact problem restore failed: %',v_actual_status;end if;
 select array_agg(h.action order by h.ordinality) into v_history_actions from public.get_content_moderation_history('problem','42000000-0000-0000-0001-000000000001') with ordinality h;
 if v_history_actions is distinct from array['archive','restore']::text[] then raise exception 'history is not deterministically archive then restore: %',v_history_actions;end if;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','restore','again');raise exception 'duplicate restore accepted';exception when check_violation then null;end;
 perform public.moderate_reported_content('solution','42000000-0000-0000-0002-000000000001','archive','Violação confirmada');
 select ms.current_status into v_actual_status from public.get_content_moderation_state('solution','42000000-0000-0000-0002-000000000001') ms;
 if v_actual_status is distinct from 'Arquivada' then raise exception 'state RPC differs from solution: %',v_actual_status;end if;
 perform public.moderate_reported_content('solution','42000000-0000-0000-0002-000000000001','restore','Revisão concluída');
 select ms.current_status into v_actual_status from public.get_content_moderation_state('solution','42000000-0000-0000-0002-000000000001') ms;
 if v_actual_status is distinct from 'Proposta' then raise exception 'exact solution restore failed: %',v_actual_status;end if;
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

-- Identity order, not transaction-stable now() or random UUID, establishes precedence.
do $$ declare v_archive_order bigint;v_restore_order bigint;v_shared_timestamp_count bigint;begin
 select min(a.action_order),max(a.action_order),count(distinct a.created_at) into v_archive_order,v_restore_order,v_shared_timestamp_count from public.content_moderation_actions a where a.target_type='problem' and a.target_id='42000000-0000-0000-0001-000000000001';
 if v_archive_order is null or v_restore_order is null or v_archive_order>=v_restore_order then raise exception 'same-transaction actions lack increasing identity order: %, %',v_archive_order,v_restore_order;end if;
 if v_shared_timestamp_count is distinct from 1 then raise exception 'fixture no longer proves ordering when timestamps tie';end if;
 begin insert into public.content_moderation_actions(action_order,target_type,target_id,moderator_id,action,reason,previous_status,resulting_status)values(999999,'problem',gen_random_uuid(),gen_random_uuid(),'archive','owner override','Reportado','Arquivado');raise exception 'action_order accepted caller value';exception when generated_always then null;end;
end $$;

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
do $$ declare v_actual_status text;begin begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','force audit failure');raise exception 'forced audit insert accepted';exception when sqlstate '55000' then null;end;select ms.current_status into v_actual_status from public.get_content_moderation_state('problem','42000000-0000-0000-0001-000000000001') ms;if v_actual_status is distinct from 'Reportado' then raise exception 'status did not roll back: %',v_actual_status;end if;end $$;
reset role;drop trigger sprint43_reject_audit on public.content_moderation_actions;drop function public.sprint43_reject_audit();

do $$ declare v_sequence regclass;v_sequence_value bigint;v_max_order bigint;begin
 v_sequence:=pg_get_serial_sequence('public.content_moderation_actions','action_order')::regclass;
 execute format('select last_value from %s',v_sequence) into v_sequence_value;
 select max(a.action_order) into v_max_order from public.content_moderation_actions a;
 if v_sequence_value<=v_max_order then raise exception 'failed audit insert did not leave the expected harmless identity gap: sequence %, max %',v_sequence_value,v_max_order;end if;
end $$;

-- Trigger blocks owner-level UPDATE and DELETE as well as revoked direct DML.
do $$ declare v_action_count bigint;v_server_moderator_count bigint;begin
 begin update public.content_moderation_actions a set reason='tampered' where true;raise exception 'history UPDATE succeeded';exception when sqlstate '55000' then null;end;
 begin delete from public.content_moderation_actions a where true;raise exception 'history DELETE succeeded';exception when sqlstate '55000' then null;end;
 select count(*),count(*) filter(where a.moderator_id='42000000-0000-0000-0000-000000000099') into v_action_count,v_server_moderator_count from public.content_moderation_actions a;
 if v_action_count is distinct from 4 or v_server_moderator_count is distinct from v_action_count then raise exception 'moderator not exclusively server-derived: actions %, expected moderator %',v_action_count,v_server_moderator_count;end if;
end $$;

-- Two independent PostgreSQL sessions genuinely contend for the same row lock.
create extension if not exists dblink;
create function public.sprint43_slow_problem_update() returns trigger language plpgsql as $$begin if new.id='42000000-0000-0000-0001-000000000001' then perform pg_sleep(1);end if;return new;end$$;
create trigger sprint43_slow_problem_update before update on public.problems for each row execute function public.sprint43_slow_problem_update();
create function public.sprint43_concurrent_archive() returns void language plpgsql as $$begin perform set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',true);perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','concurrent');end$$;
select dblink_connect('s43a','dbname='||current_database());select dblink_connect('s43b','dbname='||current_database());
select dblink_send_query('s43a','select public.sprint43_concurrent_archive()');select pg_sleep(0.1);select dblink_send_query('s43b','select public.sprint43_concurrent_archive()');
do $$ declare v_successes integer:=0;v_concurrent_actions bigint;begin
 while dblink_is_busy('s43a')=1 or dblink_is_busy('s43b')=1 loop perform pg_sleep(0.1);end loop;
 begin perform * from dblink_get_result('s43a') as t(result text);v_successes:=v_successes+1;exception when check_violation then null;end;
 begin perform * from dblink_get_result('s43b') as t(result text);v_successes:=v_successes+1;exception when check_violation then null;end;
 if v_successes<>1 then raise exception 'expected exactly one concurrent success, got %',v_successes;end if;
 select count(*) into v_concurrent_actions from public.content_moderation_actions a where a.target_type='problem' and a.target_id='42000000-0000-0000-0001-000000000001' and a.reason='concurrent';
 if v_concurrent_actions is distinct from 1 then raise exception 'concurrency created % actions instead of one',v_concurrent_actions;end if;
end $$;
select dblink_disconnect('s43a');select dblink_disconnect('s43b');
drop function public.sprint43_concurrent_archive();drop trigger sprint43_slow_problem_update on public.problems;drop function public.sprint43_slow_problem_update();
