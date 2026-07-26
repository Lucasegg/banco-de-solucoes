-- Sprint 34: deterministic, explainable public recommendations.
begin;

-- Sprint 33 keeps its helper private. This narrow DEFINER wrapper only performs
-- immutable distance math; it reads no table, identity, or coordinate itself.
create or replace function public.recommendation_distance_km(double precision,double precision,double precision,double precision)
returns double precision language sql immutable strict parallel safe security definer set search_path=pg_catalog
as $$ select public.haversine_distance_km($1,$2,$3,$4) $$;

create or replace function public.get_related_problems(p_problem_id uuid,p_limit integer default 6,p_offset integer default 0)
returns table(id uuid,title text,summary text,category text,tags text[],city text,state text,updated_at timestamptz,recommendation_score numeric,recommendation_reasons text[],total_count bigint)
language sql stable security invoker set search_path=public as $$
with origin as (select * from public.problems where problems.id=p_problem_id and status<>'Arquivado'), candidates as (
 select p.*,o.category origin_category,o.city origin_city,o.state origin_state,
  (select count(distinct t) from unnest(coalesce(p.tags,'{}')) t where t=any(coalesce(o.tags,'{}'))) shared_tags,
  ts_rank_cd(to_tsvector('portuguese',coalesce(p.title,'')||' '||coalesce(p.summary,'')||' '||coalesce(p.description,'')),public.safe_search_tsquery(coalesce(o.title,'')||' '||coalesce(o.summary,''))) text_rank,
  case when public.public_problem_coordinate(o.latitude,o.geolocation_precision) is not null and public.public_problem_coordinate(p.latitude,p.geolocation_precision) is not null then public.recommendation_distance_km(public.public_problem_coordinate(o.latitude,o.geolocation_precision),public.public_problem_coordinate(o.longitude,o.geolocation_precision),public.public_problem_coordinate(p.latitude,p.geolocation_precision),public.public_problem_coordinate(p.longitude,p.geolocation_precision)) end distance
 from public.problems p cross join origin o where p.id<>o.id and p.status<>'Arquivado'
), scored as (select c.*,greatest(0,(case when category=origin_category then 35 else 0 end)+(least(shared_tags,5)*8)+(least(text_rank,1)*25)+(case when city=origin_city then 10 when state=origin_state then 5 else 0 end)+(case when distance<=10 then 10 when distance<=50 then 5 else 0 end)+least(5,ln(1+greatest(coalesce(likes,0),0))) )::numeric(8,3) score,
 array_remove(array[case when category=origin_category then 'Mesma categoria' end,case when shared_tags>0 then shared_tags||case when shared_tags=1 then ' tag em comum' else ' tags em comum' end end,case when text_rank>0.05 then 'Descrição semelhante' end,case when city=origin_city then 'Mesma cidade' when state=origin_state then 'Mesmo estado' end,case when distance<=50 then 'Próximo da localização do problema' end],null) reasons from candidates c
), numbered as (select *,count(*) over() n from scored where score>0)
select id,title,coalesce(summary,left(description,180)),category,tags,city,state,updated_at,score,reasons,n from numbered order by score desc,updated_at desc,id asc limit least(greatest(coalesce(p_limit,6),1),24) offset greatest(coalesce(p_offset,0),0)
$$;

create or replace function public.get_recommended_solutions(p_problem_id uuid,p_limit integer default 6,p_offset integer default 0)
returns table(id uuid,title text,summary text,category text,tags text[],location text,updated_at timestamptz,recommendation_score numeric,recommendation_reasons text[],total_count bigint)
language sql stable security invoker set search_path=public as $$
with origin as (select * from public.problems where problems.id=p_problem_id and status<>'Arquivado'), candidates as (
 select s.*,o.category origin_category,(select count(distinct t) from unnest(coalesce(s.tags,'{}')) t where t=any(coalesce(o.tags,'{}'))) shared_tags,
 ts_rank_cd(to_tsvector('portuguese',coalesce(s.title,'')||' '||coalesce(s.summary,'')||' '||coalesce(s.description,'')),public.safe_search_tsquery(coalesce(o.title,'')||' '||coalesce(o.summary,''))) text_rank,
 case when public.public_problem_coordinate(o.latitude,o.geolocation_precision) is not null and s.latitude is not null then public.recommendation_distance_km(public.public_problem_coordinate(o.latitude,o.geolocation_precision),public.public_problem_coordinate(o.longitude,o.geolocation_precision),s.latitude,s.longitude) end distance
 from public.solutions s cross join origin o where s.status<>'Arquivada' and not exists(select 1 from public.solution_problems sp where sp.solution_id=s.id and sp.problem_id=o.id)
), scored as (select c.*,greatest(0,(case when category=origin_category then 35 else 0 end)+(least(shared_tags,5)*8)+(least(text_rank,1)*25)+(case when cardinality(coalesce(evidence_links,'{}'))>0 then 7 else 0 end)+(case when nullif(btrim(impact_metric),'') is not null then 5 else 0 end)+(case when distance<=10 then 10 when distance<=50 then 5 else 0 end)+least(5,ln(1+greatest(coalesce(likes,0),0))))::numeric(8,3) score,
 array_remove(array[case when category=origin_category then 'Mesma categoria' end,case when shared_tags>0 then shared_tags||case when shared_tags=1 then ' tag em comum' else ' tags em comum' end end,case when text_rank>0.05 then 'Descrição semelhante' end,case when cardinality(coalesce(evidence_links,'{}'))>0 then 'Possui evidências públicas' end,case when nullif(btrim(impact_metric),'') is not null then 'Possui métrica de impacto' end,case when distance<=50 then 'Próximo da localização do problema' end],null) reasons from candidates c
), numbered as(select *,count(*) over() n from scored where score>0)
select id,title,summary,category,tags,location,updated_at,score,reasons,n from numbered order by score desc,updated_at desc,id asc limit least(greatest(coalesce(p_limit,6),1),24) offset greatest(coalesce(p_offset,0),0)
$$;

create or replace function public.get_related_problems_for_solution(p_solution_id uuid,p_limit integer default 6,p_offset integer default 0)
returns table(id uuid,title text,summary text,category text,tags text[],city text,state text,updated_at timestamptz,recommendation_score numeric,recommendation_reasons text[],total_count bigint)
language sql stable security invoker set search_path=public as $$
with origin as(select * from public.solutions where solutions.id=p_solution_id and status<>'Arquivada'), candidates as(select p.*,o.category origin_category,
 (select count(distinct t) from unnest(coalesce(p.tags,'{}')) t where t=any(coalesce(o.tags,'{}'))) shared_tags,
 ts_rank_cd(to_tsvector('portuguese',coalesce(p.title,'')||' '||coalesce(p.summary,'')||' '||coalesce(p.description,'')),public.safe_search_tsquery(coalesce(o.title,'')||' '||coalesce(o.summary,''))) text_rank,
 case when o.latitude is not null and public.public_problem_coordinate(p.latitude,p.geolocation_precision) is not null then public.recommendation_distance_km(o.latitude,o.longitude,public.public_problem_coordinate(p.latitude,p.geolocation_precision),public.public_problem_coordinate(p.longitude,p.geolocation_precision)) end distance
 from public.problems p cross join origin o where p.status<>'Arquivado' and not exists(select 1 from public.solution_problems sp where sp.solution_id=o.id and sp.problem_id=p.id)), scored as(select c.*,greatest(0,(case when category=origin_category then 35 else 0 end)+(least(shared_tags,5)*8)+(least(text_rank,1)*25)+(case when distance<=10 then 10 when distance<=50 then 5 else 0 end)+least(5,ln(1+greatest(coalesce(likes,0),0))))::numeric(8,3) score,array_remove(array[case when category=origin_category then 'Mesma categoria' end,case when shared_tags>0 then shared_tags||case when shared_tags=1 then ' tag em comum' else ' tags em comum' end end,case when text_rank>0.05 then 'Descrição semelhante' end,case when distance<=50 then 'Próximo da localização da solução' end],null) reasons from candidates c), numbered as(select *,count(*) over() n from scored where score>0)
select id,title,coalesce(summary,left(description,180)),category,tags,city,state,updated_at,score,reasons,n from numbered order by score desc,updated_at desc,id asc limit least(greatest(coalesce(p_limit,6),1),24) offset greatest(coalesce(p_offset,0),0)
$$;

revoke all on function public.recommendation_distance_km(double precision,double precision,double precision,double precision) from public,anon,authenticated;
grant execute on function public.recommendation_distance_km(double precision,double precision,double precision,double precision) to anon,authenticated;
revoke all on function public.get_related_problems(uuid,integer,integer),public.get_recommended_solutions(uuid,integer,integer),public.get_related_problems_for_solution(uuid,integer,integer) from public;
grant execute on function public.get_related_problems(uuid,integer,integer),public.get_recommended_solutions(uuid,integer,integer),public.get_related_problems_for_solution(uuid,integer,integer) to anon,authenticated;
commit;
