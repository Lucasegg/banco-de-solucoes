begin;

do $$
declare
  hash text := repeat('a', 64);
  test_time timestamptz := '2026-07-29 12:15:00+00';
begin
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.contact_rate_limits'::regclass) then raise exception 'RLS must be enabled and forced'; end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_rate_limits') then raise exception 'rate limit table must have no policies'; end if;
  if has_table_privilege('anon', 'public.contact_rate_limits', 'select') or has_table_privilege('authenticated', 'public.contact_rate_limits', 'select') or has_table_privilege('service_role', 'public.contact_rate_limits', 'select') then raise exception 'table access must be revoked'; end if;
  if has_function_privilege('anon', 'public.claim_contact_rate_limit(text,timestamptz)', 'execute') or has_function_privilege('authenticated', 'public.claim_contact_rate_limit(text,timestamptz)', 'execute') then raise exception 'public roles must not execute limiter'; end if;
  if not has_function_privilege('service_role', 'public.claim_contact_rate_limit(text,timestamptz)', 'execute') then raise exception 'service role must execute limiter'; end if;
  if not (select prosecdef from pg_proc where oid = 'public.claim_contact_rate_limit(text,timestamptz)'::regprocedure) then raise exception 'limiter must be security definer'; end if;
  if (select proconfig from pg_proc where oid = 'public.claim_contact_rate_limit(text,timestamptz)'::regprocedure) <> array['search_path=pg_catalog, public'] then raise exception 'fixed search path required'; end if;
  if public.claim_contact_rate_limit('plain-ip', test_time) then raise exception 'invalid identifiers must fail'; end if;
  for i in 1..5 loop if not public.claim_contact_rate_limit(hash, test_time) then raise exception 'attempt % should pass', i; end if; end loop;
  if public.claim_contact_rate_limit(hash, test_time) then raise exception 'sixth attempt must fail'; end if;
  if not public.claim_contact_rate_limit(hash, test_time + interval '2 hours') then raise exception 'new atomic window must pass'; end if;
  if exists (select 1 from public.contact_rate_limits where identifier_hash = hash and window_start < date_trunc('hour', test_time + interval '2 hours')) then raise exception 'expired bucket must be cleaned'; end if;
end $$;

rollback;
