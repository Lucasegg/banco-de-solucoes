-- Sprint 45 executable isolation, preference, cleanup and safe-signal scenarios.
insert into auth.users(id) values
 ('45000000-0000-0000-0000-000000000001'),('45000000-0000-0000-0000-000000000002') on conflict do nothing;

do $$ declare columns text[];begin
 select array_agg(column_name order by ordinal_position) into columns from information_schema.columns where table_schema='public' and table_name='notification_realtime_signals';
 if columns<>array['id','recipient_id','notification_id','notification_order','change_type','signaled_at'] then raise exception 'unsafe signal projection: %',columns;end if;
 if not(select relrowsecurity and relforcerowsecurity from pg_class where oid='public.notification_realtime_signals'::regclass) then raise exception 'signal RLS not forced';end if;
 if (select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notification_realtime_signals')<>1 then raise exception 'signal publication is not idempotent';end if;
 if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then raise exception 'internal notifications table was published';end if;
 if has_table_privilege('anon','public.notification_preferences','select') or has_table_privilege('authenticated','public.notification_preferences','insert,update,delete') then raise exception 'preference grants too broad';end if;
 if pg_get_functiondef('public.get_my_notification_preferences()'::regprocedure) not like '%auth.uid()%' or
    pg_get_functiondef('public.update_my_notification_preferences(boolean,boolean,boolean)'::regprocedure) not like '%auth.uid()%' or
    pg_get_functiondef('public.delete_my_old_read_notifications()'::regprocedure) not like '%auth.uid()%' then raise exception 'RPC does not derive identity from auth.uid()';end if;
end $$;

set role anon;
do $$ begin begin perform public.get_my_notification_preferences();raise exception 'anon preferences accepted';exception when insufficient_privilege then null;end;end $$;
reset role;

set role authenticated;select set_config('request.jwt.claim.sub','45000000-0000-0000-0000-000000000001',false);
do $$ declare p record;begin
 select * into p from public.get_my_notification_preferences();if not(p.contributions and p.comments and p.favorites) then raise exception 'unsafe defaults';end if;
 perform public.update_my_notification_preferences(false,true,false);
 if (select count(*) from public.notification_preferences)<>1 then raise exception 'cross-account preference visible';end if;
 begin insert into public.notification_preferences(user_id) values('45000000-0000-0000-0000-000000000002');raise exception 'direct DML accepted';exception when insufficient_privilege then null;end;
end $$;reset role;

do $$ begin
 if (select contributions or not comments or favorites from public.notification_preferences where user_id='45000000-0000-0000-0000-000000000001') then raise exception 'account A update was not isolated';end if;
 if (select not contributions or comments or not favorites from public.notification_preferences where user_id='45000000-0000-0000-0000-000000000002') then raise exception 'account B update was not isolated';end if;
end $$;

set role authenticated;select set_config('request.jwt.claim.sub','45000000-0000-0000-0000-000000000002',false);
do $$ declare p record;begin select * into p from public.get_my_notification_preferences();if not(p.contributions and p.comments and p.favorites) then raise exception 'account A preferences leaked';end if;perform public.update_my_notification_preferences(true,false,true);end $$;reset role;

do $$ declare old_a uuid;unread_a uuid;recent_a uuid;old_b uuid;begin
 insert into public.notifications(recipient_id,type,title,message,read_at,created_at,event_key) values
 ('45000000-0000-0000-0000-000000000001','comment.created','old-a','x',now()-interval '31 days',now()-interval '31 days','s45:old-a') returning id into old_a;
 insert into public.notifications(recipient_id,type,title,message,created_at,event_key) values
 ('45000000-0000-0000-0000-000000000001','comment.created','unread-a','x',now()-interval '31 days','s45:unread-a') returning id into unread_a;
 insert into public.notifications(recipient_id,type,title,message,read_at,created_at,event_key) values
 ('45000000-0000-0000-0000-000000000001','comment.created','recent-a','x',now(),now(),'s45:recent-a') returning id into recent_a;
 insert into public.notifications(recipient_id,type,title,message,read_at,created_at,event_key) values
 ('45000000-0000-0000-0000-000000000002','comment.created','old-b','x',now()-interval '31 days',now()-interval '31 days','s45:old-b') returning id into old_b;
 if (select count(*) from public.notification_realtime_signals where notification_id in(old_a,unread_a,recent_a,old_b))<>4 then raise exception 'signal is not atomic with inserts';end if;
end $$;
set role authenticated;select set_config('request.jwt.claim.sub','45000000-0000-0000-0000-000000000001',false);
do $$ begin
 if exists(select 1 from public.notification_realtime_signals where recipient_id='45000000-0000-0000-0000-000000000002') then raise exception 'cross-account signal visible';end if;
 begin insert into public.notification_realtime_signals(recipient_id,notification_id,notification_order,change_type) select recipient_id,id,notification_order,'INSERT' from public.notifications limit 1;raise exception 'direct signal DML accepted';exception when insufficient_privilege then null;end;
end $$;reset role;
set role authenticated;select set_config('request.jwt.claim.sub','45000000-0000-0000-0000-000000000001',false);
do $$ declare removed integer;begin select public.delete_my_old_read_notifications() into removed;if removed<>1 then raise exception 'cleanup removed % rows',removed;end if;end $$;reset role;
do $$ begin if exists(select 1 from public.notifications where event_key='s45:old-a') or (select count(*) from public.notifications where event_key in('s45:unread-a','s45:recent-a','s45:old-b'))<>3 then raise exception 'cleanup scope failed';end if;end $$;
