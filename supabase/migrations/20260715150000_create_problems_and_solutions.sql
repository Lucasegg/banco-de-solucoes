create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text,
  title text not null,
  summary text,
  description text not null,
  category text not null,
  city text not null,
  state text not null,
  country text not null default 'Brasil',
  image_url text,
  status text not null default 'Aberto',
  impact_level text not null default 'local',
  tags text[] not null default '{}',
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  comments integer not null default 0 check (comments >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint problems_status_check check (status in ('Aberto', 'Em andamento', 'Resolvido')),
  constraint problems_impact_level_check check (impact_level in ('local', 'regional', 'national', 'global'))
);

create table if not exists public.solutions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text,
  title text not null,
  summary text not null,
  description text not null,
  category text not null,
  image_url text,
  organization text not null,
  status text not null default 'Proposta',
  maturity_level text not null default 'Ideia',
  implementation_difficulty text not null default 'Baixa',
  estimated_cost text,
  implementation_time text,
  location text not null,
  country text not null default 'Brasil',
  impact_metric text not null,
  tags text[] not null default '{}',
  evidence_links text[] not null default '{}',
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  comments integer not null default 0 check (comments >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint solutions_status_check check (status in ('Proposta', 'Em teste', 'Implementada', 'Validada', 'Arquivada')),
  constraint solutions_maturity_level_check check (maturity_level in ('Ideia', 'Protótipo', 'Piloto', 'Em operação', 'Escalável')),
  constraint solutions_implementation_difficulty_check check (implementation_difficulty in ('Baixa', 'Média', 'Alta'))
);

create table if not exists public.solution_problems (
  solution_id uuid not null references public.solutions(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (solution_id, problem_id)
);

create index if not exists problems_author_id_idx on public.problems(author_id);
create index if not exists solutions_author_id_idx on public.solutions(author_id);
create index if not exists solution_problems_problem_id_idx on public.solution_problems(problem_id);

create or replace function public.set_domain_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := timezone('utc', now()); return new; end; $$;

drop trigger if exists set_problems_updated_at_before_update on public.problems;
create trigger set_problems_updated_at_before_update before update on public.problems for each row execute function public.set_domain_updated_at();
drop trigger if exists set_solutions_updated_at_before_update on public.solutions;
create trigger set_solutions_updated_at_before_update before update on public.solutions for each row execute function public.set_domain_updated_at();

alter table public.problems enable row level security;
alter table public.solutions enable row level security;
alter table public.solution_problems enable row level security;

drop policy if exists "Public can read problems" on public.problems;
create policy "Public can read problems" on public.problems for select to anon, authenticated using (true);
drop policy if exists "Authenticated users can create problems" on public.problems;
create policy "Authenticated users can create problems" on public.problems for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "Authors can update own problems" on public.problems;
create policy "Authors can update own problems" on public.problems for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "Authors can delete own problems" on public.problems;
create policy "Authors can delete own problems" on public.problems for delete to authenticated using (auth.uid() = author_id);

drop policy if exists "Public can read solutions" on public.solutions;
create policy "Public can read solutions" on public.solutions for select to anon, authenticated using (true);
drop policy if exists "Authenticated users can create solutions" on public.solutions;
create policy "Authenticated users can create solutions" on public.solutions for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "Authors can update own solutions" on public.solutions;
create policy "Authors can update own solutions" on public.solutions for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "Authors can delete own solutions" on public.solutions;
create policy "Authors can delete own solutions" on public.solutions for delete to authenticated using (auth.uid() = author_id);

drop policy if exists "Public can read solution problem links" on public.solution_problems;
create policy "Public can read solution problem links" on public.solution_problems for select to anon, authenticated using (true);
drop policy if exists "Solution authors can create problem links" on public.solution_problems;
create policy "Solution authors can create problem links" on public.solution_problems for insert to authenticated with check (exists (select 1 from public.solutions where solutions.id = solution_id and solutions.author_id = auth.uid()));
drop policy if exists "Solution authors can update problem links" on public.solution_problems;
create policy "Solution authors can update problem links" on public.solution_problems for update to authenticated using (exists (select 1 from public.solutions where solutions.id = solution_id and solutions.author_id = auth.uid())) with check (exists (select 1 from public.solutions where solutions.id = solution_id and solutions.author_id = auth.uid()));
drop policy if exists "Solution authors can delete problem links" on public.solution_problems;
create policy "Solution authors can delete problem links" on public.solution_problems for delete to authenticated using (exists (select 1 from public.solutions where solutions.id = solution_id and solutions.author_id = auth.uid()));

create or replace function public.create_solution_with_problems(
  p_author_id uuid,
  p_author_name text,
  p_title text,
  p_summary text,
  p_description text,
  p_category text,
  p_image_url text,
  p_organization text,
  p_status text,
  p_maturity_level text,
  p_implementation_difficulty text,
  p_estimated_cost text,
  p_implementation_time text,
  p_location text,
  p_country text,
  p_impact_metric text,
  p_tags text[],
  p_evidence_links text[],
  p_problem_ids uuid[]
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_solution_id uuid;
  problem_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_author_id then
    raise exception 'Only the authenticated author can create a solution' using errcode = '42501';
  end if;

  if coalesce(array_length(p_problem_ids, 1), 0) = 0 then
    raise exception 'At least one related problem is required' using errcode = '23514';
  end if;

  insert into public.solutions (
    author_id,
    author_name,
    title,
    summary,
    description,
    category,
    image_url,
    organization,
    status,
    maturity_level,
    implementation_difficulty,
    estimated_cost,
    implementation_time,
    location,
    country,
    impact_metric,
    tags,
    evidence_links
  ) values (
    p_author_id,
    nullif(trim(p_author_name), ''),
    trim(p_title),
    trim(p_summary),
    trim(p_description),
    p_category,
    nullif(trim(p_image_url), ''),
    trim(p_organization),
    p_status,
    p_maturity_level,
    p_implementation_difficulty,
    nullif(trim(p_estimated_cost), ''),
    nullif(trim(p_implementation_time), ''),
    trim(p_location),
    trim(p_country),
    trim(p_impact_metric),
    coalesce(p_tags, '{}'::text[]),
    coalesce(p_evidence_links, '{}'::text[])
  ) returning id into new_solution_id;

  foreach problem_id in array p_problem_ids loop
    insert into public.solution_problems (solution_id, problem_id)
    values (new_solution_id, problem_id);
  end loop;

  return new_solution_id;
end;
$$;

create or replace function public.update_solution_with_problems(
  p_solution_id uuid,
  p_title text default null,
  p_summary text default null,
  p_description text default null,
  p_category text default null,
  p_image_url text default null,
  p_organization text default null,
  p_author_name text default null,
  p_status text default null,
  p_maturity_level text default null,
  p_implementation_difficulty text default null,
  p_estimated_cost text default null,
  p_implementation_time text default null,
  p_location text default null,
  p_country text default null,
  p_impact_metric text default null,
  p_tags text[] default null,
  p_evidence_links text[] default null,
  p_problem_ids uuid[] default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  problem_id uuid;
begin
  if not exists (select 1 from public.solutions where id = p_solution_id and author_id = auth.uid()) then
    raise exception 'Only the author can update this solution' using errcode = '42501';
  end if;

  update public.solutions set
    title = coalesce(trim(p_title), title),
    summary = coalesce(trim(p_summary), summary),
    description = coalesce(trim(p_description), description),
    category = coalesce(p_category, category),
    image_url = case when p_image_url is null then image_url else nullif(trim(p_image_url), '') end,
    organization = coalesce(trim(p_organization), organization),
    author_name = case when p_author_name is null then author_name else nullif(trim(p_author_name), '') end,
    status = coalesce(p_status, status),
    maturity_level = coalesce(p_maturity_level, maturity_level),
    implementation_difficulty = coalesce(p_implementation_difficulty, implementation_difficulty),
    estimated_cost = case when p_estimated_cost is null then estimated_cost else nullif(trim(p_estimated_cost), '') end,
    implementation_time = case when p_implementation_time is null then implementation_time else nullif(trim(p_implementation_time), '') end,
    location = coalesce(trim(p_location), location),
    country = coalesce(trim(p_country), country),
    impact_metric = coalesce(trim(p_impact_metric), impact_metric),
    tags = coalesce(p_tags, tags),
    evidence_links = coalesce(p_evidence_links, evidence_links)
  where id = p_solution_id;

  if p_problem_ids is not null then
    if coalesce(array_length(p_problem_ids, 1), 0) = 0 then
      raise exception 'At least one related problem is required' using errcode = '23514';
    end if;

    delete from public.solution_problems where solution_id = p_solution_id;

    foreach problem_id in array p_problem_ids loop
      insert into public.solution_problems (solution_id, problem_id)
      values (p_solution_id, problem_id);
    end loop;
  end if;

  return p_solution_id;
end;
$$;
