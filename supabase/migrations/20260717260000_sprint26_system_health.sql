create table if not exists public.app_schema_version (
  version text primary key,
  applied_at timestamptz not null default now(),
  description text not null default ''
);

insert into public.app_schema_version(version, description)
values ('26.0.0', 'Sprint 26 — infraestrutura e observabilidade')
on conflict (version) do nothing;

create or replace function public.get_system_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  started_at timestamptz := clock_timestamp();
  catalog_started_at timestamptz;
  catalog_latency_ms integer;
  current_version text;
  missing_rpcs text[];
  missing_columns text[];
  checks jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  catalog_started_at := clock_timestamp();
  select version into current_version
  from public.app_schema_version
  order by applied_at desc, version desc limit 1;

  select coalesce(array_agg(signature order by signature), '{}') into missing_rpcs
  from unnest(array[
    'public.get_problems_in_bounds(double precision,double precision,double precision,double precision,text,text,text,text,text,boolean,integer,boolean)',
    'public.get_problem_region_summary()',
    'public.get_public_problem_location(uuid)',
    'public.get_system_health()'
  ]) signature
  where to_regprocedure(signature) is null;
  if to_regprocedure('public.get_system_health()') is not null
     and pg_get_function_result(to_regprocedure('public.get_system_health()')) <> 'jsonb' then
    missing_rpcs := array_append(missing_rpcs, 'public.get_system_health() returns jsonb');
  end if;

  select coalesce(array_agg(required.table_name || '.' || required.column_name order by required.table_name, required.column_name), '{}') into missing_columns
  from (values
    ('profiles','id'), ('profiles','role'),
    ('problems','id'), ('problems','title'), ('problems','status'), ('problems','category'),
    ('problems','city'), ('problems','state'), ('problems','latitude'), ('problems','longitude'),
    ('problems','geolocation_precision'), ('problems','geolocation_source'), ('problems','geocoded_at'),
    ('problems','source_verified_at'), ('problems','source_metadata'),
    ('solutions','id'), ('comments','id'), ('notifications','id')
  ) required(table_name, column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = required.table_name and c.column_name = required.column_name
  );
  catalog_latency_ms := greatest(0, round(extract(epoch from clock_timestamp() - catalog_started_at) * 1000)::integer);

  checks := jsonb_build_array(
    jsonb_build_object('name','database','status','ok','message','Banco de dados disponível.','latency_ms',catalog_latency_ms),
    jsonb_build_object('name','schema_version','status',case when current_version is null then 'error' else 'ok' end,'message',case when current_version is null then 'Versão do schema não encontrada.' else 'Versão do schema disponível.' end,'latency_ms',catalog_latency_ms),
    jsonb_build_object('name','required_rpcs','status',case when cardinality(missing_rpcs)=0 then 'ok' else 'error' end,'message',case when cardinality(missing_rpcs)=0 then 'Assinaturas das RPCs obrigatórias válidas.' else 'RPC ausente ou com assinatura incompatível: ' || array_to_string(missing_rpcs, ', ') end,'latency_ms',catalog_latency_ms),
    jsonb_build_object('name','required_columns','status',case when cardinality(missing_columns)=0 then 'ok' else 'error' end,'message',case when cardinality(missing_columns)=0 then 'Colunas obrigatórias disponíveis.' else 'Colunas obrigatórias ausentes: ' || array_to_string(missing_columns, ', ') end,'latency_ms',catalog_latency_ms)
  );

  return jsonb_build_object(
    'ok', cardinality(missing_rpcs)=0 and cardinality(missing_columns)=0 and current_version is not null,
    'schema_version', current_version,
    'checked_at', started_at,
    'checks', checks
  );
end;
$$;

revoke all on function public.get_system_health() from public;
grant execute on function public.get_system_health() to authenticated;
notify pgrst, 'reload schema';
