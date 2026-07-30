-- Sprint 44: security, isolation, idempotency, rollback, pagination, ordering and concurrency assertions.
do $$ declare fn text; begin
 if not(select c.relrowsecurity and c.relforcerowsecurity from pg_class c where c.oid='public.notifications'::regclass) then raise exception 'notification RLS is not forced'; end if;
 if not exists(select 1 from pg_attribute where attrelid='public.notifications'::regclass and attname='notification_order' and attidentity='a' and atttypid='bigint'::regtype) then raise exception 'invalid notification identity order'; end if;
 foreach fn in array array['get_my_notifications(integer,integer,boolean)','get_my_unread_notification_count()','mark_my_notification_read(uuid)','mark_all_my_notifications_read()'] loop
  if has_function_privilege('anon','public.'||fn,'execute') or not has_function_privilege('authenticated','public.'||fn,'execute') then raise exception 'invalid RPC grant: %',fn; end if;
  if not exists(select 1 from pg_proc p where p.oid=('public.'||fn)::regprocedure and p.prosecdef and 'search_path=pg_catalog, public'=any(p.proconfig)) then raise exception 'unsafe RPC: %',fn; end if;
 end loop;
 if has_table_privilege('anon','public.notifications','select,insert,update,delete') or has_table_privilege('authenticated','public.notifications','insert,update,delete') then raise exception 'direct notification access exposed'; end if;
 if (select count(*) from public.notifications where title='legacy')<>9 then raise exception 'legacy rows did not survive migration';end if;
 if not (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.notifications'::regclass and conname='notifications_type_check') ~ 'contribution.received' then raise exception 'legacy contribution.received type removed';end if;
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

-- Legacy public actors remain visible; private moderation events never carry one.
insert into public.notifications(recipient_id,actor_id,type,title,message,target_type,target_id,event_key)
values('42000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000099','comment.created','legacy actor','legacy actor','problem',gen_random_uuid(),'s44:legacy-actor');
set role authenticated;
select set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',false);
do $$ declare actor uuid;actor_label text;begin
 select actor_id,actor_name into actor,actor_label from public.get_my_notifications(10,0,false) where id=(select id from public.notifications where event_key='s44:legacy-actor');
 if actor is distinct from '42000000-0000-0000-0000-000000000099' or actor_label is null then raise exception 'legacy actor attribution lost';end if;
end $$;
reset role;

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

-- limit+1 semantics distinguish incomplete, exactly-full and genuinely-next pages.
do $$ declare i integer;begin
 for i in 1..52 loop perform public.create_event_notification('44000000-0000-0000-0000-000000000003','content.restored','problem',gen_random_uuid(),null,'s44:page:'||i,'x','x',null);end loop;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','44000000-0000-0000-0000-000000000003',false);
do $$ begin
 if (select count(*) from public.get_my_notifications(10,0,false))<>11 then raise exception 'full page did not expose real next row';end if;
 if (select count(*) from public.get_my_notifications(50,0,false))<>51 then raise exception 'limit 50 returned more or less than 51 internal rows';end if;
 if (select count(*) from public.get_my_notifications(10,50,false))<>2 then raise exception 'incomplete final page failed';end if;
end $$;
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
 select array_agg(notification_order order by notification_order desc) into orders from public.notifications where event_key in ('s44:idempotency','s44:isolation');
 if orders is null or cardinality(orders)<>2 or orders[1]<=orders[2] then raise exception 'deterministic ordering failed';end if;
end $$;

-- Two real PostgreSQL sessions contend on one event_key. Both calls complete and UNIQUE wins once.
create extension if not exists dblink;
create function public.sprint44_slow_duplicate_event() returns trigger language plpgsql set search_path=pg_catalog,public as $$begin if new.event_key='s44:concurrency' then perform pg_sleep(0.5);end if;return new;end$$;
create trigger sprint44_slow_duplicate_event before insert on public.notifications for each row execute function public.sprint44_slow_duplicate_event();
select dblink_connect('s44a','dbname='||current_database());
select dblink_connect('s44b','dbname='||current_database());
select dblink_send_query('s44a',$q$select public.create_event_notification('44000000-0000-0000-0000-000000000004','content.archived','problem',gen_random_uuid(),null,'s44:concurrency','x','x',null)$q$);
select dblink_send_query('s44b',$q$select public.create_event_notification('44000000-0000-0000-0000-000000000004','content.archived','problem',gen_random_uuid(),null,'s44:concurrency','x','x',null)$q$);
do $$ declare failures integer:=0;begin
 while dblink_is_busy('s44a')=1 or dblink_is_busy('s44b')=1 loop perform pg_sleep(0.05);end loop;
 begin perform * from dblink_get_result('s44a') as t(id uuid);exception when others then failures:=failures+1;end;
 begin perform * from dblink_get_result('s44b') as t(id uuid);exception when others then failures:=failures+1;end;
 if failures<>0 then raise exception 'concurrent notification call failed: %',failures;end if;
 if (select count(*) from public.notifications where event_key='s44:concurrency')<>1 then raise exception 'concurrency duplicated notification';end if;
end $$;
select dblink_disconnect('s44a');select dblink_disconnect('s44b');
drop trigger sprint44_slow_duplicate_event on public.notifications;drop function public.sprint44_slow_duplicate_event();
