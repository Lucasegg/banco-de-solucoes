-- Sprint 37 distributed, privacy-preserving contact rate limiting.
begin;

create table public.contact_rate_limits (
  identifier_hash text not null check (identifier_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts smallint not null check (attempts between 1 and 5),
  expires_at timestamptz not null,
  primary key (identifier_hash, window_start),
  check (expires_at > window_start)
);

alter table public.contact_rate_limits enable row level security;
alter table public.contact_rate_limits force row level security;
revoke all on table public.contact_rate_limits from public, anon, authenticated, service_role;

create or replace function public.claim_contact_rate_limit(p_identifier_hash text, p_now timestamptz default now())
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed boolean;
  bucket timestamptz := date_trunc('hour', p_now);
begin
  if p_identifier_hash is null or p_identifier_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  delete from public.contact_rate_limits where expires_at <= p_now;

  insert into public.contact_rate_limits(identifier_hash, window_start, attempts, expires_at)
  values (p_identifier_hash, bucket, 1, bucket + interval '2 hours')
  on conflict (identifier_hash, window_start) do update
    set attempts = contact_rate_limits.attempts + 1
    where contact_rate_limits.attempts < 5
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke all on function public.claim_contact_rate_limit(text, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_contact_rate_limit(text, timestamptz) to service_role;

commit;
