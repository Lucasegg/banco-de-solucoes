\set ON_ERROR_STOP on

do $$
begin
  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.app_schema_version'::regclass
  ) then
    raise exception 'app_schema_version RLS must be enabled';
  end if;

  if (
    select relforcerowsecurity
    from pg_class
    where oid = 'public.app_schema_version'::regclass
  ) then
    raise exception 'app_schema_version must not force RLS because the guarded SECURITY DEFINER health RPC reads it as owner';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_schema_version'
  ) then
    raise exception 'app_schema_version must not expose rows through RLS policies';
  end if;

  if has_table_privilege('anon', 'public.app_schema_version', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'anon must not have direct app_schema_version privileges';
  end if;

  if has_table_privilege('authenticated', 'public.app_schema_version', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'authenticated must not have direct app_schema_version privileges';
  end if;

  if not exists (
    select 1
    from public.app_schema_version
    where version = '26.0.0'
  ) then
    raise exception 'RLS hardening must preserve existing schema version data';
  end if;
end
$$;
