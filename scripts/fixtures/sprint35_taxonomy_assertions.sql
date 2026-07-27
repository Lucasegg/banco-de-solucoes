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
 if to_regprocedure('public.search_problems(text,text,text[],text,text,boolean,boolean,text,integer,integer)') is null then raise exception 'search_problems compatibility lost'; end if;
 if to_regprocedure('public.search_nearby_solutions(double precision,double precision,double precision,text,text,text[],text,text,boolean,boolean,text,integer,integer)') is null then raise exception 'search_nearby_solutions compatibility lost'; end if;
 if to_regprocedure('public.get_recommended_solutions(uuid,integer,integer)') is null then raise exception 'get_recommended_solutions compatibility lost'; end if;
end $$;
insert into public.taxonomy_aliases(alias,normalized_alias,term_id) select 'Infra','infra',id from public.taxonomy_terms where kind='category' and normalized_name='infraestrutura';
update public.problems set category='INFRA',tags=array[' drenagem ','DRENAGEM',''] where id='00000000-0000-0000-0000-000000000001';
do $$ begin
 if (select category from public.problems where id='00000000-0000-0000-0000-000000000001')<>'Infraestrutura' then raise exception 'alias canonicalization failed'; end if;
 if cardinality((select tags from public.problems where id='00000000-0000-0000-0000-000000000001'))<>1 then raise exception 'tag deduplication failed'; end if;
 begin update public.problems set category='unknown sprint 35' where id='00000000-0000-0000-0000-000000000001'; raise exception 'unknown term accepted'; exception when sqlstate '22023' then null; end;
 update public.taxonomy_terms set status='deprecated' where kind='tag' and normalized_name='drenagem';
 begin update public.problems set tags=array['drenagem'] where id='00000000-0000-0000-0000-000000000001'; raise exception 'deprecated term accepted'; exception when sqlstate '22023' then null; end;
end $$;
