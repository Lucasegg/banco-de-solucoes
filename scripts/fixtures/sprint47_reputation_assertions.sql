\set ON_ERROR_STOP on
-- Sprint 47 behavioral, deletion, idempotency, privacy and real-concurrency assertions.
begin;
do $$ begin
 if not(select relrowsecurity and relforcerowsecurity from pg_class where oid='public.user_reputation'::regclass) then raise exception 'reputation RLS missing';end if;
 if has_table_privilege('anon','public.user_reputation','select,insert,update,delete') or has_table_privilege('authenticated','public.user_reputation','select,insert,update,delete') then raise exception 'reputation table leaked';end if;
 if not has_function_privilege('anon','public.get_public_reputations(uuid[])','execute') or has_function_privilege('anon','public.get_my_reputation()','execute') then raise exception 'RPC grants invalid';end if;
 if exists(select 1 from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef and p.proname like '%reputation%' and not('search_path=pg_catalog, public'=any(p.proconfig))) then raise exception 'unsafe SECURITY DEFINER search_path';end if;
 if exists(select 1 from information_schema.parameters where specific_schema='public' and specific_name like 'get_my_reputation%' and parameter_mode in('IN','INOUT')) then raise exception 'own RPC accepts client identity';end if;
 if exists(select 1 from information_schema.parameters where specific_schema='public' and specific_name like 'get_public_reputations%' and parameter_name in('email','identity','role')) then raise exception 'public summary exposes private identity';end if;
 if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename like '%reputation%') then raise exception 'internal reputation table published';end if;
end $$;

insert into auth.users(id) values ('47000000-0000-0000-0000-000000000001'),('47000000-0000-0000-0000-000000000002'),('47000000-0000-0000-0000-000000000003');
insert into public.profiles(id,role,display_name,username) values
 ('47000000-0000-0000-0000-000000000001','member','Autor','autor-47'),
 ('47000000-0000-0000-0000-000000000002','member','Leitor','leitor-47'),
 ('47000000-0000-0000-0000-000000000003','member','Outro','outro-47');
insert into public.comments(id,user_id,problem_id,content) values
 ('47000000-0000-0000-0001-000000000001','47000000-0000-0000-0000-000000000001','42000000-0000-0000-0001-000000000001','Resposta um'),
 ('47000000-0000-0000-0001-000000000002','47000000-0000-0000-0000-000000000001','42000000-0000-0000-0001-000000000001','Resposta dois');
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>10 then raise exception 'initial comment score incorrect';end if;end $$;

insert into public.comment_reactions(comment_id,user_id,reaction_type) values
 ('47000000-0000-0000-0001-000000000001','47000000-0000-0000-0000-000000000002','like'),
 ('47000000-0000-0000-0001-000000000001','47000000-0000-0000-0000-000000000003','support'),
 ('47000000-0000-0000-0001-000000000001','47000000-0000-0000-0000-000000000001','interesting');
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>14 then raise exception 'reaction score or self reaction exclusion incorrect';end if;end $$;
update public.comment_reactions set active=false where user_id='47000000-0000-0000-0000-000000000002';
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>12 then raise exception 'reaction deactivation incorrect';end if;end $$;

-- A physical reaction deletion removes points, and recreating the row restores them.
delete from public.comment_reactions where comment_id='47000000-0000-0000-0001-000000000001' and user_id='47000000-0000-0000-0000-000000000003' and reaction_type='support';
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>10 then raise exception 'physical reaction deletion did not reduce reputation';end if;end $$;
insert into public.comment_reactions(comment_id,user_id,reaction_type) values ('47000000-0000-0000-0001-000000000001','47000000-0000-0000-0000-000000000003','support');
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>12 then raise exception 'reaction recreation did not restore reputation';end if;end $$;

update public.comments set best_answer=true where id='47000000-0000-0000-0001-000000000001';
update public.comments set best_answer=false where id='47000000-0000-0000-0001-000000000001';
update public.comments set best_answer=true where id='47000000-0000-0000-0001-000000000002';
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>37 then raise exception 'best answer switch incorrect';end if;end $$;
update public.comments set visibility='hidden' where id='47000000-0000-0000-0001-000000000002';
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>7 then raise exception 'moderation did not remove comment and best answer points';end if;end $$;
update public.comments set visibility='visible' where id='47000000-0000-0000-0001-000000000002';
select public.refresh_user_reputation('47000000-0000-0000-0000-000000000001','test-idempotency');
select public.refresh_user_reputation('47000000-0000-0000-0000-000000000001','test-idempotency');
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>37 then raise exception 'restoration/idempotency incorrect';end if;end $$;

set role anon;
do $$ declare r record;begin select * into r from public.get_public_reputations(array['47000000-0000-0000-0000-000000000001'::uuid]);if r.points<>37 or r.active_comments<>2 or r.reactions_received<>1 or r.best_answers<>1 or jsonb_array_length(r.achievements)<2 then raise exception 'anonymous batch summary incorrect';end if;begin update public.user_reputation set points=999;raise exception 'anon mutation accepted';exception when insufficient_privilege then null;end;end $$;
reset role;

-- A physical comment deletion also cascades its best-answer state and leaves only
-- the first comment plus its one valid received reaction: 5 + 2 = 7.
delete from public.comments where id='47000000-0000-0000-0001-000000000002';
do $$ declare r public.user_reputation%rowtype;begin select * into r from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001';if r.points<>7 or r.active_comments<>1 or r.reactions_received<>1 or r.best_answers<>0 or r.discussions_participated<>1 then raise exception 'physical comment deletion projection incorrect: %',row_to_json(r);end if;end $$;
select public.refresh_user_reputation('47000000-0000-0000-0000-000000000001','post-delete-idempotency');
select public.refresh_user_reputation('47000000-0000-0000-0000-000000000001','post-delete-idempotency');
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>7 then raise exception 'post-delete refresh is not idempotent';end if;end $$;
commit;

-- Two genuine PostgreSQL sessions contend on the same advisory lock. Deliberate
-- projection drift makes exactly the first refresh repair/audit 999 -> 7; the
-- second must observe the repaired state without duplicating score or audit.
create extension if not exists dblink;
update public.user_reputation set points=999 where user_id='47000000-0000-0000-0000-000000000001';
select dblink_connect('s47a','dbname='||current_database());
select dblink_connect('s47b','dbname='||current_database());
select dblink_send_query('s47a',$q$select public.refresh_user_reputation('47000000-0000-0000-0000-000000000001','concurrency-a')$q$);
select dblink_send_query('s47b',$q$select public.refresh_user_reputation('47000000-0000-0000-0000-000000000001','concurrency-b')$q$);
do $$ declare failures integer:=0;details text:='';begin
 while dblink_is_busy('s47a')=1 or dblink_is_busy('s47b')=1 loop perform pg_sleep(0.05);end loop;
 begin perform * from dblink_get_result('s47a') as t(result text);exception when others then failures:=failures+1;details:=details||' s47a='||sqlerrm;end;
 begin perform * from dblink_get_result('s47b') as t(result text);exception when others then failures:=failures+1;details:=details||' s47b='||sqlerrm;end;
 if failures<>0 then raise exception 'concurrent reputation refresh failed:%',details;end if;
end $$;
select dblink_disconnect('s47a');select dblink_disconnect('s47b');
do $$ declare r public.user_reputation%rowtype;begin
 select * into r from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001';
 if r.points<>7 or r.active_comments<>1 or r.reactions_received<>1 or r.best_answers<>0 or r.discussions_participated<>1 then raise exception 'concurrency left inconsistent projection: %',row_to_json(r);end if;
 if (select count(*) from public.user_achievements where user_id=r.user_id)<>1 or not exists(select 1 from public.user_achievements where user_id=r.user_id and achievement_key='active_voice') then raise exception 'concurrency left inconsistent achievements';end if;
 if (select count(*) from public.reputation_audit_log where user_id=r.user_id and reason in('concurrency-a','concurrency-b') and previous_points=999 and resulting_points=7)<>1 then raise exception 'concurrency audit must contain exactly one repair';end if;
 if exists(select 1 from public.reputation_audit_log where user_id=r.user_id and reason in('concurrency-a','concurrency-b') and (previous_points=resulting_points or resulting_points<>7)) then raise exception 'concurrency produced invalid audit';end if;
end $$;
