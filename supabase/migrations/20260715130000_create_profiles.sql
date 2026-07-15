-- Sprint 13: Supabase Auth profiles only. Other domains remain local.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  country text,
  bio text,
  avatar_url text,
  role text not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_role_check check (role in ('member', 'curator', 'moderator', 'admin')),
  constraint profiles_username_format_check check (username is null or username ~ '^[a-z0-9._-]{3,24}$'),
  constraint profiles_username_normalized_check check (username is null or username = lower(username))
);

comment on table public.profiles is 'Public Supabase Auth profile records. Sprint 13 migrates only auth/session/profile.';
comment on column public.profiles.role is 'Authorization role. Defaults to member and must not be accepted from client metadata.';
comment on column public.profiles.username is 'Normalized unique public username: lowercase letters, numbers, dot, hyphen or underscore.';

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_role_idx on public.profiles (role);

drop trigger if exists normalize_profile_username_before_write on public.profiles;
create or replace function public.normalize_profile_username()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.username is not null then
    new.username := lower(trim(new.username));
  end if;
  return new;
end;
$$;
create trigger normalize_profile_username_before_write
before insert or update on public.profiles
for each row execute function public.normalize_profile_username();

drop trigger if exists set_profile_updated_at_before_update on public.profiles;
create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;
create trigger set_profile_updated_at_before_update
before update on public.profiles
for each row execute function public.set_profile_updated_at();

drop trigger if exists prevent_profile_immutable_self_change_before_update on public.profiles;
create or replace function public.prevent_profile_immutable_self_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'Users cannot change their own role' using errcode = '42501';
  end if;
  if auth.uid() = old.id and (new.id is distinct from old.id or new.created_at is distinct from old.created_at) then
    raise exception 'Users cannot change immutable profile fields' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger prevent_profile_immutable_self_change_before_update
before update on public.profiles
for each row execute function public.prevent_profile_immutable_self_change();

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  raw_username text := nullif(lower(trim(metadata ->> 'username')), '');
begin
  insert into public.profiles (id, username, display_name, country, bio, avatar_url, role)
  values (
    new.id,
    raw_username,
    nullif(trim(metadata ->> 'display_name'), ''),
    nullif(trim(metadata ->> 'country'), ''),
    nullif(trim(metadata ->> 'bio'), ''),
    nullif(trim(metadata ->> 'avatar_url'), ''),
    'member'
  )
  on conflict (id) do update set
    username = coalesce(public.profiles.username, excluded.username),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    country = coalesce(public.profiles.country, excluded.country),
    bio = coalesce(public.profiles.bio, excluded.bio),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user_profile();

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read public profiles" on public.profiles;
create policy "Authenticated users can read public profiles"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Authenticated users update own editable profile" on public.profiles;
create policy "Authenticated users update own editable profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

comment on policy "Authenticated users can read public profiles" on public.profiles is 'Current product rule: profiles are readable only to authenticated users.';
comment on policy "Authenticated users update own editable profile" on public.profiles is 'Common users may update only their profile. A trigger blocks user changes to id, role and created_at without querying profiles from RLS. Critical admin permissions need trusted claims/backend validation in a later sprint.';
