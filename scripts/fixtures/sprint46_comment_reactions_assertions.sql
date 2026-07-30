\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('46000000-0000-0000-0000-000000000001'),('46000000-0000-0000-0000-000000000002');
insert into public.profiles(id,role,display_name,username) values
 ('46000000-0000-0000-0000-000000000001','member','Pessoa A','pessoa-a'),
 ('46000000-0000-0000-0000-000000000002','member','Pessoa B','pessoa-b');
insert into public.comments(id,user_id,problem_id,content,visibility,deleted) values
 ('46000000-0000-0000-0001-000000000001','46000000-0000-0000-0000-000000000001','42000000-0000-0000-0001-000000000001','Comentário A','visible',false),
 ('46000000-0000-0000-0001-000000000002','46000000-0000-0000-0000-000000000002','42000000-0000-0000-0001-000000000001','Comentário B','visible',false),
 ('46000000-0000-0000-0001-000000000003','46000000-0000-0000-0000-000000000002','42000000-0000-0000-0001-000000000001','Oculto','hidden',false),
 ('46000000-0000-0000-0001-000000000004','46000000-0000-0000-0000-000000000002','42000000-0000-0000-0001-000000000001','Removido','removed',true);

do $$ declare result_columns text[]; begin
 if not(select relrowsecurity and relforcerowsecurity from pg_class where oid='public.comment_reactions'::regclass) then raise exception 'RLS must be enabled and forced';end if;
 if has_table_privilege('anon','public.comment_reactions','select,insert,update,delete') or has_table_privilege('authenticated','public.comment_reactions','select,insert,update,delete') then raise exception 'reaction table privilege leaked';end if;
 if has_function_privilege('anon','public.toggle_my_comment_reaction(uuid,text)','execute') or not has_function_privilege('authenticated','public.toggle_my_comment_reaction(uuid,text)','execute') then raise exception 'toggle grants invalid';end if;
 if not has_function_privilege('anon','public.get_comment_reaction_summary(uuid,uuid)','execute') then raise exception 'summary grant missing';end if;
 if not exists(select 1 from pg_proc p where p.oid='public.toggle_my_comment_reaction(uuid,text)'::regprocedure and p.prosecdef and 'search_path=pg_catalog, public'=any(p.proconfig)) then raise exception 'toggle search_path unsafe';end if;
 if not exists(select 1 from pg_proc p where p.oid='public.get_comment_reaction_summary(uuid,uuid)'::regprocedure and p.prosecdef and 'search_path=pg_catalog, public'=any(p.proconfig)) then raise exception 'summary search_path unsafe';end if;
 select array_agg(parameter_name order by ordinal_position) into result_columns from information_schema.parameters where specific_schema='public' and specific_name like 'get_comment_reaction_summary%' and parameter_mode in('OUT','INOUT');
 if result_columns<>array['comment_id','reaction_type','reaction_count','selected_by_user'] then raise exception 'summary leaks identity: %',result_columns;end if;
 if exists(select 1 from information_schema.parameters where specific_schema='public' and specific_name like 'toggle_my_comment_reaction%' and parameter_name in('user_id','recipient_id')) then raise exception 'client identity parameter accepted';end if;
 if not exists(select 1 from pg_constraint where conrelid='public.comment_reactions'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (comment_id, user_id, reaction_type)') then raise exception 'stable row uniqueness missing';end if;
 if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename in('comment_reactions','notifications')) then raise exception 'internal table published';end if;
end $$;

set role authenticated; select set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000001',true);
do $$ declare r record;t text;before_count bigint;begin
 begin insert into public.comment_reactions(comment_id,user_id,reaction_type)values('46000000-0000-0000-0001-000000000002',auth.uid(),'like');raise exception 'direct DML accepted';exception when insufficient_privilege then null;end;
 foreach t in array array['like','support','interesting','needsEvidence'] loop select * into r from public.toggle_my_comment_reaction('46000000-0000-0000-0001-000000000002',t);if not r.active or r.reaction_count<>1 then raise exception 'activation failed for %',t;end if;end loop;
 if (select count(*) from public.comment_reactions where comment_id='46000000-0000-0000-0001-000000000002' and user_id=auth.uid())<>4 then raise exception 'four stable unique rows missing';end if;
 select * into r from public.toggle_my_comment_reaction('46000000-0000-0000-0001-000000000002','like');if r.active or r.reaction_count<>0 then raise exception 'deactivation failed';end if;
 select * into r from public.toggle_my_comment_reaction('46000000-0000-0000-0001-000000000002','like');if not r.active or r.reaction_count<>1 then raise exception 'reactivation failed';end if;
 perform public.toggle_my_comment_reaction('46000000-0000-0000-0001-000000000001','like');
 begin perform public.toggle_my_comment_reaction('46000000-0000-0000-0001-000000000002','invalid');raise exception 'invalid type accepted';exception when invalid_parameter_value then null;end;
 begin perform public.toggle_my_comment_reaction('46000000-0000-0000-0001-000000000003','like');raise exception 'hidden accepted';exception when no_data_found then null;end;
 begin perform public.toggle_my_comment_reaction('46000000-0000-0000-0001-000000000004','like');raise exception 'removed accepted';exception when no_data_found then null;end;
 begin perform public.toggle_my_comment_reaction(gen_random_uuid(),'like');raise exception 'missing accepted';exception when no_data_found then null;end;
end $$;
do $$ declare r record;begin select * into r from public.get_comment_reaction_summary('42000000-0000-0000-0001-000000000001',null) where comment_id='46000000-0000-0000-0001-000000000002' and reaction_type='support';if r.reaction_count<>1 or not r.selected_by_user then raise exception 'authenticated summary incorrect';end if;end $$;
reset role;
do $$ begin
 if (select count(*) from public.notifications where event_key like 'comment-reaction:46000000-0000-0000-0001-000000000002:%')<>4 then raise exception 'activation/deactivation/reactivation notification count incorrect';end if;
 if exists(select 1 from public.notifications where event_key like 'comment-reaction:46000000-0000-0000-0001-000000000002:%' and (recipient_id<>'46000000-0000-0000-0000-000000000002' or actor_id<>'46000000-0000-0000-0000-000000000001')) then raise exception 'notification attribution incorrect';end if;
 if exists(select 1 from public.notifications where event_key like 'comment-reaction:46000000-0000-0000-0001-000000000001:%') then raise exception 'self reaction notified';end if;
 if exists(select 1 from public.get_comment_reaction_summary('42000000-0000-0000-0001-000000000001',null) where comment_id in('46000000-0000-0000-0001-000000000003','46000000-0000-0000-0001-000000000004')) then raise exception 'moderated comment leaked';end if;
end $$;

set role authenticated;select set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000002',true);
do $$ declare r record;begin select * into r from public.get_comment_reaction_summary('42000000-0000-0000-0001-000000000001',null) where comment_id='46000000-0000-0000-0001-000000000002' and reaction_type='support';if r.selected_by_user then raise exception 'account isolation failed';end if;end $$;reset role;
set role anon;select set_config('request.jwt.claim.sub','',true);
do $$ declare r record;begin begin insert into public.comment_reactions(comment_id,user_id,reaction_type)values('46000000-0000-0000-0001-000000000002','46000000-0000-0000-0000-000000000001','like');raise exception 'anon direct DML accepted';exception when insufficient_privilege then null;end;select * into r from public.get_comment_reaction_summary('42000000-0000-0000-0001-000000000001',null) where comment_id='46000000-0000-0000-0001-000000000002' and reaction_type='support';if r.reaction_count<>1 or r.selected_by_user is distinct from false then raise exception 'anonymous summary incorrect';end if;begin perform public.toggle_my_comment_reaction('46000000-0000-0000-0001-000000000002','like');raise exception 'anon toggle accepted';exception when insufficient_privilege then null;end;end $$;reset role;
rollback;
