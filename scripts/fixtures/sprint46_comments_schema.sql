-- Production-compatible cumulative comments contract after the Sprint 20 rename.
-- This CI-only fixture does not recreate or alter the table in a migration.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  parent_id uuid references public.comments(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  solution_id uuid references public.solutions(id) on delete cascade,
  content text not null,
  edited boolean not null default false,
  deleted boolean not null default false,
  visibility text not null default 'visible' check (visibility in ('visible','hidden','removed')),
  best_answer boolean not null default false,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  constraint comments_single_target_check check ((problem_id is not null) <> (solution_id is not null)),
  constraint comments_user_id_fkey foreign key(user_id) references auth.users(id) on delete cascade,
  constraint comments_user_profile_fkey foreign key(user_id) references public.profiles(id) on delete cascade
);
create index comments_user_id_idx on public.comments(user_id);
create index comments_problem_id_created_at_idx on public.comments(problem_id,created_at desc) where problem_id is not null;
create index comments_solution_id_created_at_idx on public.comments(solution_id,created_at desc) where solution_id is not null;
alter table public.comments enable row level security;
create policy comments_public_visible on public.comments for select to anon,authenticated using(not deleted and visibility='visible');
revoke all on public.comments from public,anon,authenticated;
grant select on public.comments to anon,authenticated;
