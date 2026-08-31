begin;

alter table public.solutions
  add column if not exists image_url text,
  add column if not exists maturity_level text not null default 'Ideia',
  add column if not exists implementation_difficulty text not null default 'Baixa',
  add column if not exists estimated_cost text,
  add column if not exists implementation_time text,
  add column if not exists location text not null default 'Não informado',
  add column if not exists country text not null default 'Brasil',
  add column if not exists views integer not null default 0;
alter table public.solutions alter column id set default gen_random_uuid();

insert into public.profiles (id, role, display_name, username)
values ('63000000-0000-4000-8000-000000000001', 'member', 'Regression Member', 'regression-member')
on conflict (id) do nothing;

insert into public.problems (
  id, author_id, author_name, title, summary, description, category,
  city, state, status
) values (
  '63000000-0000-4000-8000-000000000010',
  '63000000-0000-4000-8000-000000000001',
  'Regression Member', 'Optional link fixture', 'Fixture', 'Fixture for optional solution links',
  'Infraestrutura', 'Recife', 'PE', 'Aberto'
) on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', '63000000-0000-4000-8000-000000000001', true);

select public.create_solution_with_problems(
  '63000000-0000-4000-8000-000000000001',
  'Regression Member', 'Independent solution', 'No related problem', 'A valid independent solution',
  'Infraestrutura', null, 'Regression Org', 'Proposta', 'Ideia', 'Baixa',
  null, null, 'Recife', 'Brasil', 'One independent solution', '{}'::text[], '{}'::text[], '{}'::uuid[]
);

do $$
begin
  if not exists (
    select 1 from public.solutions
    where author_id = '63000000-0000-4000-8000-000000000001'
      and title = 'Independent solution'
  ) then
    raise exception 'solution without related problems was not created';
  end if;

  if exists (
    select 1
    from public.solution_problems sp
    join public.solutions s on s.id = sp.solution_id
    where s.author_id = '63000000-0000-4000-8000-000000000001'
      and s.title = 'Independent solution'
  ) then
    raise exception 'independent solution unexpectedly created a problem link';
  end if;
end
$$;

select public.create_solution_with_problems(
  '63000000-0000-4000-8000-000000000001',
  'Regression Member', 'Linked solution', 'Initially linked', 'A solution whose optional link is removed',
  'Infraestrutura', null, 'Regression Org', 'Proposta', 'Ideia', 'Baixa',
  null, null, 'Recife', 'Brasil', 'One linked solution', '{}'::text[], '{}'::text[],
  array['63000000-0000-4000-8000-000000000010'::uuid]
);

select public.update_solution_with_problems(
  p_solution_id := (
    select id from public.solutions
    where author_id = '63000000-0000-4000-8000-000000000001'
      and title = 'Linked solution'
  ),
  p_problem_ids := '{}'::uuid[]
);

do $$
begin
  if exists (
    select 1
    from public.solution_problems sp
    join public.solutions s on s.id = sp.solution_id
    where s.author_id = '63000000-0000-4000-8000-000000000001'
      and s.title = 'Linked solution'
  ) then
    raise exception 'empty related problem array did not remove existing links';
  end if;
end
$$;

rollback;
