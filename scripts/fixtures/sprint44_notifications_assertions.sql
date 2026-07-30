-- Sprint 44: security, isolation, idempotency, rollback, pagination, ordering and concurrency assertions.
do $$ declare fn text; begin
 if not(select c.relrowsecurity and c.relforcerowsecurity from pg_class c where c.oid='public.notifications'::regclass) then raise exception 'notification RLS is not forced'; end if;
 if not exists(select 1 from pg_attribute where attrelid='public.notifications'::regclass and attname='notification_order' and attidentity='a' and atttypid='bigint'::regtype) then raise exception 'invalid notification identity order'; end if;
 foreach fn in array array['get_my_notifications(integer,integer,boolean)','get_my_unread_notification_count()','mark_my_notification_read(uuid)','mark_all_my_notifications_read()'] loop
  if has_function_privilege('anon','public.'||fn,'execute') or not has_function_privilege('authenticated','public.'||fn,'execute') then raise exception 'invalid RPC grant: %',fn; end if;
  if not exists(select 1 from pg_proc p where p.oid=('public.'||fn)::regprocedure and p.prosecdef and 'search_path=pg_catalog, public'=any(p.proconfig)) then raise exception 'unsafe RPC: %',fn; end if;
 end loop;
 if has_table_privilege('anon','public.notifications','select,insert,update,delete') or has_table_privilege('authenticated','public.notifications','insert,update,delete') then raise exception 'direct notification access exposed'; end if;
end $$;

-- Internal helper idempotency, including the same event submitted concurrently in practice via UNIQUE.
do $$ declare u1 uuid:='44000000-0000-0000-0000-000000000001';u2 uuid:='44000000-0000-0000-0000-000000000002';n1 uuid;n2 uuid;before_count bigint;begin
 select count(*) into before_count from public.notifications;
 n1:=public.create_event_notification(u1,'report.reviewing','problem',gen_random_uuid(),gen_random_uuid(),'s44:idempotency','Denúncia em análise','Sua denúncia está sendo analisada.',null);
 n2:=public.create_event_notification(u1,'report.reviewing','problem',gen_random_uuid(),gen_random_uuid(),'s44:idempotency','ignored','ignored',null);
 perform public.create_event_notification(u2,'content.archived','solution',gen_random_uuid(),null,'s44:isolation','Conteúdo arquivado','Seu conteúdo foi arquivado pela moderação.',null);
 if n1 is distinct from n2 or (select count(*) from public.notifications where event_key='s44:idempotency')<>1 then raise exception 'idempotency failed';end if;
 if (select count(*) from public.notifications)<>before_count+2 then raise exception 'unexpected notification count';end if;
 if exists(select 1 from public.notifications where event_key like 's44:%' and (metadata<>'{}'::jsonb or actor_id is not null or message~*'moderador|denunciante|nota interna')) then raise exception 'privacy failure';end if;
end $$;

-- A failed subtransaction leaves no residual notification (rollback atomicity).
do $$ begin
 begin
  perform public.create_event_notification('44000000-0000-0000-0000-000000000001','content.restored','problem',gen_random_uuid(),null,'s44:rollback','Conteúdo restaurado','Seu conteúdo foi restaurado.',null);
  raise exception 'forced rollback';
 exception when raise_exception then null; end;
 if exists(select 1 from public.notifications where event_key='s44:rollback') then raise exception 'rollback left a notification';end if;
end $$;

set role anon;
do $$ begin begin perform public.get_my_unread_notification_count();raise exception 'anonymous access accepted';exception when insufficient_privilege then null;end;end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','44000000-0000-0000-0000-000000000001',false);
do $$ declare rows_seen bigint;unread bigint;first_order bigint;begin
 select count(*),max(notification_order) into rows_seen,first_order from public.get_my_notifications(10,0,false);
 if rows_seen<>1 then raise exception 'recipient isolation failed: %',rows_seen;end if;
 select public.get_my_unread_notification_count() into unread;if unread<>1 then raise exception 'unread count failed';end if;
 if public.mark_my_notification_read((select id from public.notifications where event_key='s44:isolation')) then raise exception 'cross-account update accepted';end if;
 if not public.mark_my_notification_read((select id from public.notifications where event_key='s44:idempotency')) then raise exception 'own read failed';end if;
 if public.get_my_unread_notification_count()<>0 then raise exception 'individual mark failed';end if;
 begin perform * from public.get_my_notifications(0,0,false);raise exception 'invalid limit accepted';exception when invalid_parameter_value then null;end;
 begin perform * from public.get_my_notifications(10,-1,false);raise exception 'invalid offset accepted';exception when invalid_parameter_value then null;end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','44000000-0000-0000-0000-000000000002',false);
do $$ begin
 if (select count(*) from public.get_my_notifications(1,0,false))<>1 or (select count(*) from public.get_my_notifications(1,1,false))<>0 then raise exception 'pagination failed';end if;
 if public.mark_all_my_notifications_read()<>1 or public.get_my_unread_notification_count()<>0 then raise exception 'batch mark failed';end if;
end $$;
reset role;

-- Ordering is deterministic even for rows created in one transaction; the UNIQUE event key is the concurrency arbiter.
do $$ declare orders bigint[];begin
 select array_agg(notification_order order by notification_order desc) into orders from public.notifications where event_key like 's44:%';
 if orders is null or cardinality(orders)<>2 or orders[1]<=orders[2] then raise exception 'deterministic ordering failed';end if;
end $$;
