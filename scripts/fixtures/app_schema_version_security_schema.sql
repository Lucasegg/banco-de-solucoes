-- Isolated CI fixture that reproduces the production finding before the
-- hardening migration is applied.
create table if not exists public.app_schema_version (
  version text primary key,
  applied_at timestamptz not null default now(),
  description text not null default ''
);

insert into public.app_schema_version (version, description)
values ('26.0.0', 'Security regression fixture')
on conflict (version) do nothing;

alter table public.app_schema_version disable row level security;
grant all on table public.app_schema_version to anon, authenticated;
