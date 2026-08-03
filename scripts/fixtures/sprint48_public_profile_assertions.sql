\set ON_ERROR_STOP on
begin;
-- Controlled public, archived, draft and moderated content for one existing Sprint 47 member.
update public.profiles set public_profile=true where username='autor-47';
insert into public.problems(id,author_id,title,summary,description,category,city,state,status) values
 ('48000000-0000-0000-0001-000000000001','47000000-0000-0000-0000-000000000001','Problema público','Público','Público','Infraestrutura','Cidade','UF','Reportado'),
 ('48000000-0000-0000-0001-000000000002','47000000-0000-0000-0000-000000000001','Problema arquivado','Arquivado','Arquivado','Infraestrutura','Cidade','UF','Arquivado');
insert into public.solutions(id,author_id,title,summary,description,category,organization,status,impact_metric) values
 ('48000000-0000-0000-0002-000000000001','47000000-0000-0000-0000-000000000001','Solução pública','Pública','Pública','Infraestrutura','Org','Validada','Impacto'),
 ('48000000-0000-0000-0002-000000000002','47000000-0000-0000-0000-000000000001','Solução arquivada','Arquivada','Arquivada','Infraestrutura','Org','Arquivada','Impacto');
insert into public.comments(id,user_id,problem_id,content,visibility,deleted) values
 ('48000000-0000-0000-0003-000000000001','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0001-000000000002','Comentário em conteúdo arquivado','visible',false),
 ('48000000-0000-0000-0003-000000000002','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0001-000000000001','Comentário oculto','hidden',false),
 ('48000000-0000-0000-0003-000000000003','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0001-000000000001','Comentário removido','removed',true);
insert into public.contributions(id,user_id,problem_id,contribution_type,payload,status,moderator_id,reviewed_at) values
 ('48000000-0000-0000-0004-000000000001','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0001-000000000001','other','{"title":"Rascunho"}'::jsonb,'pending',null,null),
 ('48000000-0000-0000-0004-000000000002','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0001-000000000002','other','{"title":"Aprovada arquivada"}'::jsonb,'approved','47000000-0000-0000-0000-000000000002',now()),
 ('48000000-0000-0000-0004-000000000003','47000000-0000-0000-0000-000000000001','48000000-0000-0000-0001-000000000001','other','{"title":"Aprovada pública"}'::jsonb,'approved','47000000-0000-0000-0000-000000000002',now());

do $$ begin
 if not has_function_privilege('anon','public.get_public_member_profile(text)','execute') or not has_function_privilege('authenticated','public.get_public_member_profile(text)','execute') then raise exception 'minimal RPC grants missing';end if;
 if has_table_privilege('anon','public.profiles','insert,update,delete') then raise exception 'anon profile DML leaked';end if;
 if not exists(select 1 from pg_proc where oid='public.get_public_member_profile(text)'::regprocedure and prosecdef and 'search_path=pg_catalog, public'=any(proconfig)) then raise exception 'unsafe RPC search_path';end if;
 if (select column_default from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='public_profile') not like '%false%' then raise exception 'public profile is not opt-in';end if;
end $$;

set local role anon;
do $$ declare payload jsonb; activity jsonb;begin
 payload:=public.get_public_member_profile('  AUTOR-47  ');activity:=payload#>'{profile,activity}';
 if payload->>'status'<>'public' or payload#>>'{profile,username}'<>'autor-47' then raise exception 'public profile/normalization failed: %',payload;end if;
 if payload::text ~* 'email|token|provider|consent|notification|audit|moderation_note' then raise exception 'private field leaked';end if;
 if (payload#>>'{profile,metrics,problems}')::integer<>1 or (payload#>>'{profile,metrics,solutions}')::integer<>1 or (payload#>>'{profile,metrics,approvedContributions}')::integer<>1 then raise exception 'archived/draft content counted: %',payload#>'{profile,metrics}';end if;
 if activity::text ~ 'arquivad|Rascunho|oculto|removido' then raise exception 'non-public activity leaked: %',activity;end if;
 if exists(select 1 from jsonb_array_elements(activity) x where not(x ?& array['target_kind','target_id']) or x->>'target_kind' not in('problem','solution')) then raise exception 'activity navigation context missing';end if;
 if jsonb_array_length(activity)>20 then raise exception 'activity is not bounded';end if;
 if public.get_public_member_profile('unknown-48')->>'status'<>'not_found' then raise exception 'unknown username disclosed';end if;
end $$;
reset role;

update public.profiles set public_profile=false where username='autor-47';
set local role anon;
do $$ begin if public.get_public_member_profile('autor-47')<>jsonb_build_object('status','not_found') then raise exception 'private profile disclosed to anon';end if;end $$;
reset role;
set local request.jwt.claim.sub='47000000-0000-0000-0000-000000000002';set local role authenticated;
do $$ begin if auth.uid()<>'47000000-0000-0000-0000-000000000002'::uuid then raise exception 'external JWT context missing';end if;if public.get_public_member_profile('autor-47')<>jsonb_build_object('status','not_found') then raise exception 'private profile disclosed externally';end if;end $$;
reset role;
set local request.jwt.claim.sub='47000000-0000-0000-0000-000000000001';set local role authenticated;
do $$ begin if auth.uid()<>'47000000-0000-0000-0000-000000000001'::uuid or not exists(select 1 from public.profiles where id=auth.uid() and username='autor-47') then raise exception 'owner cannot read own authenticated profile';end if;update public.profiles set public_profile=true where id=auth.uid();if not found then raise exception 'owner cannot manage own privacy';end if;end $$;
reset role;
rollback;
