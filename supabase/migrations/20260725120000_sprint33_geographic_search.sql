-- Sprint 33: geographic search without PostGIS (PostgreSQL 15 compatible).
begin;

alter table public.solutions
  add column latitude double precision,
  add column longitude double precision,
  add constraint solutions_latitude_check check (latitude is null or latitude between -90 and 90),
  add constraint solutions_longitude_check check (longitude is null or longitude between -180 and 180),
  add constraint solutions_geolocation_pair_check check ((latitude is null) = (longitude is null));

-- Bounding-box indexes discard almost all rows before the exact great-circle
-- calculation. Partial indexes stay compact because ungeocoded rows are omitted.
create index problems_geographic_search_idx on public.problems(latitude,longitude,id)
  where latitude is not null and longitude is not null;
create index solutions_geographic_search_idx on public.solutions(latitude,longitude,id)
  where latitude is not null and longitude is not null;

create or replace function public.haversine_distance_km(
  latitude_a double precision, longitude_a double precision,
  latitude_b double precision, longitude_b double precision
) returns double precision language sql immutable strict parallel safe
set search_path=pg_catalog as $$
  select 6371.0088 * 2 * asin(least(1.0, sqrt(
    power(sin(radians(latitude_b-latitude_a)/2),2) +
    cos(radians(latitude_a))*cos(radians(latitude_b))*
    power(sin(radians(longitude_b-longitude_a)/2),2)
  )))
$$;

create or replace function public.search_nearby_problems(
  p_latitude double precision, p_longitude double precision, p_radius_km double precision default 10,
  p_query text default null, p_category text default null, p_status text default null,
  p_state text default null, p_city text default null, p_tags text[] default null,
  p_created_from timestamptz default null, p_created_to timestamptz default null,
  p_has_solution boolean default null, p_favorites_only boolean default false, p_authored_only boolean default false,
  p_limit integer default 20, p_offset integer default 0
) returns table(id uuid,title text,summary text,category text,status text,city text,state text,
  tags text[],author_name text,created_at timestamptz,updated_at timestamptz,solution_count bigint,
  favorites integer,comments integer,latitude double precision,longitude double precision,
  distance_km double precision,total_count bigint)
language plpgsql stable security invoker set search_path=public as $$
#variable_conflict use_column
declare radius double precision; lat_delta double precision; lon_delta double precision;
begin
  if p_latitude is null or p_latitude not between -90 and 90 or p_longitude is null or p_longitude not between -180 and 180 then
    raise exception 'Invalid origin coordinates' using errcode='22023';
  end if;
  if p_radius_km is null or p_radius_km <= 0 or p_radius_km > 100 then
    raise exception 'Radius must be between 0 and 100 km' using errcode='22023';
  end if;
  radius := p_radius_km; lat_delta := radius/111.195;
  lon_delta := radius/(111.195*greatest(cos(radians(p_latitude)),0.01));
  return query with candidates as (
    select p.*,public.public_problem_coordinate(p.latitude,p.geolocation_precision) public_latitude,
      public.public_problem_coordinate(p.longitude,p.geolocation_precision) public_longitude
    from public.problems p
    where p.latitude between p_latitude-lat_delta and p_latitude+lat_delta
      and p.longitude between p_longitude-lon_delta and p_longitude+lon_delta
      and p.status <> 'Arquivado' and (p_category is null or p.category=p_category)
      and (p_status is null or p.status=p_status) and (p_state is null or p.state=p_state)
      and (p_city is null or p.city=p_city) and (p_tags is null or p.tags @> p_tags)
      and (p_created_from is null or p.created_at>=p_created_from) and (p_created_to is null or p.created_at<=p_created_to)
      and (p_has_solution is null or p_has_solution=exists(select 1 from public.solution_problems sp where sp.problem_id=p.id))
      and (not coalesce(p_favorites_only,false) or exists(select 1 from public.favorites f where f.problem_id=p.id and f.user_id=auth.uid()))
      and (not coalesce(p_authored_only,false) or p.author_id=auth.uid())
      and (nullif(btrim(p_query),'') is null or
        (setweight(to_tsvector('portuguese',coalesce(p.title,'')),'A') ||
         setweight(to_tsvector('portuguese',coalesce(p.summary,'')),'B') ||
         setweight(to_tsvector('portuguese',coalesce(p.description,'')),'C') ||
         setweight(to_tsvector('portuguese',coalesce(p.category,'')||' '||coalesce(p.city,'')||' '||coalesce(p.state,'')||' '||public.search_tags_text(p.tags)),'D'))
        @@ public.safe_search_tsquery(p_query))
  ), measured as (
    select c.*,public.haversine_distance_km(p_latitude,p_longitude,c.public_latitude,c.public_longitude) distance
    from candidates c where c.public_latitude is not null and c.public_longitude is not null
  ), matched as (select * from measured where distance <= radius), numbered as (
    select m.*,count(*) over() matched_total from matched m
  )
  select n.id,n.title,coalesce(n.summary,left(n.description,180)),n.category,n.status,n.city,n.state,n.tags,
    coalesce(n.author_name,'Usuário da plataforma'),n.created_at,n.updated_at,
    (select count(*) from public.solution_problems sp where sp.problem_id=n.id),n.likes,n.comments,
    n.public_latitude,n.public_longitude,n.distance,n.matched_total
  from numbered n order by n.distance,n.id
  limit least(greatest(coalesce(p_limit,20),1),50) offset greatest(coalesce(p_offset,0),0);
end $$;

create or replace function public.search_nearby_solutions(
  p_latitude double precision, p_longitude double precision, p_radius_km double precision default 10,
  p_query text default null, p_category text default null, p_organization text default null,
  p_tags text[] default null, p_problem_id uuid default null,
  p_created_from timestamptz default null, p_created_to timestamptz default null,
  p_favorites_only boolean default false, p_authored_only boolean default false,
  p_has_evidence boolean default null, p_has_impact_metric boolean default null,
  p_limit integer default 20, p_offset integer default 0
) returns table(id uuid,title text,summary text,category text,organization text,tags text[],
  author_name text,created_at timestamptz,updated_at timestamptz,problem_ids uuid[],impact_metric text,
  favorites integer,comments integer,latitude double precision,longitude double precision,
  distance_km double precision,total_count bigint)
language plpgsql stable security invoker set search_path=public as $$
#variable_conflict use_column
declare radius double precision; lat_delta double precision; lon_delta double precision;
begin
  if p_latitude is null or p_latitude not between -90 and 90 or p_longitude is null or p_longitude not between -180 and 180 then raise exception 'Invalid origin coordinates' using errcode='22023'; end if;
  if p_radius_km is null or p_radius_km <= 0 or p_radius_km > 100 then raise exception 'Radius must be between 0 and 100 km' using errcode='22023'; end if;
  radius:=p_radius_km; lat_delta:=radius/111.195; lon_delta:=radius/(111.195*greatest(cos(radians(p_latitude)),0.01));
  return query with candidates as (
    select s.* from public.solutions s
    where s.latitude between p_latitude-lat_delta and p_latitude+lat_delta
      and s.longitude between p_longitude-lon_delta and p_longitude+lon_delta
      and s.status <> 'Arquivada' and (p_category is null or s.category=p_category)
      and (p_organization is null or s.organization=p_organization) and (p_tags is null or s.tags @> p_tags)
      and (p_problem_id is null or exists(select 1 from public.solution_problems sp where sp.solution_id=s.id and sp.problem_id=p_problem_id))
      and (p_created_from is null or s.created_at>=p_created_from) and (p_created_to is null or s.created_at<=p_created_to)
      and (not coalesce(p_favorites_only,false) or exists(select 1 from public.favorites f where f.solution_id=s.id and f.user_id=auth.uid()))
      and (not coalesce(p_authored_only,false) or s.author_id=auth.uid())
      and (p_has_evidence is null or p_has_evidence=(cardinality(s.evidence_links)>0))
      and (p_has_impact_metric is null or p_has_impact_metric=(nullif(btrim(s.impact_metric),'') is not null))
      and (nullif(btrim(p_query),'') is null or
        (setweight(to_tsvector('portuguese',coalesce(s.title,'')),'A') ||
         setweight(to_tsvector('portuguese',coalesce(s.summary,'')),'B') ||
         setweight(to_tsvector('portuguese',coalesce(s.description,'')),'C') ||
         setweight(to_tsvector('portuguese',coalesce(s.category,'')||' '||coalesce(s.organization,'')||' '||coalesce(s.impact_metric,'')||' '||public.search_tags_text(s.tags)),'D'))
        @@ public.safe_search_tsquery(p_query))
  ), measured as (
    select c.*,public.haversine_distance_km(p_latitude,p_longitude,c.latitude,c.longitude) distance from candidates c
  ), matched as (select * from measured where distance <= radius), numbered as (
    select m.*,count(*) over() matched_total from matched m
  )
  select n.id,n.title,n.summary,n.category,n.organization,n.tags,coalesce(n.author_name,'Usuário da plataforma'),
    n.created_at,n.updated_at,array(select sp.problem_id from public.solution_problems sp where sp.solution_id=n.id order by sp.problem_id),
    n.impact_metric,n.likes,n.comments,n.latitude,n.longitude,n.distance,n.matched_total
  from numbered n order by n.distance,n.id
  limit least(greatest(coalesce(p_limit,20),1),50) offset greatest(coalesce(p_offset,0),0);
end $$;

revoke all on function public.haversine_distance_km(double precision,double precision,double precision,double precision) from public,anon,authenticated;
revoke all on function public.search_nearby_problems(double precision,double precision,double precision,text,text,text,text,text,text[],timestamptz,timestamptz,boolean,boolean,boolean,integer,integer) from public;
revoke all on function public.search_nearby_solutions(double precision,double precision,double precision,text,text,text,text[],uuid,timestamptz,timestamptz,boolean,boolean,boolean,boolean,integer,integer) from public;
grant execute on function public.search_nearby_problems(double precision,double precision,double precision,text,text,text,text,text,text[],timestamptz,timestamptz,boolean,boolean,boolean,integer,integer) to anon,authenticated;
grant execute on function public.search_nearby_solutions(double precision,double precision,double precision,text,text,text,text[],uuid,timestamptz,timestamptz,boolean,boolean,boolean,boolean,integer,integer) to anon,authenticated;

-- Coordinates are public catalogue data for solutions. Problem coordinates keep
-- using the privacy-preserving projection introduced by Sprint 25.
grant select (latitude,longitude) on public.solutions to anon,authenticated;
commit;
