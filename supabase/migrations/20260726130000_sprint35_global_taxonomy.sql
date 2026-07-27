-- Sprint 35: global, moderated taxonomy. Existing category/tags columns remain the
-- compatibility representation consumed by Sprints 32--34.
begin;
create extension if not exists pgcrypto;

create type public.taxonomy_kind as enum ('category','tag');
create type public.taxonomy_scope as enum ('problem','solution','both');
create type public.taxonomy_term_status as enum ('approved','deprecated');
create type public.taxonomy_proposal_status as enum ('pending','approved','rejected');

create function public.normalize_taxonomy_name(value text) returns text
language sql immutable strict parallel safe set search_path=pg_catalog
as $$ select lower(regexp_replace(btrim(value), '\s+', ' ', 'g')) $$;

create table public.taxonomy_terms (
 id uuid primary key default gen_random_uuid(), kind public.taxonomy_kind not null,
 scope public.taxonomy_scope not null, name text not null check (name=btrim(name) and length(name) between 1 and 80),
 normalized_name text not null check (normalized_name=public.normalize_taxonomy_name(name)),
 slug text not null check (length(slug) between 1 and 100), status public.taxonomy_term_status not null default 'approved',
 replacement_term_id uuid references public.taxonomy_terms(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(kind,scope,normalized_name), unique(kind,scope,slug),
 check (replacement_term_id is null or status='deprecated')
);
create table public.taxonomy_aliases (
 id uuid primary key default gen_random_uuid(), alias text not null check(alias=btrim(alias) and length(alias) between 1 and 80),
 normalized_alias text not null check(normalized_alias=public.normalize_taxonomy_name(alias)),
 term_id uuid not null references public.taxonomy_terms(id) on delete cascade,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(term_id,normalized_alias)
);
create table public.taxonomy_proposals (
 id uuid primary key default gen_random_uuid(), proposed_name text not null check(proposed_name=btrim(proposed_name) and length(proposed_name) between 1 and 80),
 normalized_name text not null check(normalized_name=public.normalize_taxonomy_name(proposed_name)), kind public.taxonomy_kind not null,
 scope public.taxonomy_scope not null, justification text not null check(length(btrim(justification)) between 10 and 1000),
 author_id uuid not null, status public.taxonomy_proposal_status not null default 'pending', reviewer_id uuid,
 decision_reason text check(decision_reason is null or length(btrim(decision_reason)) between 3 and 1000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), reviewed_at timestamptz,
 check ((status='pending' and reviewer_id is null and reviewed_at is null and decision_reason is null) or
        (status in ('approved','rejected') and reviewer_id is not null and reviewed_at is not null))
);
create unique index taxonomy_one_pending_proposal on public.taxonomy_proposals(kind,normalized_name) where status='pending';
create table public.taxonomy_audit (
 id bigint generated always as identity primary key, proposal_id uuid not null references public.taxonomy_proposals(id) on delete restrict,
 action public.taxonomy_proposal_status not null check(action in ('approved','rejected')), actor_id uuid,
 term_id uuid references public.taxonomy_terms(id) on delete set null, reason text, created_at timestamptz not null default now()
);

create function public.taxonomy_slug(value text) returns text language sql immutable strict parallel safe set search_path=pg_catalog
as $$ select trim(both '-' from regexp_replace(public.normalize_taxonomy_name(value),'[^a-z0-9]+','-','g')) $$;

-- Seed every official category even when the catalog has no matching row. Existing
-- values are then folded in without inventing tags or merging distinct names.
with raw(kind,scope,name,curated) as (
 select 'category'::public.taxonomy_kind,'both'::public.taxonomy_scope,name,true from unnest(array['Infraestrutura','Educação','Saúde','Segurança','Tecnologia','Mobilidade','Meio Ambiente','Assistência Social','Empreendedorismo','Outros']) name union all
 select 'category','problem',btrim(category),false from public.problems where nullif(btrim(category),'') is not null union all
 select 'category','solution',btrim(category),false from public.solutions where nullif(btrim(category),'') is not null union all
 select 'tag','problem',btrim(t),false from public.problems cross join lateral unnest(tags) t where nullif(btrim(t),'') is not null union all
 select 'tag','solution',btrim(t),false from public.solutions cross join lateral unnest(tags) t where nullif(btrim(t),'') is not null
), grouped as (
 select kind,public.normalize_taxonomy_name(name) normalized,
 coalesce(max(name) filter(where curated),case when kind='tag' then public.normalize_taxonomy_name(name) else min(name collate "C") end) name,
 case when bool_or(scope='both') or count(distinct scope)=2 then 'both'::public.taxonomy_scope else min(scope::text)::public.taxonomy_scope end scope
 from raw group by kind,public.normalize_taxonomy_name(name)
), prepared as (
 select *,coalesce(nullif(public.taxonomy_slug(name),''),'term') slug_base from grouped
)
insert into public.taxonomy_terms(kind,scope,name,normalized_name,slug)
select kind,scope,name,normalized,slug_base||'-'||substr(md5(kind::text||':'||normalized),1,8)
from prepared order by kind,normalized;

create function public.taxonomy_term_guard() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare k public.taxonomy_kind; s public.taxonomy_scope; n text; collision boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.normalized_name||new.kind::text,0));
 select exists(select 1 from public.taxonomy_terms t where t.kind=new.kind and t.id<>coalesce(new.id,gen_random_uuid()) and t.normalized_name=new.normalized_name and (t.scope=new.scope or t.scope='both' or new.scope='both')) into collision;
 if collision then raise exception 'taxonomy term conflicts with an applicable scope' using errcode='23505'; end if;
 return new;
end $$;
create trigger taxonomy_term_guard before insert or update on public.taxonomy_terms for each row execute function public.taxonomy_term_guard();

create function public.taxonomy_alias_guard() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare target public.taxonomy_terms; collision boolean;
begin
 select * into strict target from public.taxonomy_terms where id=new.term_id;
 perform pg_advisory_xact_lock(hashtextextended(new.normalized_alias||target.kind::text,0));
 select exists(select 1 from public.taxonomy_aliases a join public.taxonomy_terms t on t.id=a.term_id where a.id<>coalesce(new.id,gen_random_uuid()) and a.normalized_alias=new.normalized_alias and t.kind=target.kind and (t.scope=target.scope or t.scope='both' or target.scope='both')) into collision;
 if collision or exists(select 1 from public.taxonomy_terms t where t.kind=target.kind and t.normalized_name=new.normalized_alias and (t.scope=target.scope or t.scope='both' or target.scope='both') and t.id<>target.id) then raise exception 'ambiguous taxonomy alias' using errcode='23505'; end if;
 return new;
end $$;
create trigger taxonomy_alias_guard before insert or update on public.taxonomy_aliases for each row execute function public.taxonomy_alias_guard();

create function public.canonical_taxonomy_name(value text,k public.taxonomy_kind,s public.taxonomy_scope) returns text
language sql stable security invoker set search_path=public,pg_catalog as $$
 select t.name from public.taxonomy_terms t left join public.taxonomy_aliases a on a.term_id=t.id
 where t.kind=k and t.status='approved' and (t.scope=s or t.scope='both') and (t.normalized_name=public.normalize_taxonomy_name(value) or a.normalized_alias=public.normalize_taxonomy_name(value)) limit 1
$$;
create function public.canonicalize_content_taxonomy() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare s public.taxonomy_scope:=case when tg_table_name='problems' then 'problem' else 'solution' end; c text; output text[]:='{}'; item text;
begin
 if length(btrim(new.category))>80 then raise exception 'invalid taxonomy value' using errcode='22023'; end if;
 c:=public.canonical_taxonomy_name(new.category,'category',s); if c is null then raise exception 'unknown taxonomy category' using errcode='22023'; end if; new.category:=c;
 if cardinality(new.tags)>20 then raise exception 'too many taxonomy tags' using errcode='22023'; end if;
 foreach item in array coalesce(new.tags,'{}') loop if nullif(btrim(item),'') is not null then
   if length(btrim(item))>80 then raise exception 'invalid taxonomy value' using errcode='22023'; end if;
   c:=public.canonical_taxonomy_name(item,'tag',s); if c is null then raise exception 'unknown taxonomy tag' using errcode='22023'; end if;
   if not c=any(output) then output:=array_append(output,c); end if;
 end if; end loop; new.tags:=output; return new;
end $$;
create trigger problems_canonical_taxonomy before insert or update of category,tags on public.problems for each row execute function public.canonicalize_content_taxonomy();
create trigger solutions_canonical_taxonomy before insert or update of category,tags on public.solutions for each row execute function public.canonicalize_content_taxonomy();

-- Canonicalize only dirty legacy rows. Suppress favorite notifications and
-- temporarily preserve updated_at when the historical timestamp triggers exist.
create function public.taxonomy_row_needs_canonicalization(p_category text,p_tags text[],p_scope public.taxonomy_scope) returns boolean
language sql stable security definer set search_path=public,pg_catalog as $$
 select p_category is distinct from public.canonical_taxonomy_name(p_category,'category',p_scope)
 or coalesce(p_tags,'{}') is distinct from coalesce((select array_agg(name order by first_position) from (
   select name,min(position) first_position from unnest(coalesce(p_tags,'{}')) with ordinality source(value,position)
   cross join lateral (select public.canonical_taxonomy_name(value,'tag',p_scope) name) canonical
   where nullif(btrim(value),'') is not null group by name
 ) normalized),'{}')
$$;
select set_config('app.official_update','true',true);
do $$ begin
 if exists(select 1 from pg_trigger where tgrelid='public.problems'::regclass and tgname='set_problems_updated_at_before_update') then alter table public.problems disable trigger set_problems_updated_at_before_update; end if;
 if exists(select 1 from pg_trigger where tgrelid='public.solutions'::regclass and tgname='set_solutions_updated_at_before_update') then alter table public.solutions disable trigger set_solutions_updated_at_before_update; end if;
end $$;
update public.problems set category=category,tags=tags where public.taxonomy_row_needs_canonicalization(category,tags,'problem');
update public.solutions set category=category,tags=tags where public.taxonomy_row_needs_canonicalization(category,tags,'solution');
do $$ begin
 if exists(select 1 from pg_trigger where tgrelid='public.problems'::regclass and tgname='set_problems_updated_at_before_update' and tgenabled='D') then alter table public.problems enable trigger set_problems_updated_at_before_update; end if;
 if exists(select 1 from pg_trigger where tgrelid='public.solutions'::regclass and tgname='set_solutions_updated_at_before_update' and tgenabled='D') then alter table public.solutions enable trigger set_solutions_updated_at_before_update; end if;
end $$;
select set_config('app.official_update','false',true);

create function public.is_taxonomy_moderator() returns boolean language sql stable security definer set search_path=public,pg_catalog as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role::text in ('curator','admin'))
$$;
create function public.list_taxonomy_terms(p_kind public.taxonomy_kind default null,p_scope public.taxonomy_scope default null,p_query text default null,p_limit int default 50,p_offset int default 0)
returns table(id uuid,kind public.taxonomy_kind,scope public.taxonomy_scope,name text,slug text,total_count bigint) language sql stable security invoker set search_path=public,pg_catalog as $$
 with q as(select t.*,count(*) over() n from public.taxonomy_terms t where status='approved' and (p_kind is null or kind=p_kind) and (p_scope is null or scope=p_scope or scope='both') and (nullif(btrim(p_query),'') is null or normalized_name like '%'||public.normalize_taxonomy_name(p_query)||'%')) select id,kind,scope,name,slug,n from q order by normalized_name,id limit least(greatest(coalesce(p_limit,50),1),100) offset greatest(coalesce(p_offset,0),0)
$$;
create function public.submit_taxonomy_proposal(p_name text,p_kind public.taxonomy_kind,p_scope public.taxonomy_scope,p_justification text) returns uuid language plpgsql security definer set search_path=public,pg_catalog as $$
declare result uuid; normalized text:=public.normalize_taxonomy_name(p_name); begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(normalized||p_kind::text,0));
 if exists(select 1 from public.taxonomy_terms where kind=p_kind and normalized_name=normalized and status='deprecated') then raise exception 'deprecated terms require a separate administrative action' using errcode='55000'; end if;
 if exists(select 1 from public.taxonomy_terms where kind=p_kind and normalized_name=normalized and status='approved' and (scope=p_scope or scope='both')) then raise exception 'term already covers requested scope' using errcode='23505'; end if;
 insert into public.taxonomy_proposals(proposed_name,normalized_name,kind,scope,justification,author_id) values(btrim(p_name),normalized,p_kind,p_scope,btrim(p_justification),auth.uid()) returning id into result; return result;
end $$;
create function public.my_taxonomy_proposals(p_limit int default 50,p_offset int default 0) returns setof public.taxonomy_proposals language sql stable security invoker set search_path=public,pg_catalog as $$ select * from public.taxonomy_proposals where author_id=auth.uid() order by created_at desc,id limit least(greatest(coalesce(p_limit,50),1),100) offset greatest(coalesce(p_offset,0),0) $$;
create function public.taxonomy_moderation_queue(p_limit int default 50,p_offset int default 0) returns setof public.taxonomy_proposals language plpgsql stable security definer set search_path=public,pg_catalog as $$ begin if auth.uid() is null or not public.is_taxonomy_moderator() then raise exception 'not authorized' using errcode='42501'; end if; return query select * from public.taxonomy_proposals where status='pending' order by created_at,id limit least(greatest(coalesce(p_limit,50),1),100) offset greatest(coalesce(p_offset,0),0); end $$;
create function public.review_taxonomy_proposal(p_proposal_id uuid,p_decision public.taxonomy_proposal_status,p_reason text default null) returns uuid language plpgsql security definer set search_path=public,pg_catalog as $$
declare p public.taxonomy_proposals; term uuid; canonical text; begin
 if auth.uid() is null or not public.is_taxonomy_moderator() then raise exception 'not authorized' using errcode='42501'; end if;
 if p_decision not in ('approved','rejected') or (p_decision='rejected' and length(btrim(coalesce(p_reason,'')))<3) then raise exception 'a rejection reason is required' using errcode='22023'; end if;
 select * into strict p from public.taxonomy_proposals where id=p_proposal_id for update;
 if p.status<>'pending' then select term_id into term from public.taxonomy_audit where proposal_id=p.id limit 1; return term; end if;
 if p_decision='approved' then
  perform pg_advisory_xact_lock(hashtextextended(p.normalized_name||p.kind::text,0));
  select id into term from public.taxonomy_terms where kind=p.kind and normalized_name=p.normalized_name and status='approved' limit 1 for update;
  if term is null and exists(select 1 from public.taxonomy_terms where kind=p.kind and normalized_name=p.normalized_name and status='deprecated') then raise exception 'deprecated terms require a separate administrative action' using errcode='55000'; end if;
  if term is null then canonical:=p.proposed_name; insert into public.taxonomy_terms(kind,scope,name,normalized_name,slug) values(p.kind,p.scope,canonical,p.normalized_name,coalesce(nullif(public.taxonomy_slug(canonical),''),'term')||'-'||substr(md5(p.kind::text||':'||p.normalized_name),1,8)) returning id into term;
  else update public.taxonomy_terms set scope=case when scope=p.scope or scope='both' then scope else 'both' end,updated_at=now() where id=term; end if;
 end if;
 update public.taxonomy_proposals set status=p_decision,reviewer_id=auth.uid(),decision_reason=nullif(btrim(p_reason),''),reviewed_at=now(),updated_at=now() where id=p.id;
 insert into public.taxonomy_audit(proposal_id,action,actor_id,term_id,reason) values(p.id,p_decision,auth.uid(),term,nullif(btrim(p_reason),'')); return term;
end $$;

alter table public.taxonomy_terms enable row level security; alter table public.taxonomy_aliases enable row level security; alter table public.taxonomy_proposals enable row level security; alter table public.taxonomy_audit enable row level security;
create policy taxonomy_terms_read on public.taxonomy_terms for select using(status='approved');
create policy taxonomy_aliases_read on public.taxonomy_aliases for select using(exists(select 1 from public.taxonomy_terms t where t.id=term_id and t.status='approved'));
create policy proposals_own_read on public.taxonomy_proposals for select to authenticated using(author_id=auth.uid() or public.is_taxonomy_moderator());
create policy audit_moderator_read on public.taxonomy_audit for select to authenticated using(public.is_taxonomy_moderator());
revoke all on public.taxonomy_terms,public.taxonomy_aliases,public.taxonomy_proposals,public.taxonomy_audit from public,anon,authenticated;
grant select on public.taxonomy_terms,public.taxonomy_aliases to anon,authenticated; grant select on public.taxonomy_proposals to authenticated;
grant select on public.taxonomy_audit to authenticated;
revoke all on function public.list_taxonomy_terms(public.taxonomy_kind,public.taxonomy_scope,text,int,int),public.submit_taxonomy_proposal(text,public.taxonomy_kind,public.taxonomy_scope,text),public.my_taxonomy_proposals(int,int),public.taxonomy_moderation_queue(int,int),public.review_taxonomy_proposal(uuid,public.taxonomy_proposal_status,text) from public,anon,authenticated;
grant execute on function public.list_taxonomy_terms(public.taxonomy_kind,public.taxonomy_scope,text,int,int) to anon,authenticated;
grant execute on function public.submit_taxonomy_proposal(text,public.taxonomy_kind,public.taxonomy_scope,text),public.my_taxonomy_proposals(int,int),public.taxonomy_moderation_queue(int,int),public.review_taxonomy_proposal(uuid,public.taxonomy_proposal_status,text) to authenticated;
revoke all on function public.normalize_taxonomy_name(text),public.taxonomy_slug(text),public.canonical_taxonomy_name(text,public.taxonomy_kind,public.taxonomy_scope),public.is_taxonomy_moderator(),public.taxonomy_term_guard(),public.taxonomy_alias_guard(),public.canonicalize_content_taxonomy(),public.taxonomy_row_needs_canonicalization(text,text[],public.taxonomy_scope) from public,anon,authenticated;
grant execute on function public.normalize_taxonomy_name(text) to anon,authenticated;
grant execute on function public.is_taxonomy_moderator() to authenticated;
commit;
