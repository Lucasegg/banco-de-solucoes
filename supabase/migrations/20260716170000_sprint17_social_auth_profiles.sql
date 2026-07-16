-- Sprint 17: safer profile bootstrap for Supabase OAuth identities.
create extension if not exists pgcrypto;

alter table public.profiles drop constraint if exists profiles_username_format_check;
alter table public.profiles add constraint profiles_username_format_check check (username is null or username ~ '^[a-z0-9._-]{3,30}$');

drop index if exists profiles_username_lower_unique_idx;
create unique index if not exists profiles_username_lower_unique_idx on public.profiles (lower(username)) where username is not null;

create or replace function public.profile_slug_from_text(value text, fallback text default 'user')
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  slug text;
begin
  slug := lower(coalesce(value, ''));
  slug := regexp_replace(slug, '[^a-z0-9._-]+', '-', 'g');
  slug := regexp_replace(slug, '^[._-]+|[._-]+$', '', 'g');
  slug := substring(slug from 1 for 24);
  if slug !~ '^[a-z0-9._-]{3,30}$' then
    slug := substring(lower(regexp_replace(coalesce(fallback, 'user'), '[^a-z0-9]+', '', 'g')) from 1 for 18);
  end if;
  if length(coalesce(slug, '')) < 3 then
    slug := 'user';
  end if;
  return slug;
end;
$$;

create or replace function public.generate_unique_profile_username(preferred text, fallback_seed text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text := public.profile_slug_from_text(preferred, fallback_seed);
  candidate text;
  suffix text;
  attempt integer := 0;
begin
  loop
    if attempt = 0 then
      candidate := substring(base from 1 for 30);
    else
      suffix := lower(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));
      candidate := substring(base from 1 for greatest(3, 30 - length(suffix) - 1)) || '-' || suffix;
    end if;

    exit when not exists (select 1 from public.profiles where lower(username) = lower(candidate));
    attempt := attempt + 1;
    if attempt > 20 then
      candidate := 'user-' || lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 16));
      exit when not exists (select 1 from public.profiles where lower(username) = lower(candidate));
    end if;
  end loop;

  return candidate;
end;
$$;

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  preferred_username text := coalesce(nullif(metadata ->> 'user_name', ''), nullif(metadata ->> 'preferred_username', ''), nullif(metadata ->> 'username', ''), split_part(coalesce(new.email, ''), '@', 1));
  safe_username text := public.generate_unique_profile_username(preferred_username, new.id::text);
  safe_display_name text := nullif(trim(coalesce(metadata ->> 'name', metadata ->> 'full_name', metadata ->> 'display_name')), '');
  safe_avatar_url text := nullif(trim(coalesce(metadata ->> 'avatar_url', metadata ->> 'picture')), '');
begin
  insert into public.profiles (id, username, display_name, country, bio, avatar_url, role)
  values (
    new.id,
    safe_username,
    safe_display_name,
    nullif(trim(metadata ->> 'country'), ''),
    nullif(trim(metadata ->> 'bio'), ''),
    safe_avatar_url,
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
