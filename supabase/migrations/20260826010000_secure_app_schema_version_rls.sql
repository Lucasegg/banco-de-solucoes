-- app_schema_version is internal operational metadata read only through
-- the guarded SECURITY DEFINER get_system_health() RPC.
alter table public.app_schema_version enable row level security;

-- No browser-facing role needs direct table access. Keeping the table without
-- policies makes RLS deny all direct Data API access if a grant is reintroduced.
revoke all on table public.app_schema_version from public;
revoke all on table public.app_schema_version from anon, authenticated;

notify pgrst, 'reload schema';
