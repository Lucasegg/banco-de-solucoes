-- Minimal non-production schema for applying the pending Sprint 32 migration.
-- It validates only that pending migration; the remote history remains protected
-- by the migration baseline and reconciliation checks.
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select null::uuid $$;

create table public.problems (
  id uuid primary key,
  author_id uuid not null,
  author_name text,
  title text not null,
  summary text,
  description text not null,
  category text not null,
  city text not null,
  state text not null,
  status text not null,
  tags text[] not null default '{}',
  likes integer not null default 0,
  comments integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.solutions (
  id uuid primary key,
  author_id uuid not null,
  author_name text,
  title text not null,
  summary text not null,
  description text not null,
  category text not null,
  organization text not null,
  status text not null,
  impact_metric text not null,
  tags text[] not null default '{}',
  evidence_links text[] not null default '{}',
  likes integer not null default 0,
  comments integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.solution_problems (
  solution_id uuid not null references public.solutions(id),
  problem_id uuid not null references public.problems(id),
  primary key (solution_id, problem_id)
);

create table public.favorites (
  id uuid primary key,
  user_id uuid not null,
  problem_id uuid,
  solution_id uuid
);

insert into public.problems (id, author_id, title, summary, description, category, city, state, status, tags)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Drenagem urbana', 'Alagamentos', 'Busca textual de problema.', 'Infraestrutura', 'São Paulo', 'SP', 'Aberto', array['drenagem']);
insert into public.solutions (id, author_id, title, summary, description, category, organization, status, impact_metric, tags, evidence_links)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Jardins de chuva', 'Solução para drenagem', 'Busca textual de solução.', 'Infraestrutura', 'Prefeitura', 'Proposta', 'Redução de alagamentos', array['drenagem'], '{}');
insert into public.solution_problems (solution_id, problem_id)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
