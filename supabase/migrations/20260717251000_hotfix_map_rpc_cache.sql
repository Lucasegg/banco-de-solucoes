-- Hotfix 25.1: recreate the existing public RPC signatures and refresh PostgREST metadata.

CREATE OR REPLACE FUNCTION public.get_problems_in_bounds(
  north double precision, south double precision, east double precision, west double precision,
  p_status text default null, p_category text default null, p_state text default null,
  p_city text default null, p_neighborhood text default null, verified_only boolean default false,
  p_limit integer default 200, recently_updated_only boolean default false
)
returns table(id uuid,title text,category text,status text,city text,state text,neighborhood text,
  latitude double precision,longitude double precision,geolocation_precision text,updated_at timestamptz,
  source_verified_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if north is null or south is null or east is null or west is null or north < south
     or north not between -90 and 90 or south not between -90 and 90
     or east not between -180 and 180 or west not between -180 and 180 then
    raise exception 'Invalid map bounds' using errcode='22023';
  end if;
  return query select p.id,p.title,p.category,p.status,p.city,p.state,
    nullif(p.source_metadata->>'neighborhood',''),
    public.public_problem_coordinate(p.latitude,p.geolocation_precision),
    public.public_problem_coordinate(p.longitude,p.geolocation_precision),
    p.geolocation_precision,p.updated_at,p.source_verified_at
  from public.problems p
  where p.latitude between south and north
    and (case when west <= east then p.longitude between west and east else p.longitude >= west or p.longitude <= east end)
    and (p_status is null or p.status=p_status) and (p_category is null or p.category=p_category)
    and (p_state is null or lower(p.state)=lower(trim(p_state)))
    and (p_city is null or lower(p.city)=lower(trim(p_city)))
    and (p_neighborhood is null or lower(coalesce(p.source_metadata->>'neighborhood',''))=lower(trim(p_neighborhood)))
    and (not verified_only or p.source_verified_at is not null)
    and (not recently_updated_only or p.updated_at >= now()-interval '30 days')
  order by p.updated_at desc,p.id limit least(greatest(coalesce(p_limit,200),1),200);
end $$;

revoke all on function public.get_problems_in_bounds(double precision,double precision,double precision,double precision,text,text,text,text,text,boolean,integer,boolean) from public;
grant execute on function public.get_problems_in_bounds(double precision,double precision,double precision,double precision,text,text,text,text,text,boolean,integer,boolean) to anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_problem_region_summary()
returns table(state text,city text,total_problems bigint,in_progress bigint,resolved bigint,last_updated timestamptz)
language sql stable security definer set search_path=public as $$
  select p.state,p.city,count(*),count(*) filter(where p.status='Em execução'),
    count(*) filter(where p.status='Resolvido'),max(p.updated_at)
  from public.problems p where p.latitude is not null and p.longitude is not null
  group by p.state,p.city order by p.state,p.city;
$$;
revoke all on function public.get_problem_region_summary() from public;
grant execute on function public.get_problem_region_summary() to anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_public_problem_location(p_problem_id uuid)
returns table(id uuid,title text,category text,status text,city text,state text,
  latitude double precision,longitude double precision,geolocation_precision text,
  updated_at timestamptz,source_verified_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.id,p.title,p.category,p.status,p.city,p.state,
    public.public_problem_coordinate(p.latitude,p.geolocation_precision),
    public.public_problem_coordinate(p.longitude,p.geolocation_precision),
    p.geolocation_precision,p.updated_at,p.source_verified_at
  from public.problems p
  where p.id=p_problem_id and p.latitude is not null and p.longitude is not null;
$$;
revoke all on function public.get_public_problem_location(uuid) from public;
grant execute on function public.get_public_problem_location(uuid) to anon,authenticated;

NOTIFY pgrst, 'reload schema';
