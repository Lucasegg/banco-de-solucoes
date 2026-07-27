\set ON_ERROR_STOP on
do $$ declare n integer; begin
 if to_regclass('public.taxonomy_terms') is null then raise exception 'Sprint 35 migration was not applied'; end if;
 select count(*) into n from public.taxonomy_terms where normalized_name in ('infraestrutura','drenagem'); if n<2 then raise exception 'taxonomy backfill failed'; end if;
 if (select updated_at from public.problems where id='00000000-0000-0000-0000-000000000001')<>'2025-01-01 00:00:00+00'::timestamptz then raise exception 'technical canonicalization changed updated_at'; end if;
 if (select category from public.problems where id='00000000-0000-0000-0000-000000000001')<>'Infraestrutura' or (select tags from public.problems where id='00000000-0000-0000-0000-000000000001')<>array['drenagem'] then raise exception 'legacy row was not selectively canonicalized'; end if;
 if exists(select 1 from public.taxonomy_terms group by kind,scope,normalized_name having count(*)>1) then raise exception 'duplicate canonical terms'; end if;
 if not (select relrowsecurity from pg_class where oid='public.taxonomy_proposals'::regclass) then raise exception 'proposal RLS disabled'; end if;
 if has_table_privilege('anon','public.taxonomy_proposals','select') then raise exception 'private proposals exposed to anon'; end if;
 if has_table_privilege('authenticated','public.taxonomy_terms','insert') then raise exception 'official terms writable by users'; end if;
 if has_table_privilege('authenticated','public.taxonomy_proposals','insert') then raise exception 'direct proposal insert grant found'; end if;
 if not has_table_privilege('anon','public.taxonomy_terms','select') or not has_table_privilege('authenticated','public.taxonomy_terms','select') then raise exception 'taxonomy term read grants missing'; end if;
 if not has_table_privilege('anon','public.taxonomy_aliases','select') or not has_table_privilege('authenticated','public.taxonomy_aliases','select') then raise exception 'taxonomy alias read grants missing'; end if;
 if not has_table_privilege('authenticated','public.taxonomy_proposals','select') or has_table_privilege('anon','public.taxonomy_proposals','select') then raise exception 'taxonomy proposal read grants invalid'; end if;
 if not has_table_privilege('authenticated','public.taxonomy_audit','select') or has_table_privilege('anon','public.taxonomy_audit','select') then raise exception 'taxonomy audit read grants invalid'; end if;
 if has_table_privilege('authenticated','public.taxonomy_audit','insert') or has_table_privilege('authenticated','public.taxonomy_audit','update') or has_table_privilege('authenticated','public.taxonomy_audit','delete') then raise exception 'authenticated taxonomy audit write grant found'; end if;
 if (select prosecdef from pg_proc where oid='public.list_taxonomy_terms(public.taxonomy_kind,public.taxonomy_scope,text,integer,integer)'::regprocedure) then raise exception 'public list is not invoker'; end if;
 if not (select prosecdef from pg_proc where oid='public.review_taxonomy_proposal(uuid,public.taxonomy_proposal_status,text)'::regprocedure) then raise exception 'review RPC is not definer'; end if;
 if not (select prosecdef from pg_proc where oid='public.submit_taxonomy_proposal(text,public.taxonomy_kind,public.taxonomy_scope,text)'::regprocedure) then raise exception 'proposal RPC cannot inspect scoped or deprecated terms safely'; end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.problems'::regclass and tgname='problems_canonical_taxonomy') then raise exception 'problem write guard absent'; end if;
 if to_regprocedure('public.search_problems(text,text,text,text,text,text[],timestamptz,timestamptz,boolean,boolean,boolean,text,integer,integer)') is null then raise exception 'search_problems compatibility lost'; end if;
 if to_regprocedure('public.search_solutions(text,text,text,text[],timestamptz,timestamptz,uuid,boolean,boolean,boolean,boolean,text,integer,integer)') is null then raise exception 'search_solutions compatibility lost'; end if;
 if to_regprocedure('public.search_nearby_problems(double precision,double precision,double precision,text,text,text,text,text,text[],timestamptz,timestamptz,boolean,boolean,boolean,integer,integer)') is null then raise exception 'search_nearby_problems compatibility lost'; end if;
 if to_regprocedure('public.search_nearby_solutions(double precision,double precision,double precision,text,text,text,text[],uuid,timestamptz,timestamptz,boolean,boolean,boolean,boolean,integer,integer)') is null then raise exception 'search_nearby_solutions compatibility lost'; end if;
 if to_regprocedure('public.get_recommended_solutions(uuid,integer,integer)') is null then raise exception 'get_recommended_solutions compatibility lost'; end if;
 if not has_function_privilege('anon','public.normalize_taxonomy_name(text)','execute') or not has_function_privilege('authenticated','public.normalize_taxonomy_name(text)','execute') then raise exception 'normalization helper grants missing'; end if;
 if not has_function_privilege('anon','public.list_taxonomy_terms(public.taxonomy_kind,public.taxonomy_scope,text,integer,integer)','execute') or not has_function_privilege('authenticated','public.list_taxonomy_terms(public.taxonomy_kind,public.taxonomy_scope,text,integer,integer)','execute') then raise exception 'taxonomy listing grants missing'; end if;
 if has_function_privilege('anon','public.submit_taxonomy_proposal(text,public.taxonomy_kind,public.taxonomy_scope,text)','execute') or not has_function_privilege('authenticated','public.submit_taxonomy_proposal(text,public.taxonomy_kind,public.taxonomy_scope,text)','execute') then raise exception 'proposal grants invalid'; end if;
 if has_function_privilege('anon','public.is_taxonomy_moderator()','execute') or not has_function_privilege('authenticated','public.is_taxonomy_moderator()','execute') then raise exception 'moderator policy helper grants invalid'; end if;
 if has_function_privilege('anon','public.canonical_taxonomy_name(text,public.taxonomy_kind,public.taxonomy_scope)','execute') or has_function_privilege('authenticated','public.canonical_taxonomy_name(text,public.taxonomy_kind,public.taxonomy_scope)','execute') or has_function_privilege('authenticated','public.canonicalize_content_taxonomy()','execute') or has_function_privilege('authenticated','public.taxonomy_alias_guard()','execute') or has_function_privilege('authenticated','public.taxonomy_row_needs_canonicalization(text,text[],public.taxonomy_scope)','execute') then raise exception 'internal taxonomy helper exposed'; end if;
end $$;

select set_config('request.jwt.claim.sub','',false);
set role anon;
do $$ begin
 if auth.uid() is not null then raise exception 'anon identity was not clean'; end if;
 if not exists(select 1 from public.list_taxonomy_terms('category','problem',null,10,0)) then raise exception 'anon cannot list approved taxonomy'; end if;
 if exists(select 1 from public.taxonomy_terms where status<>'approved') then raise exception 'anon can read deprecated taxonomy'; end if;
end $$;
reset role;

-- Auth/RLS matrix. auth.uid() is driven by the isolated fixture setting.
insert into public.profiles(id,role) values
 ('35000000-0000-0000-0000-000000000001','member'),
 ('35000000-0000-0000-0000-000000000002','member'),
 ('35000000-0000-0000-0000-000000000003','curator'),
 ('35000000-0000-0000-0000-000000000004','admin');

set role authenticated;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000001',false);
do $$ begin if auth.uid()<>'35000000-0000-0000-0000-000000000001'::uuid then raise exception 'auth identity mismatch: 35000000-0000-0000-0000-000000000001'; end if; end $$;
do $$ begin begin perform public.submit_taxonomy_proposal('Infraestrutura','category','problem','Categoria já existente'); raise exception 'covered scope proposal accepted'; exception when unique_violation then null; end; end $$;
do $$ begin begin insert into public.taxonomy_proposals(proposed_name,normalized_name,kind,scope,justification,author_id) values('Bypass','bypass','tag','problem','Tentativa de bypass',auth.uid()); raise exception 'direct proposal insert accepted'; exception when insufficient_privilege then null; end; end $$;
select public.submit_taxonomy_proposal('Tag do usuário A','tag','problem','Justificativa válida A') as proposal_a \gset
do $$ begin
 if (select count(*) from public.my_taxonomy_proposals())<>1 then raise exception 'author cannot read own proposal'; end if;
 begin perform * from public.taxonomy_moderation_queue(); raise exception 'member accessed moderation queue'; exception when insufficient_privilege then null; end;
 begin perform public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag do usuário a'),'approved',null); raise exception 'member reviewed proposal'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000002',false);
do $$ begin if auth.uid()<>'35000000-0000-0000-0000-000000000002'::uuid then raise exception 'auth identity mismatch: 35000000-0000-0000-0000-000000000002'; end if; end $$;
do $$ begin if exists(select 1 from public.taxonomy_proposals where id=(select id from public.taxonomy_proposals where normalized_name='tag do usuário a')) then raise exception 'other user read private proposal'; end if; end $$;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000003',false);
do $$ begin if auth.uid()<>'35000000-0000-0000-0000-000000000003'::uuid then raise exception 'auth identity mismatch: 35000000-0000-0000-0000-000000000003'; end if; end $$;
do $$ begin if not exists(select 1 from public.taxonomy_moderation_queue() where id=(select id from public.taxonomy_proposals where normalized_name='tag do usuário a')) then raise exception 'curator cannot read queue'; end if; end $$;
select public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag do usuário a'),'approved','Termo conferido') as approved_term \gset
do $$ begin
 if not exists(select 1 from public.taxonomy_audit where proposal_id=(select id from public.taxonomy_proposals where normalized_name='tag do usuário a') and action='approved') then raise exception 'approval audit missing'; end if;
 if public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag do usuário a'),'approved','Idempotente')<>(select term_id from public.taxonomy_audit where proposal_id=(select id from public.taxonomy_proposals where normalized_name='tag do usuário a')) then raise exception 'approval is not idempotent'; end if;
 if (select count(*) from public.taxonomy_audit where proposal_id=(select id from public.taxonomy_proposals where normalized_name='tag do usuário a'))<>1 then raise exception 'idempotent review duplicated audit'; end if;
end $$;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000002',false);
do $$ begin if auth.uid()<>'35000000-0000-0000-0000-000000000002'::uuid then raise exception 'auth identity mismatch: 35000000-0000-0000-0000-000000000002'; end if; end $$;
do $$ begin if exists(select 1 from public.taxonomy_audit) then raise exception 'member can read taxonomy audit'; end if; end $$;
select public.submit_taxonomy_proposal('Tag rejeitada','tag','solution','Justificativa válida B') as proposal_b \gset
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000004',false);
do $$ begin if auth.uid()<>'35000000-0000-0000-0000-000000000004'::uuid then raise exception 'auth identity mismatch: 35000000-0000-0000-0000-000000000004'; end if; end $$;
do $$ begin if not exists(select 1 from public.taxonomy_moderation_queue() where normalized_name='tag rejeitada') then raise exception 'admin cannot read queue'; end if; end $$;
do $$ begin if not exists(select 1 from public.taxonomy_audit where action='approved') then raise exception 'admin cannot read taxonomy audit'; end if; end $$;
do $$ begin
 begin perform public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag rejeitada'),'rejected',''); raise exception 'rejection without reason accepted'; exception when sqlstate '22023' then null; end;
 if (select status from public.taxonomy_proposals where id=(select id from public.taxonomy_proposals where normalized_name='tag rejeitada'))<>'pending' then raise exception 'failed review did not roll back'; end if;
end $$;
select public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag rejeitada'),'rejected','Fora do escopo') is null;
do $$ begin if not exists(select 1 from public.taxonomy_audit where proposal_id=(select id from public.taxonomy_proposals where normalized_name='tag rejeitada') and action='rejected' and reason='Fora do escopo') then raise exception 'rejection audit missing'; end if; end $$;
reset role;

-- Global duplicate proposals are rejected even across authors/scopes.
set role authenticated;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000001',false);
do $$ begin if auth.uid()<>'35000000-0000-0000-0000-000000000001'::uuid then raise exception 'auth identity mismatch: 35000000-0000-0000-0000-000000000001'; end if; end $$;
select public.submit_taxonomy_proposal('Termo concorrente','tag','problem','Primeira justificativa') as concurrent_proposal \gset
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000002',false);
do $$ begin if auth.uid()<>'35000000-0000-0000-0000-000000000002'::uuid then raise exception 'auth identity mismatch: 35000000-0000-0000-0000-000000000002'; end if; end $$;
do $$ begin begin perform public.submit_taxonomy_proposal(' TERMO  CONCORRENTE ','tag','solution','Segunda justificativa'); raise exception 'duplicate pending proposal accepted'; exception when unique_violation then null; end; end $$;

reset role;
-- Approval in the opposite scope promotes a canonical term to `both`.
insert into public.taxonomy_terms(kind,scope,name,normalized_name,slug) values('tag','problem','Escopo compartilhado','escopo compartilhado','escopo-compartilhado-'||substr(md5('tag:escopo compartilhado'),1,8));
set role authenticated;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000002',false);
do $$ begin if auth.uid()<>'35000000-0000-0000-0000-000000000002'::uuid then raise exception 'auth identity mismatch before scope proposal'; end if; end $$;
select public.submit_taxonomy_proposal('Escopo compartilhado','tag','solution','Precisa atender soluções') as scope_proposal \gset
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000004',false);
do $$ begin if auth.uid()<>'35000000-0000-0000-0000-000000000004'::uuid then raise exception 'auth identity mismatch: 35000000-0000-0000-0000-000000000004'; end if; end $$;
select public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='escopo compartilhado'),'approved','Escopo confirmado');
do $$ begin if (select scope from public.taxonomy_terms where kind='tag' and normalized_name='escopo compartilhado')<>'both' then raise exception 'scope was not promoted to both'; end if; end $$;

-- Public pagination exposes approved terms only and reports the complete count.
do $$ declare reported bigint; actual bigint; begin
 select total_count into reported from public.list_taxonomy_terms('category','problem',null,1,0);
 select count(*) into actual from public.taxonomy_terms where kind='category' and status='approved' and scope in('problem','both');
 if reported<>actual or (select count(*) from public.list_taxonomy_terms('category','problem',null,1,1))<>1 then raise exception 'taxonomy pagination or total_count failed'; end if;
end $$;

-- Execute every Sprint 32--34 public contract after the Sprint 35 migration.
select count(*) from public.search_problems(p_query=>'drenagem');
select count(*) from public.search_solutions(p_query=>'drenagem');
select count(*) from public.search_nearby_problems(-23.5505,-46.6333,10);
select count(*) from public.search_nearby_solutions(-23.5505,-46.6333,10);
select count(*) from public.get_related_problems('00000000-0000-0000-0000-000000000001');
select count(*) from public.get_recommended_solutions('00000000-0000-0000-0000-000000000001');
select count(*) from public.get_related_problems_for_solution('00000000-0000-0000-0000-000000000002');
reset role;
insert into public.taxonomy_aliases(alias,normalized_alias,term_id) select 'Infra','infra',id from public.taxonomy_terms where kind='category' and normalized_name='infraestrutura';
do $$ begin begin insert into public.taxonomy_aliases(alias,normalized_alias,term_id) select 'INFRA','infra',id from public.taxonomy_terms where kind='category' and normalized_name='outros'; raise exception 'ambiguous alias accepted'; exception when unique_violation then null; end; end $$;
update public.problems set category='INFRA',tags=array[' drenagem ','DRENAGEM',''] where id='00000000-0000-0000-0000-000000000001';
do $$ begin
 if (select category from public.problems where id='00000000-0000-0000-0000-000000000001')<>'Infraestrutura' then raise exception 'alias canonicalization failed'; end if;
 if cardinality((select tags from public.problems where id='00000000-0000-0000-0000-000000000001'))<>1 then raise exception 'tag deduplication failed'; end if;
 begin update public.problems set category='unknown sprint 35' where id='00000000-0000-0000-0000-000000000001'; raise exception 'unknown term accepted'; exception when sqlstate '22023' then null; end;
 update public.taxonomy_terms set status='deprecated' where kind='tag' and normalized_name='drenagem';
 if not exists(select 1 from public.taxonomy_terms where kind='tag' and normalized_name='drenagem' and status='deprecated') then raise exception 'deprecated term status missing'; end if;
 if exists(select 1 from public.list_taxonomy_terms('tag','problem','DRENAGEM') where lower(name)=lower('DRENAGEM')) then raise exception 'deprecated term is public for exact case-insensitive search'; end if;
 begin update public.problems set tags=array['drenagem'] where id='00000000-0000-0000-0000-000000000001'; raise exception 'deprecated term accepted'; exception when sqlstate '22023' then null; end;
end $$;

select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$ begin
 if auth.uid()<>'35000000-0000-0000-0000-000000000001'::uuid then raise exception 'auth identity mismatch before deprecated proposal'; end if;
 begin perform public.submit_taxonomy_proposal('DRENAGEM','tag','problem','Tentativa de reativação indevida'); raise exception 'deprecated proposal accepted'; exception when sqlstate '55000' then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',false);
do $$ begin if auth.uid() is not null then raise exception 'identity was not cleared after scenarios'; end if; end $$;
