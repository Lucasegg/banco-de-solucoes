create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  solution_id uuid references public.solutions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint favorites_one_target_check check (
    (problem_id is not null and solution_id is null) or
    (problem_id is null and solution_id is not null)
  )
);

create unique index if not exists favorites_user_problem_unique_idx
  on public.favorites(user_id, problem_id)
  where problem_id is not null;

create unique index if not exists favorites_user_solution_unique_idx
  on public.favorites(user_id, solution_id)
  where solution_id is not null;

create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists favorites_problem_id_idx on public.favorites(problem_id) where problem_id is not null;
create index if not exists favorites_solution_id_idx on public.favorites(solution_id) where solution_id is not null;
create index if not exists favorites_created_at_idx on public.favorites(created_at desc);

alter table public.favorites enable row level security;

drop policy if exists "Users can read own favorites" on public.favorites;
create policy "Users can read own favorites" on public.favorites
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own favorites" on public.favorites;
create policy "Users can create own favorites" on public.favorites
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can delete own favorites" on public.favorites
  for delete to authenticated
  using (auth.uid() = user_id);
