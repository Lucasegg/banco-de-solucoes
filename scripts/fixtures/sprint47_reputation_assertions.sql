\set ON_ERROR_STOP on
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
do $$ begin if(select reactions_received from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>1 then raise exception 'reaction removal incorrect';end if;end $$;
update public.comments set best_answer=true where id='47000000-0000-0000-0001-000000000001';
update public.comments set best_answer=false where id='47000000-0000-0000-0001-000000000001';
update public.comments set best_answer=true where id='47000000-0000-0000-0001-000000000002';
do $$ begin if(select best_answers from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>1 then raise exception 'best answer switch incorrect';end if;end $$;
update public.comments set visibility='hidden' where id='47000000-0000-0000-0001-000000000002';
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>7 then raise exception 'moderation did not remove comment and best answer points';end if;end $$;
update public.comments set visibility='visible' where id='47000000-0000-0000-0001-000000000002';
select public.refresh_user_reputation('47000000-0000-0000-0000-000000000001','test-idempotency');
select public.refresh_user_reputation('47000000-0000-0000-0000-000000000001','test-idempotency');
do $$ begin if(select points from public.user_reputation where user_id='47000000-0000-0000-0000-000000000001')<>32 then raise exception 'restoration/idempotency incorrect';end if;end $$;

set role anon;
do $$ declare r record;begin select * into r from public.get_public_reputations(array['47000000-0000-0000-0000-000000000001'::uuid]);if r.points<>32 or jsonb_array_length(r.achievements)<2 then raise exception 'anonymous batch summary incorrect';end if;begin update public.user_reputation set points=999;raise exception 'anon mutation accepted';exception when insufficient_privilege then null;end;end $$;
reset role;
do $$ begin if(select count(*) from public.get_public_reputations(array['47000000-0000-0000-0000-000000000001'::uuid,'47000000-0000-0000-0000-000000000002'::uuid]))<>1 then raise exception 'batch aggregation isolation incorrect';end if;if not exists(select 1 from public.reputation_audit_log where user_id='47000000-0000-0000-0000-000000000001') then raise exception 'audit missing';end if;end $$;
rollback;
