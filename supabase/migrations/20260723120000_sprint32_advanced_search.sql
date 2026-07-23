-- Sprint 32: server-side public catalogue search.  The GIN indexes support the
-- exact weighted tsvectors used below; the remaining indexes avoid scanning link
-- and favourite tables when filters are combined with a page request.
begin;

create index if not exists problems_search_document_idx on public.problems using gin
  ((setweight(to_tsvector('portuguese', title),'A') || setweight(to_tsvector('portuguese', coalesce(summary,'')),'B') || setweight(to_tsvector('portuguese', description),'C') || setweight(to_tsvector('portuguese', category || ' ' || city || ' ' || state || ' ' || array_to_string(tags,' ')),'D')));
create index if not exists solutions_search_document_idx on public.solutions using gin
  ((setweight(to_tsvector('portuguese', title),'A') || setweight(to_tsvector('portuguese', summary),'B') || setweight(to_tsvector('portuguese', description),'C') || setweight(to_tsvector('portuguese', category || ' ' || organization || ' ' || impact_metric || ' ' || array_to_string(tags,' ')),'D')));
create index if not exists problems_search_filters_idx on public.problems(status, category, created_at desc, id);
create index if not exists solutions_search_filters_idx on public.solutions(category, created_at desc, id);
create index if not exists solution_problems_solution_problem_idx on public.solution_problems(solution_id, problem_id);

create or replace function public.safe_search_tsquery(p_query text) returns tsquery
language plpgsql immutable set search_path = pg_catalog as $$
begin
  if nullif(btrim(p_query), '') is null then return null; end if;
  return websearch_to_tsquery('portuguese', left(regexp_replace(p_query, '\s+', ' ', 'g'), 160));
exception when others then
  return plainto_tsquery('portuguese', left(regexp_replace(p_query, '\s+', ' ', 'g'), 160));
end;
$$;

create or replace function public.search_problems(
  p_query text default null, p_category text default null, p_status text default null,
  p_state text default null, p_city text default null, p_tags text[] default null,
  p_created_from timestamptz default null, p_created_to timestamptz default null,
  p_has_solution boolean default null, p_favorites_only boolean default false,
  p_authored_only boolean default false, p_sort text default 'recent',
  p_limit integer default 20, p_offset integer default 0
) returns table(id uuid, title text, summary text, category text, status text, city text,
  state text, tags text[], author_name text, created_at timestamptz, updated_at timestamptz,
  solution_count bigint, favorites integer, comments integer, total_count bigint)
language sql stable set search_path = public as $$
  with args as (
    select left(regexp_replace(coalesce(p_query, ''), '\\s+', ' ', 'g'), 160) q,
      least(greatest(coalesce(p_limit,20),1),50) lim, greatest(coalesce(p_offset,0),0) off,
      case when p_sort='relevance' and nullif(btrim(p_query),'') is null then 'recent' when p_sort in ('relevance','recent','oldest','favorites','comments','updated') then p_sort else 'recent' end sort
  ), query as (select case when q='' then null else public.safe_search_tsquery(q) end tsq from args), matches as (
    select p.*, count(sp.solution_id) as solution_count,
      ts_rank_cd(setweight(to_tsvector('portuguese', coalesce(p.title,'')),'A') || setweight(to_tsvector('portuguese',coalesce(p.summary,'')),'B') || setweight(to_tsvector('portuguese',p.description),'C') || setweight(to_tsvector('portuguese',concat_ws(' ',p.category,array_to_string(p.tags,' '))),'D'), q.tsq) relevance
    from public.problems p cross join args a cross join query q left join public.solution_problems sp on sp.problem_id=p.id
    where p.status <> 'Arquivado'
      and (a.q = '' or (setweight(to_tsvector('portuguese',p.title),'A') || setweight(to_tsvector('portuguese',coalesce(p.summary,'')),'B') || setweight(to_tsvector('portuguese',p.description),'C') || setweight(to_tsvector('portuguese',p.category || ' ' || p.city || ' ' || p.state || ' ' || array_to_string(p.tags,' ')),'D')) @@ q.tsq)
      and (p_category is null or p.category=p_category) and (p_status is null or p.status=p_status)
      and (p_state is null or p.state=p_state) and (p_city is null or p.city=p_city)
      and (p_tags is null or p.tags @> p_tags) and (p_created_from is null or p.created_at>=p_created_from) and (p_created_to is null or p.created_at<=p_created_to)
      and (p_has_solution is null or p_has_solution = exists(select 1 from public.solution_problems x where x.problem_id=p.id))
      and (not coalesce(p_favorites_only,false) or exists(select 1 from public.favorites f where f.problem_id=p.id and f.user_id=auth.uid()))
      and (not coalesce(p_authored_only,false) or p.author_id=auth.uid())
    group by p.id, a.q
  ), numbered as (select *, count(*) over() total_count from matches)
  select id,title,coalesce(summary,left(description,180)),category,status,city,state,tags,
    coalesce(author_name,'Usuário da plataforma'),created_at,updated_at,solution_count,likes,comments,total_count
  from numbered cross join args
  order by case when args.sort='relevance' and args.q<>'' then relevance end desc nulls last,
    case when args.sort='oldest' then created_at end asc, case when args.sort in ('recent','relevance') then created_at end desc,
    case when args.sort='favorites' then likes end desc, case when args.sort='comments' then comments end desc,
    case when args.sort='updated' then updated_at end desc, id asc limit args.lim offset args.off;
$$;

create or replace function public.search_solutions(
  p_query text default null, p_category text default null, p_organization text default null,
  p_tags text[] default null, p_created_from timestamptz default null, p_created_to timestamptz default null,
  p_problem_id uuid default null, p_favorites_only boolean default false, p_authored_only boolean default false,
  p_has_evidence boolean default null, p_has_impact_metric boolean default null, p_sort text default 'recent',
  p_limit integer default 20, p_offset integer default 0
) returns table(id uuid, title text, summary text, category text, organization text, tags text[], author_name text,
  created_at timestamptz, updated_at timestamptz, problem_ids uuid[], impact_metric text, favorites integer, comments integer, total_count bigint)
language sql stable set search_path = public as $$
  with args as (select left(regexp_replace(coalesce(p_query,''),'\\s+',' ','g'),160) q, least(greatest(coalesce(p_limit,20),1),50) lim, greatest(coalesce(p_offset,0),0) off, case when p_sort='relevance' and nullif(btrim(p_query),'') is null then 'recent' when p_sort in ('relevance','recent','oldest','favorites','comments','updated') then p_sort else 'recent' end sort),
  query as (select case when q='' then null else public.safe_search_tsquery(q) end tsq from args),
  matches as (select s.*, array_remove(array_agg(sp.problem_id),null) problem_ids,
    ts_rank_cd(setweight(to_tsvector('portuguese',s.title),'A') || setweight(to_tsvector('portuguese',s.summary),'B') || setweight(to_tsvector('portuguese',s.description),'C') || setweight(to_tsvector('portuguese',concat_ws(' ',s.category,s.organization,s.impact_metric,array_to_string(s.tags,' '))),'D'),q.tsq) relevance
    from public.solutions s cross join args a cross join query q left join public.solution_problems sp on sp.solution_id=s.id
    where s.status <> 'Arquivada' and (a.q='' or (setweight(to_tsvector('portuguese',s.title),'A') || setweight(to_tsvector('portuguese',s.summary),'B') || setweight(to_tsvector('portuguese',s.description),'C') || setweight(to_tsvector('portuguese',s.category || ' ' || s.organization || ' ' || s.impact_metric || ' ' || array_to_string(s.tags,' ')),'D')) @@ q.tsq)
      and (p_category is null or s.category=p_category) and (p_organization is null or s.organization=p_organization) and (p_tags is null or s.tags @> p_tags)
      and (p_created_from is null or s.created_at>=p_created_from) and (p_created_to is null or s.created_at<=p_created_to)
      and (p_problem_id is null or exists(select 1 from public.solution_problems x where x.solution_id=s.id and x.problem_id=p_problem_id))
      and (p_has_evidence is null or p_has_evidence=(cardinality(s.evidence_links)>0)) and (p_has_impact_metric is null or p_has_impact_metric=(nullif(btrim(s.impact_metric),'') is not null))
      and (not coalesce(p_favorites_only,false) or exists(select 1 from public.favorites f where f.solution_id=s.id and f.user_id=auth.uid())) and (not coalesce(p_authored_only,false) or s.author_id=auth.uid()) group by s.id,a.q),
  numbered as (select *,count(*) over() total_count from matches)
  select id,title,summary,category,organization,tags,coalesce(author_name,'Usuário da plataforma'),created_at,updated_at,problem_ids,impact_metric,likes,comments,total_count from numbered cross join args
  order by case when args.sort='relevance' and args.q<>'' then relevance end desc nulls last,case when args.sort='oldest' then created_at end asc,case when args.sort in ('recent','relevance') then created_at end desc,case when args.sort='favorites' then likes end desc,case when args.sort='comments' then comments end desc,case when args.sort='updated' then updated_at end desc,id asc limit args.lim offset args.off;
$$;

revoke all on function public.safe_search_tsquery(text) from public, anon, authenticated;
revoke all on function public.search_problems(text,text,text,text,text,text[],timestamptz,timestamptz,boolean,boolean,boolean,text,integer,integer) from public;
revoke all on function public.search_solutions(text,text,text,text[],timestamptz,timestamptz,uuid,boolean,boolean,boolean,boolean,text,integer,integer) from public;
grant execute on function public.search_problems(text,text,text,text,text,text[],timestamptz,timestamptz,boolean,boolean,boolean,text,integer,integer) to anon, authenticated;
grant execute on function public.search_solutions(text,text,text,text[],timestamptz,timestamptz,uuid,boolean,boolean,boolean,boolean,text,integer,integer) to anon, authenticated;
commit;
