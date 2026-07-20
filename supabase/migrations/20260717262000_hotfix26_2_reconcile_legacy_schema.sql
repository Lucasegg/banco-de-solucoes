-- Hotfix 26.2 — reconciliation for production databases with an incomplete legacy
-- migration history. This migration is deliberately additive: it never drops tables,
-- truncates rows, changes primary keys, or replays imports/seeds.
-- Inventory reconciled: profiles/social fields; problems/solutions/catalog provenance;
-- comments/comment_reports; favorites/reactions; contributions/contribution_audit;
-- audit_events; notifications; problem_timeline; storage image buckets and policies;
-- Sprint 20–24 triggers/RPCs and Sprint 25 map RPC grants.
create extension if not exists pgcrypto;

-- Tables that are known to be absent in the legacy production snapshot.
create table if not exists public.reactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 problem_id uuid references public.problems(id) on delete cascade, solution_id uuid references public.solutions(id) on delete cascade,
 reaction_type text not null check (reaction_type in ('like','helpful','support')), created_at timestamptz not null default timezone('utc',now()),
 check ((problem_id is null) <> (solution_id is null)));
create table if not exists public.contributions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 problem_id uuid references public.problems(id) on delete cascade, solution_id uuid references public.solutions(id) on delete cascade,
 payload jsonb not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
 moderator_id uuid, reviewed_at timestamptz, rejection_reason text, created_at timestamptz not null default timezone('utc',now()),
 updated_at timestamptz not null default timezone('utc',now()), check ((problem_id is null) <> (solution_id is null)));
create table if not exists public.contribution_audit (
 id uuid primary key default gen_random_uuid(), contribution_id uuid not null references public.contributions(id) on delete cascade,
 moderator_id uuid not null references auth.users(id), previous_status text, next_status text not null, reason text, created_at timestamptz not null default timezone('utc',now()));
create table if not exists public.audit_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null, event_type text not null,
 target_type text, target_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc',now()));
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users(id) on delete cascade, actor_id uuid references auth.users(id) on delete set null,
 type text not null, title text not null, body text, target_type text, target_id uuid, href text, metadata jsonb not null default '{}'::jsonb,
 read_at timestamptz, created_at timestamptz not null default timezone('utc',now()));
create table if not exists public.problem_timeline (
 id uuid primary key default gen_random_uuid(), problem_id uuid not null references public.problems(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, event_type text not null, title text not null, description text, status_before text, status_after text,
 official boolean not null default false, organization_name text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default timezone('utc',now()));

-- Existing tables can be partial. Additive columns use IF NOT EXISTS and nullable
-- defaults so existing rows are preserved (no ID regeneration and no seed replay).
alter table public.profiles add column if not exists website text, add column if not exists organization text, add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.problems add column if not exists source_type text, add column if not exists source_name text, add column if not exists source_url text, add column if not exists source_published_at timestamptz, add column if not exists source_accessed_at timestamptz, add column if not exists source_verified_at timestamptz, add column if not exists source_metadata jsonb not null default '{}'::jsonb, add column if not exists imported_from_external_source boolean not null default false, add column if not exists latitude double precision, add column if not exists longitude double precision, add column if not exists geolocation_precision text, add column if not exists geolocation_source text, add column if not exists geocoded_at timestamptz;
alter table public.comments add column if not exists user_id uuid, add column if not exists visibility text not null default 'visible', add column if not exists deleted boolean not null default false, add column if not exists updated_at timestamptz not null default timezone('utc',now());
alter table public.favorites add column if not exists created_at timestamptz not null default timezone('utc',now());

-- Constraints are catalog-guarded because ADD CONSTRAINT has no IF NOT EXISTS.
do $$ begin
 if to_regclass('public.problems') is not null and not exists(select 1 from pg_constraint where conrelid='public.problems'::regclass and conname='problems_geolocation_pair_check') then alter table public.problems add constraint problems_geolocation_pair_check check ((latitude is null) = (longitude is null)) not valid; end if;
 if to_regclass('public.problems') is not null and not exists(select 1 from pg_constraint where conrelid='public.problems'::regclass and conname='problems_latitude_check') then alter table public.problems add constraint problems_latitude_check check (latitude is null or latitude between -90 and 90) not valid; end if;
 if to_regclass('public.problems') is not null and not exists(select 1 from pg_constraint where conrelid='public.problems'::regclass and conname='problems_longitude_check') then alter table public.problems add constraint problems_longitude_check check (longitude is null or longitude between -180 and 180) not valid; end if;
 if to_regclass('public.comments') is not null and not exists(select 1 from pg_constraint where conrelid='public.comments'::regclass and conname='comments_user_profile_fkey') then alter table public.comments add constraint comments_user_profile_fkey foreign key(user_id) references public.profiles(id) on delete cascade not valid; end if;
end $$;

create unique index if not exists reactions_user_problem_type_unique on public.reactions(user_id,problem_id,reaction_type) where problem_id is not null;
create unique index if not exists reactions_user_solution_type_unique on public.reactions(user_id,solution_id,reaction_type) where solution_id is not null;
create index if not exists contributions_user_created_idx on public.contributions(user_id,created_at desc);
create index if not exists contribution_audit_contribution_idx on public.contribution_audit(contribution_id,created_at desc);
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);
create index if not exists problem_timeline_problem_created_idx on public.problem_timeline(problem_id,created_at,id);
create index if not exists problems_latitude_idx on public.problems(latitude) where latitude is not null;
create index if not exists problems_longitude_idx on public.problems(longitude) where longitude is not null;

-- Safe replacements restore the public map contract and preserve the Sprint 25.1 signature.
create or replace function public.public_problem_coordinate(value double precision, precision text) returns double precision language sql immutable strict set search_path=public as $$ select case precision when 'exact' then value when 'street' then round(value::numeric,3)::double precision when 'neighborhood' then round(value::numeric,2)::double precision when 'city' then round(value::numeric,1)::double precision when 'state' then round(value::numeric,0)::double precision end $$;
create or replace function public.get_problem_region_summary() returns table(state text,city text,total_problems bigint,in_progress bigint,resolved bigint,last_updated timestamptz) language sql stable security definer set search_path=public as $$ select state,city,count(*),count(*) filter(where status='Em execução'),count(*) filter(where status='Resolvido'),max(updated_at) from public.problems where latitude is not null and longitude is not null group by state,city order by state,city $$;
create or replace function public.get_public_problem_location(p_problem_id uuid) returns table(id uuid,title text,category text,status text,city text,state text,latitude double precision,longitude double precision,geolocation_precision text,updated_at timestamptz,source_verified_at timestamptz) language sql stable security definer set search_path=public as $$ select id,title,category,status,city,state,public.public_problem_coordinate(latitude,geolocation_precision),public.public_problem_coordinate(longitude,geolocation_precision),geolocation_precision,updated_at,source_verified_at from public.problems where id=p_problem_id and latitude is not null and longitude is not null $$;
create or replace function public.write_audit_event(p_event_type text,p_target_type text default null,p_target_id uuid default null,p_metadata jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path=public as $$ declare v_id uuid; begin insert into public.audit_events(actor_id,event_type,target_type,target_id,metadata) values(auth.uid(),p_event_type,p_target_type,p_target_id,coalesce(p_metadata,'{}')) returning id into v_id; return v_id; end $$;

-- Re-enable RLS and recreate only absent policies; existing policies are retained.
alter table public.reactions enable row level security; alter table public.contributions enable row level security; alter table public.contribution_audit enable row level security; alter table public.audit_events enable row level security; alter table public.notifications enable row level security; alter table public.problem_timeline enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='reactions' and policyname='Users can read own reactions') then create policy "Users can read own reactions" on public.reactions for select to authenticated using(auth.uid()=user_id); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='reactions' and policyname='Users can create own reactions') then create policy "Users can create own reactions" on public.reactions for insert to authenticated with check(auth.uid()=user_id); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='Users read only own notifications') then create policy "Users read only own notifications" on public.notifications for select to authenticated using(recipient_id=auth.uid()); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='problem_timeline' and policyname='Public reads problem timeline') then create policy "Public reads problem timeline" on public.problem_timeline for select to anon,authenticated using(true); end if;
end $$;
revoke all on function public.public_problem_coordinate(double precision,text) from public,anon,authenticated;
revoke all on function public.write_audit_event(text,text,uuid,jsonb) from public;
grant execute on function public.get_problem_region_summary() to anon,authenticated;
grant execute on function public.get_public_problem_location(uuid) to anon,authenticated;

-- Storage catalog writes are idempotent; no objects/content are removed.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),('problem-images','problem-images',true,5242880,array['image/jpeg','image/png','image/webp']),('solution-images','solution-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
do $$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public read image buckets') then create policy "Public read image buckets" on storage.objects for select using(bucket_id in ('avatars','problem-images','solution-images')); end if; end $$;
notify pgrst, 'reload schema';

-- Read-only catalog audit used by scripts/auditLegacySchema.ts. It exposes names,
-- never secrets, and lets the service role inspect complete structural expectations.
create or replace function public.audit_legacy_schema() returns jsonb language sql stable security definer set search_path=public,pg_catalog,information_schema as $$
 with required_tables(name) as (values ('profiles'),('problems'),('solutions'),('comments'),('favorites'),('reactions'),('contributions'),('contribution_audit'),('audit_events'),('notifications'),('problem_timeline')),
 required_columns(table_name,column_name) as (values ('profiles','social_links'),('profiles','website'),('profiles','organization'),('problems','source_metadata'),('problems','source_verified_at'),('problems','latitude'),('problems','longitude'),('comments','user_id'),('favorites','user_id'),('reactions','reaction_type'),('contributions','payload'),('notifications','recipient_id')),
 required_functions(name) as (values ('public.public_problem_coordinate(double precision,text)'),('public.get_problem_region_summary()'),('public.get_public_problem_location(uuid)'),('public.write_audit_event(text,text,uuid,jsonb)')),
 missing as (
 select 'table:'||name item from required_tables where to_regclass('public.'||name) is null union all
 select 'column:'||table_name||'.'||column_name from required_columns r where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name) union all
 select 'function:'||name from required_functions where to_regprocedure(name) is null union all
 select 'policy:storage.objects/Public read image buckets' where not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public read image buckets') union all
 select 'bucket:'||id from (values ('avatars'),('problem-images'),('solution-images')) b(id) where not exists(select 1 from storage.buckets where buckets.id=b.id)
 ) select jsonb_build_object('ok',not exists(select 1 from missing),'missing',coalesce((select jsonb_agg(item order by item) from missing),'[]'::jsonb))
$$;
revoke all on function public.audit_legacy_schema() from public;
grant execute on function public.audit_legacy_schema() to service_role;
