\set ON_ERROR_STOP on
-- Production-compatible cumulative contributions contract after Sprint 30.
-- This isolated-CI fixture installs only the table shape consumed by Sprint 48.
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  solution_id uuid references public.solutions(id) on delete cascade,
  contribution_type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  moderator_id uuid references auth.users(id) on delete set null,
  rejection_reason text,
  moderation_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc',now()),
  constraint contributions_exactly_one_target_check check ((problem_id is not null)::integer+(solution_id is not null)::integer=1),
  constraint contributions_status_check check (status in ('pending','changes_requested','approved','rejected','withdrawn')),
  constraint contributions_type_check check (contribution_type in ('correction','supplement','status_update','evidence','description_improvement','location','other')),
  constraint contributions_payload_check check (jsonb_typeof(payload)='object' and payload<>'{}'::jsonb and jsonb_array_length(coalesce(payload->'changes','[]'::jsonb))>0),
  constraint contributions_review_fields_check check (
    (status in ('pending','changes_requested','withdrawn') and reviewed_at is null)
    or (status in ('approved','rejected') and reviewed_at is not null and moderator_id is not null)
  )
);
alter table public.contributions enable row level security;
create index if not exists contributions_user_created_idx on public.contributions(user_id,created_at desc);
create index if not exists contributions_target_status_created_idx on public.contributions(status,problem_id,solution_id,created_at desc);
revoke all on table public.contributions from anon;
