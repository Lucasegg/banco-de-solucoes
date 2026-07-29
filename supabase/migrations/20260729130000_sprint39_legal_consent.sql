-- Sprint 39: versioned, append-only legal consent. No request metadata is stored.
begin;
create extension if not exists pgcrypto;

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  document_type text not null check (document_type in ('terms', 'privacy')),
  document_version text not null,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  accepted_at timestamptz not null default now(),
  unique (user_id, document_type, document_version),
  check ((document_type = 'terms' and document_version = 'terms-2026-07-29') or
         (document_type = 'privacy' and document_version = 'privacy-2026-07-29'))
);
comment on table public.legal_acceptances is 'Append-only acceptance history; intentionally excludes IP, user-agent, token and session data.';

alter table public.legal_acceptances enable row level security;
alter table public.legal_acceptances force row level security;
create policy legal_acceptances_own_read on public.legal_acceptances for select to authenticated using (user_id = auth.uid());

create function public.accept_current_legal_documents(p_locale text) returns void
language plpgsql security definer set search_path = public, pg_catalog as $$
declare actor uuid := auth.uid(); anonymous_session boolean := coalesce((auth.jwt()->>'is_anonymous')::boolean, false);
begin
  if actor is null or anonymous_session then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_locale not in ('pt-BR', 'en-US') then raise exception 'invalid locale' using errcode = '22023'; end if;
  insert into public.legal_acceptances (user_id, document_type, document_version, locale)
  values (actor, 'terms', 'terms-2026-07-29', p_locale), (actor, 'privacy', 'privacy-2026-07-29', p_locale)
  on conflict (user_id, document_type, document_version) do nothing;
end $$;

create function public.get_my_legal_consent_status() returns jsonb
language plpgsql stable security definer set search_path = public, pg_catalog as $$
declare actor uuid := auth.uid(); anonymous_session boolean := coalesce((auth.jwt()->>'is_anonymous')::boolean, false); result jsonb;
begin
  if actor is null or anonymous_session then raise exception 'authentication required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'required_versions', jsonb_build_object('terms', 'terms-2026-07-29', 'privacy', 'privacy-2026-07-29'),
    'accepted', coalesce(jsonb_agg(jsonb_build_object('document_type', document_type, 'document_version', document_version, 'locale', locale, 'accepted_at', accepted_at) order by accepted_at) filter (where id is not null), '[]'::jsonb),
    'pending', count(*) filter (where (document_type = 'terms' and document_version = 'terms-2026-07-29') or (document_type = 'privacy' and document_version = 'privacy-2026-07-29')) < 2
  ) into result from public.legal_acceptances where user_id = actor;
  return result;
end $$;

revoke all on table public.legal_acceptances from public, anon, authenticated;
grant select on table public.legal_acceptances to authenticated;
revoke all on function public.accept_current_legal_documents(text), public.get_my_legal_consent_status() from public, anon, authenticated;
grant execute on function public.accept_current_legal_documents(text), public.get_my_legal_consent_status() to authenticated;
commit;
