create table if not exists public.app_schema_version (
  version text primary key,
  applied_at timestamptz not null default now(),
  description text not null default ''
);
insert into public.app_schema_version(version, description) values ('26.0.0', 'Sprint 26 — infraestrutura e observabilidade') on conflict (version) do nothing;

create or replace function public.get_system_health() returns jsonb language plpgsql stable security definer set search_path = public, pg_catalog as $$
declare current_version text; missing_rpcs text[]; missing_columns text[]; checks jsonb;
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  select version into current_version from public.app_schema_version order by applied_at desc, version desc limit 1;
  select coalesce(array_agg(required.name order by required.name), '{}') into missing_rpcs
  from (values ('get_problems_in_bounds'),('get_problem_region_summary'),('get_public_problem_location'),('publish_problem_update'),('list_notifications'),('get_system_health')) required(name)
  where not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=required.name);
  select coalesce(array_agg(required.table_name||'.'||required.column_name order by required.table_name,required.column_name), '{}') into missing_columns
  from (values ('profiles','id'),('profiles','role'),('problems','id'),('problems','title'),('problems','status'),('problems','latitude'),('problems','longitude'),('solutions','id'),('comments','id'),('notifications','id')) required(table_name,column_name)
  where not exists (select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.table_name and c.column_name=required.column_name);
  checks := jsonb_build_array(
    jsonb_build_object('name','database','status','ok','message','Conexão e consulta ao catálogo disponíveis.'),
    jsonb_build_object('name','schema_version','status',case when current_version is null then 'error' else 'ok' end,'message',coalesce(current_version,'Versão não registrada.')),
    jsonb_build_object('name','required_rpcs','status',case when cardinality(missing_rpcs)=0 then 'ok' else 'error' end,'message',case when cardinality(missing_rpcs)=0 then 'Todas as RPCs obrigatórias estão disponíveis.' else 'Ausentes: '||array_to_string(missing_rpcs,', ') end),
    jsonb_build_object('name','required_columns','status',case when cardinality(missing_columns)=0 then 'ok' else 'error' end,'message',case when cardinality(missing_columns)=0 then 'Todas as colunas obrigatórias estão disponíveis.' else 'Ausentes: '||array_to_string(missing_columns,', ') end));
  return jsonb_build_object('ok',cardinality(missing_rpcs)=0 and cardinality(missing_columns)=0 and current_version is not null,'schema_version',current_version,'checks',checks);
end; $$;
revoke all on function public.get_system_health() from public;
grant execute on function public.get_system_health() to authenticated;
notify pgrst, 'reload schema';
