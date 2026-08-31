begin;

do $$
begin
  if not has_function_privilege('authenticated', 'public.search_tags_text(text[])', 'EXECUTE') then
    raise exception 'authenticated cannot maintain the indexed search document';
  end if;
  if has_function_privilege('anon', 'public.search_tags_text(text[])', 'EXECUTE') then
    raise exception 'anon unexpectedly received direct access to search_tags_text';
  end if;
end
$$;

-- The isolated fixture does not reproduce the original table grants. Grant only
-- the writes needed inside this rolled-back transaction, then exercise index
-- maintenance as the same Postgres role used by a signed-in Data API request.
grant usage on schema public to authenticated;
grant insert on public.problems, public.solutions to authenticated;

set local role authenticated;

insert into public.problems (
  id, author_id, title, summary, description, category, city, state, status, tags
) values (
  '64000000-0000-4000-8000-000000000001',
  '64000000-0000-4000-8000-000000000010',
  'Indexed problem write', 'Regression', 'Authenticated index maintenance',
  'Tecnologia', 'Sao Paulo', 'SP', 'Aberto', '{}'::text[]
);

insert into public.solutions (
  id, author_id, title, summary, description, category, organization, status,
  impact_metric, tags, evidence_links
) values (
  '64000000-0000-4000-8000-000000000002',
  '64000000-0000-4000-8000-000000000010',
  'Indexed solution write', 'Regression', 'Authenticated index maintenance',
  'Tecnologia', 'Regression Org', 'Proposta', 'Validated write',
  '{}'::text[], '{}'::text[]
);

reset role;
rollback;
