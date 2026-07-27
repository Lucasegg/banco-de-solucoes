-- Minimal non-production schema for applying the pending Sprint 32 and Sprint 33 migrations.
-- It validates only those pending migrations; the remote history remains protected
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
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.profiles (
  id uuid primary key,
  role text not null default 'member'
);

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
  updated_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  geolocation_precision text
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

-- Real pre-Sprint-33 dependency from Sprint 25. Keep the same signature and
-- behavior so migration validation cannot hide projection/type errors.
create or replace function public.public_problem_coordinate(value double precision, p_precision text)
returns double precision language sql immutable strict set search_path=public as $$
  select case p_precision
    when 'exact' then value
    when 'street' then round(value::numeric,3)::double precision
    when 'neighborhood' then round(value::numeric,2)::double precision
    when 'city' then round(value::numeric,1)::double precision
    when 'state' then round(value::numeric,0)::double precision
  end;
$$;

insert into public.problems (id, author_id, title, summary, description, category, city, state, status, tags, latitude, longitude, geolocation_precision)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Drenagem urbana', 'Alagamentos', 'Busca textual de problema.', '  infraestrutura ', 'São Paulo', 'SP', 'Aberto', array[' drenagem ','DRENAGEM',''], -23.5505, -46.6333, 'exact'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Drenagem próxima A', 'Alagamentos', 'Busca textual próxima.', 'Infraestrutura', 'São Paulo', 'SP', 'Aberto', array['drenagem'], -23.5415, -46.6333, 'exact'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Drenagem próxima B', 'Alagamentos', 'Busca textual próxima.', 'Infraestrutura', 'São Paulo', 'SP', 'Aberto', array['drenagem'], -23.5415, -46.6333, 'exact'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000010', 'Drenagem distante', 'Alagamentos', 'Busca textual distante.', 'Infraestrutura', 'São Paulo', 'SP', 'Aberto', array['drenagem'], -23.3505, -46.6333, 'exact'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000010', 'Drenagem sem coordenadas', 'Alagamentos', 'Busca textual sem coordenadas.', 'Infraestrutura', 'São Paulo', 'SP', 'Aberto', array['drenagem'], null, null, null);
update public.problems set updated_at='2025-01-01 00:00:00+00' where id='00000000-0000-0000-0000-000000000001';
insert into public.solutions (id, author_id, title, summary, description, category, organization, status, impact_metric, tags, evidence_links)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Jardins de chuva', 'Solução para drenagem', 'Busca textual de solução.', 'Infraestrutura', 'Prefeitura', 'Proposta', 'Redução de alagamentos', array['drenagem'], '{}');
insert into public.solution_problems (solution_id, problem_id)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
