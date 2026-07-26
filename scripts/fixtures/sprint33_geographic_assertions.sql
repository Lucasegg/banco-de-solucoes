-- Runtime assertions for the real Sprint 33 migration on PostgreSQL 15.
-- This file intentionally calls the created functions instead of reproducing them.
do $$
declare
  constraint_count integer;
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='solutions' and column_name='latitude' and data_type='double precision') then raise exception 'solutions.latitude is missing or has the wrong type'; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='solutions' and column_name='longitude' and data_type='double precision') then raise exception 'solutions.longitude is missing or has the wrong type'; end if;
  select count(*) into constraint_count from pg_constraint where conrelid='public.solutions'::regclass and conname in ('solutions_latitude_check','solutions_longitude_check','solutions_geolocation_pair_check');
  if constraint_count <> 3 then raise exception 'Sprint 33 coordinate constraints are incomplete'; end if;
  if not (select indisvalid from pg_index where indexrelid='public.problems_geographic_search_idx'::regclass) then raise exception 'problems_geographic_search_idx is invalid'; end if;
  if not (select indisvalid from pg_index where indexrelid='public.solutions_geographic_search_idx'::regclass) then raise exception 'solutions_geographic_search_idx is invalid'; end if;
  if to_regprocedure('public.haversine_distance_km(double precision,double precision,double precision,double precision)') is null then raise exception 'haversine_distance_km is missing'; end if;
  if (select provolatile from pg_proc where oid='public.haversine_distance_km(double precision,double precision,double precision,double precision)'::regprocedure) <> 'i' then raise exception 'haversine_distance_km is not immutable'; end if;
  if (select proparallel from pg_proc where oid='public.haversine_distance_km(double precision,double precision,double precision,double precision)'::regprocedure) <> 's' then raise exception 'haversine_distance_km is not parallel safe'; end if;
  if not exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='search_nearby_problems') then raise exception 'search_nearby_problems is missing'; end if;
  if not exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='search_nearby_solutions') then raise exception 'search_nearby_solutions is missing'; end if;
end $$;

update public.solutions set latitude=-23.5505,longitude=-46.6333 where id='00000000-0000-0000-0000-000000000002';
insert into public.solutions (id,author_id,title,summary,description,category,organization,status,impact_metric,tags,evidence_links,latitude,longitude) values
 ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000010','Jardim próximo A','Solução para drenagem','Busca textual próxima.','Infraestrutura','Prefeitura','Proposta','Redução',array['drenagem'],'{}',-23.5415,-46.6333),
 ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000010','Jardim próximo B','Solução para drenagem','Busca textual próxima.','Infraestrutura','Prefeitura','Proposta','Redução',array['drenagem'],'{}',-23.5415,-46.6333),
 ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000010','Jardim distante','Solução para drenagem','Busca textual distante.','Infraestrutura','Prefeitura','Proposta','Redução',array['drenagem'],'{}',-23.3505,-46.6333),
 ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000010','Jardim sem coordenadas','Solução para drenagem','Busca textual sem coordenadas.','Infraestrutura','Prefeitura','Proposta','Redução',array['drenagem'],'{}',null,null);

do $$
declare problem_ids uuid[]; solution_ids uuid[]; total bigint;
begin
  if public.haversine_distance_km(-23.5505,-46.6333,-23.5505,-46.6333) <> 0 then raise exception 'zero distance failed'; end if;
  if abs(public.haversine_distance_km(-23.5505,-46.6333,-22.9068,-43.1729)-360.75) >= 1 then raise exception 'known route distance failed'; end if;

  select array_agg(id order by distance_km,id),max(total_count) into problem_ids,total
    from public.search_nearby_problems(-23.5505,-46.6333,5,p_query=>'drenagem',p_category=>'Infraestrutura',p_limit=>50,p_offset=>0);
  if problem_ids <> array['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004']::uuid[] or total <> 3 then raise exception 'problem radius/text/category/order or coordinate exclusion failed: %, %',problem_ids,total; end if;

  select array_agg(id order by distance_km,id),max(total_count) into solution_ids,total
    from public.search_nearby_solutions(-23.5505,-46.6333,5,p_query=>'drenagem',p_category=>'Infraestrutura',p_limit=>50,p_offset=>0);
  if solution_ids <> array['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000008']::uuid[] or total <> 3 then raise exception 'solution radius/text/category/order or coordinate exclusion failed: %, %',solution_ids,total; end if;

  select array_agg(id order by distance_km,id) into problem_ids from public.search_nearby_problems(-23.5505,-46.6333,5,p_limit=>1,p_offset=>1);
  if problem_ids <> array['00000000-0000-0000-0000-000000000003']::uuid[] then raise exception 'problem pagination failed: %',problem_ids; end if;
  select array_agg(id order by distance_km,id) into solution_ids from public.search_nearby_solutions(-23.5505,-46.6333,5,p_limit=>1,p_offset=>1);
  if solution_ids <> array['00000000-0000-0000-0000-000000000007']::uuid[] then raise exception 'solution pagination failed: %',solution_ids; end if;

  perform * from public.search_nearby_problems(-23.5505,-46.6333,100,p_limit=>50,p_offset=>0);
  perform * from public.search_nearby_solutions(-23.5505,-46.6333,100,p_limit=>50,p_offset=>0);
end $$;
