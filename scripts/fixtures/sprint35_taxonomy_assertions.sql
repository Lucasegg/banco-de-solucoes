\set ON_ERROR_STOP on
do $$ declare n integer; begin
 if to_regclass('public.taxonomy_terms') is null then raise exception 'Sprint 35 migration was not applied'; end if;
 select count(*) into n from public.taxonomy_terms where normalized_name in ('infraestrutura','drenagem'); if n<2 then raise exception 'taxonomy backfill failed'; end if;
 if exists(select 1 from public.taxonomy_terms group by kind,scope,normalized_name having count(*)>1) then raise exception 'duplicate canonical terms'; end if;
 if not (select relrowsecurity from pg_class where oid='public.taxonomy_proposals'::regclass) then raise exception 'proposal RLS disabled'; end if;
 if has_table_privilege('anon','public.taxonomy_proposals','select') then raise exception 'private proposals exposed to anon'; end if;
 if has_table_privilege('authenticated','public.taxonomy_terms','insert') then raise exception 'official terms writable by users'; end if;
 if (select prosecdef from pg_proc where oid='public.list_taxonomy_terms(public.taxonomy_kind,public.taxonomy_scope,text,integer,integer)'::regprocedure) then raise exception 'public list is not invoker'; end if;
 if not (select prosecdef from pg_proc where oid='public.review_taxonomy_proposal(uuid,public.taxonomy_proposal_status,text)'::regprocedure) then raise exception 'review RPC is not definer'; end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.problems'::regclass and tgname='problems_canonical_taxonomy') then raise exception 'problem write guard absent'; end if;
 if to_regprocedure('public.search_problems(text,text,text,text,text,text[],timestamptz,timestamptz,boolean,boolean,boolean,text,integer,integer)') is null then raise exception 'search_problems compatibility lost'; end if;
 if to_regprocedure('public.search_solutions(text,text,text,text[],timestamptz,timestamptz,uuid,boolean,boolean,boolean,boolean,text,integer,integer)') is null then raise exception 'search_solutions compatibility lost'; end if;
 if to_regprocedure('public.search_nearby_problems(double precision,double precision,double precision,text,text,text,text,text,text[],timestamptz,timestamptz,boolean,boolean,boolean,integer,integer)') is null then raise exception 'search_nearby_problems compatibility lost'; end if;
 if to_regprocedure('public.search_nearby_solutions(double precision,double precision,double precision,text,text,text,text[],uuid,timestamptz,timestamptz,boolean,boolean,boolean,boolean,integer,integer)') is null then raise exception 'search_nearby_solutions compatibility lost'; end if;
 if to_regprocedure('public.get_recommended_solutions(uuid,integer,integer)') is null then raise exception 'get_recommended_solutions compatibility lost'; end if;
end $$;

set role anon;
do $$ begin
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
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000001',true);
select public.submit_taxonomy_proposal('Tag do usuário A','tag','problem','Justificativa válida A') as proposal_a \gset
do $$ begin
 if (select count(*) from public.my_taxonomy_proposals())<>1 then raise exception 'author cannot read own proposal'; end if;
 begin perform * from public.taxonomy_moderation_queue(); raise exception 'member accessed moderation queue'; exception when insufficient_privilege then null; end;
 begin perform public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag do usuário a'),'approved',null); raise exception 'member reviewed proposal'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000002',true);
do $$ begin if exists(select 1 from public.taxonomy_proposals where id=(select id from public.taxonomy_proposals where normalized_name='tag do usuário a')) then raise exception 'other user read private proposal'; end if; end $$;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000003',true);
do $$ begin if not exists(select 1 from public.taxonomy_moderation_queue() where id=(select id from public.taxonomy_proposals where normalized_name='tag do usuário a')) then raise exception 'curator cannot read queue'; end if; end $$;
select public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag do usuário a'),'approved','Termo conferido') as approved_term \gset
do $$ begin
 if not exists(select 1 from public.taxonomy_audit where proposal_id=(select id from public.taxonomy_proposals where normalized_name='tag do usuário a') and action='approved') then raise exception 'approval audit missing'; end if;
 if public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag do usuário a'),'approved','Idempotente')<>(select term_id from public.taxonomy_audit where proposal_id=(select id from public.taxonomy_proposals where normalized_name='tag do usuário a')) then raise exception 'approval is not idempotent'; end if;
end $$;
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000002',true);
select public.submit_taxonomy_proposal('Tag rejeitada','tag','solution','Justificativa válida B') as proposal_b \gset
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000004',true);
do $$ begin
 begin perform public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag rejeitada'),'rejected',''); raise exception 'rejection without reason accepted'; exception when sqlstate '22023' then null; end;
 if (select status from public.taxonomy_proposals where id=(select id from public.taxonomy_proposals where normalized_name='tag rejeitada'))<>'pending' then raise exception 'failed review did not roll back'; end if;
end $$;
select public.review_taxonomy_proposal((select id from public.taxonomy_proposals where normalized_name='tag rejeitada'),'rejected','Fora do escopo') is null;
do $$ begin if not exists(select 1 from public.taxonomy_audit where proposal_id=(select id from public.taxonomy_proposals where normalized_name='tag rejeitada') and action='rejected' and reason='Fora do escopo') then raise exception 'rejection audit missing'; end if; end $$;
reset role;

-- Global duplicate proposals are rejected even across authors/scopes.
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000001',true);
select public.submit_taxonomy_proposal('Termo concorrente','tag','problem','Primeira justificativa') as concurrent_proposal \gset
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000002',true);
do $$ begin begin perform public.submit_taxonomy_proposal(' TERMO  CONCORRENTE ','tag','solution','Segunda justificativa'); raise exception 'duplicate pending proposal accepted'; exception when unique_violation then null; end; end $$;

-- Approval in the opposite scope promotes a canonical term to `both`.
insert into public.taxonomy_terms(kind,scope,name,normalized_name,slug) values('tag','problem','Escopo compartilhado','escopo compartilhado','escopo-compartilhado-'||substr(md5('tag:escopo compartilhado'),1,8));
insert into public.taxonomy_proposals(proposed_name,normalized_name,kind,scope,justification,author_id) values('Escopo compartilhado','escopo compartilhado','tag','solution','Precisa atender soluções','35000000-0000-0000-0000-000000000002') returning id as scope_proposal \gset
select set_config('request.jwt.claim.sub','35000000-0000-0000-0000-000000000004',true);
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
insert into public.taxonomy_aliases(alias,normalized_alias,term_id) select 'Infra','infra',id from public.taxonomy_terms where kind='category' and normalized_name='infraestrutura';
do $$ begin begin insert into public.taxonomy_aliases(alias,normalized_alias,term_id) select 'INFRA','infra',id from public.taxonomy_terms where kind='category' and normalized_name='cultura'; raise exception 'ambiguous alias accepted'; exception when unique_violation then null; end; end $$;
update public.problems set category='INFRA',tags=array[' drenagem ','DRENAGEM',''] where id='00000000-0000-0000-0000-000000000001';
do $$ begin
 if (select category from public.problems where id='00000000-0000-0000-0000-000000000001')<>'Infraestrutura' then raise exception 'alias canonicalization failed'; end if;
 if cardinality((select tags from public.problems where id='00000000-0000-0000-0000-000000000001'))<>1 then raise exception 'tag deduplication failed'; end if;
 begin update public.problems set category='unknown sprint 35' where id='00000000-0000-0000-0000-000000000001'; raise exception 'unknown term accepted'; exception when sqlstate '22023' then null; end;
 update public.taxonomy_terms set status='deprecated' where kind='tag' and normalized_name='drenagem';
 if exists(select 1 from public.list_taxonomy_terms('tag','problem','drenagem') where name='drenagem') then raise exception 'deprecated term is public'; end if;
 begin update public.problems set tags=array['drenagem'] where id='00000000-0000-0000-0000-000000000001'; raise exception 'deprecated term accepted'; exception when sqlstate '22023' then null; end;
end $$;
