\set ON_ERROR_STOP on

do $$ begin
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.legal_acceptances'::regclass) then raise exception 'RLS is not forced'; end if;
  if not has_table_privilege('authenticated', 'public.legal_acceptances', 'SELECT') then raise exception 'authenticated requires SELECT for own RLS rows'; end if;
  if has_table_privilege('authenticated', 'public.legal_acceptances', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'authenticated has unnecessary table privileges'; end if;
  if not has_function_privilege('authenticated', 'public.accept_current_legal_documents(text)', 'EXECUTE') or not has_function_privilege('authenticated', 'public.get_my_legal_consent_status()', 'EXECUTE') then raise exception 'authenticated requires both RPCs'; end if;
  if has_function_privilege('anon', 'public.accept_current_legal_documents(text)', 'EXECUTE') or has_function_privilege('anon', 'public.get_my_legal_consent_status()', 'EXECUTE') then raise exception 'anon must not execute legal RPCs'; end if;
  if (select proconfig from pg_proc where oid = 'public.accept_current_legal_documents(text)'::regprocedure) <> array['search_path=public, pg_catalog'] then raise exception 'unsafe accept search_path'; end if;
  if (select proconfig from pg_proc where oid = 'public.get_my_legal_consent_status()'::regprocedure) <> array['search_path=public, pg_catalog'] then raise exception 'unsafe status search_path'; end if;
  if exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'legal_acceptances' and column_name in ('ip', 'ip_address', 'user_agent', 'token', 'access_token', 'refresh_token', 'session', 'session_id', 'secret')) then raise exception 'unnecessary sensitive column'; end if;
end $$;

set role anon;
do $$ begin
  begin perform public.accept_current_legal_documents('pt-BR'); raise exception 'anon accepted'; exception when sqlstate '42501' then null; end;
  begin perform public.get_my_legal_consent_status(); raise exception 'anon queried'; exception when sqlstate '42501' then null; end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select set_config('request.jwt.claims', '{"is_anonymous":false}', false);
do $$ begin
  begin insert into public.legal_acceptances(user_id, document_type, document_version, locale) values(auth.uid(), 'terms', 'terms-2026-07-29', 'pt-BR'); raise exception 'direct INSERT succeeded'; exception when sqlstate '42501' then null; end;
  begin update public.legal_acceptances set locale = 'en-US'; raise exception 'direct UPDATE succeeded'; exception when sqlstate '42501' then null; end;
  begin delete from public.legal_acceptances; raise exception 'direct DELETE succeeded'; exception when sqlstate '42501' then null; end;
  begin perform public.accept_current_legal_documents('es-ES'); raise exception 'invalid locale accepted'; exception when sqlstate '22023' then null; end;
end $$;
select public.accept_current_legal_documents('pt-BR');
select public.accept_current_legal_documents('pt-BR');
do $$ declare status jsonb := public.get_my_legal_consent_status(); begin
  if (select count(*) from public.legal_acceptances) <> 2 then raise exception 'user A acceptance is not atomic/idempotent'; end if;
  if (status->>'pending')::boolean then raise exception 'user A remains pending'; end if;
  if jsonb_array_length(status->'accepted') <> 2 then raise exception 'user A status must contain two versions'; end if;
  if not (status->'accepted' @> '[{"document_type":"terms","document_version":"terms-2026-07-29"},{"document_type":"privacy","document_version":"privacy-2026-07-29"}]'::jsonb) then raise exception 'user A did not receive current versions'; end if;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ declare status jsonb := public.get_my_legal_consent_status(); begin
  if (select count(*) from public.legal_acceptances) <> 0 then raise exception 'user B can see user A rows'; end if;
  if not (status->>'pending')::boolean or jsonb_array_length(status->'accepted') <> 0 then raise exception 'user B must start pending without acceptances'; end if;
end $$;
select public.accept_current_legal_documents('en-US');
do $$ declare status jsonb := public.get_my_legal_consent_status(); begin
  if (select count(*) from public.legal_acceptances) <> 2 then raise exception 'user B must see exactly own rows'; end if;
  if (status->>'pending')::boolean or jsonb_array_length(status->'accepted') <> 2 then raise exception 'user B acceptance incomplete'; end if;
  if not (status->'accepted' @> '[{"document_type":"terms","document_version":"terms-2026-07-29"},{"document_type":"privacy","document_version":"privacy-2026-07-29"}]'::jsonb) then raise exception 'user B did not receive current versions'; end if;
end $$;
reset role;

do $$ begin if (select count(*) from public.legal_acceptances) <> 4 then raise exception 'both users must retain exactly two rows'; end if; end $$;
