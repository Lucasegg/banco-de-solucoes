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
