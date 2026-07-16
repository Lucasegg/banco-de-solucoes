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

-- Website is optional, but must be an absolute HTTP(S) URL when present.
alter table public.profiles drop constraint if exists profiles_website_format_check;
alter table public.profiles add constraint profiles_website_format_check
  check (website is null or (char_length(website) <= 300 and website ~* '^https?://'));

-- Keep usernames normalized and protect against case-only duplicates.
drop index if exists public.profiles_username_lower_unique_idx;
create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.organization is 'Public organization shown on the user profile.';
comment on column public.profiles.city is 'Public city shown on the user profile.';
comment on column public.profiles.state is 'Public state shown on the user profile.';
comment on column public.profiles.website is 'Public website shown on the user profile. Optional absolute HTTP(S) URL.';

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  raw_username text := nullif(lower(trim(metadata ->> 'username')), '');
  raw_website text := nullif(trim(metadata ->> 'website'), '');
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
    case when raw_website ~* '^https?://' then raw_website else null end,
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

-- Recreate profile self-update protection in this migration so Sprint 15 is self-contained.
drop policy if exists "Authenticated users update own editable profile" on public.profiles;
create policy "Authenticated users update own editable profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop trigger if exists prevent_profile_immutable_self_change_before_update on public.profiles;
create or replace function public.prevent_profile_immutable_self_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() = old.id and (
    new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.created_at is distinct from old.created_at
    or new.avatar_url is distinct from old.avatar_url
  ) then
    raise exception 'Users cannot change administrative profile fields' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger prevent_profile_immutable_self_change_before_update
before update on public.profiles
for each row execute function public.prevent_profile_immutable_self_change();

comment on policy "Authenticated users update own editable profile" on public.profiles is 'Users may update only their own row. Repository updates only editable public fields; this migration recreates trigger protection for id, role, created_at and administrative compatibility fields.';
comment on function public.prevent_profile_immutable_self_change() is 'Blocks authenticated users from directly changing administrative profile fields such as id, role, created_at and avatar_url.';
