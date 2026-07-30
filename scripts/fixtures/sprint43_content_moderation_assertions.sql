do $$ declare fn text; begin
 if to_regclass('public.content_moderation_actions') is null then raise exception 'moderation audit missing';end if;
 if not(select relrowsecurity and relforcerowsecurity from pg_class where oid='public.content_moderation_actions'::regclass) then raise exception 'RLS not forced';end if;
 foreach fn in array array['moderate_reported_content(text,uuid,text,text,text,uuid)','get_content_moderation_history(text,uuid)'] loop
  if has_function_privilege('anon','public.'||fn,'execute') or not has_function_privilege('authenticated','public.'||fn,'execute') then raise exception 'bad RPC grants: %',fn;end if;
  if not exists(select 1 from pg_proc p where p.oid=('public.'||fn)::regprocedure and p.prosecdef and 'search_path=pg_catalog, public'=any(p.proconfig)) then raise exception 'unsafe RPC: %',fn;end if;
 end loop;
 if has_table_privilege('anon','public.content_moderation_actions','select,insert,update,delete') or has_table_privilege('authenticated','public.content_moderation_actions','select,insert,update,delete') then raise exception 'direct DML exposed';end if;
 if pg_get_function_result('public.get_content_moderation_history(text,uuid)'::regprocedure)~'moderator_id' then raise exception 'moderator identity exposed';end if;
end $$;
set role anon;
do $$ begin begin perform public.get_content_moderation_history('problem',gen_random_uuid());raise exception 'anon accepted';exception when insufficient_privilege then null;end;end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',false);
do $$ begin
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','x');raise exception 'member accepted';exception when insufficient_privilege then null;end;
 begin perform * from public.content_moderation_actions;raise exception 'direct SELECT accepted';exception when insufficient_privilege then null;end;
 begin insert into public.content_moderation_actions(target_type,target_id,moderator_id,action,reason,previous_status,resulting_status)values('problem',gen_random_uuid(),auth.uid(),'archive','x','Reportado','Arquivado');raise exception 'direct INSERT accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000099',false);
do $$ declare rid uuid; report_before text; begin
 select r.id,r.status into rid,report_before from public.content_reports r where r.target_type='problem' and r.target_id='42000000-0000-0000-0001-000000000001';
 perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','Violação confirmada','Nota',rid);
 if (select p.status from public.problems p where p.id='42000000-0000-0000-0001-000000000001')<>'Arquivado' then raise exception 'problem not archived';end if;
 if (select r.status from public.content_reports r where r.id=rid)<>report_before then raise exception 'report silently changed';end if;
 if not exists(select 1 from public.get_content_moderation_history('problem','42000000-0000-0000-0001-000000000001') h where h.previous_status='Reportado' and h.resulting_status='Arquivado') then raise exception 'history wrong';end if;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','again');raise exception 'duplicate archive';exception when check_violation then null;end;
 perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','restore','Revisão concluída',null,rid);
 if (select p.status from public.problems p where p.id='42000000-0000-0000-0001-000000000001')<>'Reportado' then raise exception 'exact restore failed';end if;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','restore','again');raise exception 'duplicate restore';exception when check_violation then null;end;
 perform public.moderate_reported_content('solution','42000000-0000-0000-0002-000000000001','archive','Violação confirmada');
 if (select s.status from public.solutions s where s.id='42000000-0000-0000-0002-000000000001')<>'Arquivada' then raise exception 'solution not archived';end if;
 begin perform public.moderate_reported_content('solution','42000000-0000-0000-0002-000000000001','archive','x',null,rid);raise exception 'mismatched report';exception when check_violation then null;end;
 begin perform public.moderate_reported_content('user',gen_random_uuid(),'archive','x');raise exception 'bad target';exception when invalid_parameter_value then null;end;
 begin perform public.moderate_reported_content('problem',gen_random_uuid(),'archive','x');raise exception 'missing content';exception when no_data_found then null;end;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','delete','x');raise exception 'bad action';exception when invalid_parameter_value then null;end;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','');raise exception 'empty reason';exception when invalid_parameter_value then null;end;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive',repeat('x',501));raise exception 'long reason';exception when invalid_parameter_value then null;end;
 begin perform public.moderate_reported_content('problem','42000000-0000-0000-0001-000000000001','archive','x',repeat('x',2001));raise exception 'long note';exception when invalid_parameter_value then null;end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.content_moderation_actions a where a.moderator_id<>'42000000-0000-0000-0000-000000000099') then raise exception 'moderator not server-derived';end if;
 begin update public.content_moderation_actions set reason='tampered';raise exception 'history mutable';exception when sqlstate '55000' then null;end;
end $$;
