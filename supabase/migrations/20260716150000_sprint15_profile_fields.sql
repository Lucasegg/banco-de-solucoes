-- Sprint 15: editable complete profiles.
-- Extends public.profiles without recreating the table.

alter table public.profiles
  add column if not exists organization text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists website text;

-- Replace the previous 24-character username limit with the Sprint 15 limit.
alter table public.profiles drop constraint if exists profiles_username_format_check;
alter table public.profiles add constraint profiles_username_format_check
  check (username is null or username ~ '^[a-z0-9._-]{3,30}$');

-- Keep usernames normalized and protect against case-only duplicates.
drop index if exists public.profiles_username_lower_unique_idx;
create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.organization is 'Public organization shown on the user profile.';
comment on column public.profiles.city is 'Public city shown on the user profile.';
comment on column public.profiles.state is 'Public state shown on the user profile.';
comment on column public.profiles.website is 'Public website shown on the user profile.';

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
  insert into public.profiles (id, username, display_name, organization, city, state, country, bio, avatar_url, website, role)
  values (
    new.id,
    raw_username,
    nullif(trim(metadata ->> 'display_name'), ''),
    nullif(trim(metadata ->> 'organization'), ''),
    nullif(trim(metadata ->> 'city'), ''),
    nullif(trim(metadata ->> 'state'), ''),
    nullif(trim(metadata ->> 'country'), ''),
    nullif(trim(metadata ->> 'bio'), ''),
    nullif(trim(metadata ->> 'avatar_url'), ''),
    nullif(trim(metadata ->> 'website'), ''),
    'member'
  )
  on conflict (id) do update set
    username = coalesce(public.profiles.username, excluded.username),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    organization = coalesce(public.profiles.organization, excluded.organization),
    city = coalesce(public.profiles.city, excluded.city),
    state = coalesce(public.profiles.state, excluded.state),
    country = coalesce(public.profiles.country, excluded.country),
    bio = coalesce(public.profiles.bio, excluded.bio),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    website = coalesce(public.profiles.website, excluded.website);
  return new;
end;
$$;

comment on policy "Authenticated users update own editable profile" on public.profiles is 'Users may update only their row. Repository updates only editable public fields; triggers block id, role and created_at changes.';
