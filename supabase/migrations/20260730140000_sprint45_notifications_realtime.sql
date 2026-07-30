-- Sprint 45: safe Realtime signals, private preferences and user-controlled retention.
begin;

create index if not exists notifications_recipient_read_created_idx
  on public.notifications(recipient_id, read_at, created_at);

create table public.notification_realtime_signals (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  notification_order bigint not null,
  change_type text not null check (change_type in ('INSERT','UPDATE')),
  signaled_at timestamptz not null default clock_timestamp()
);
create index notification_realtime_signals_recipient_order_idx
  on public.notification_realtime_signals(recipient_id, notification_order desc, id desc);
alter table public.notification_realtime_signals enable row level security;
alter table public.notification_realtime_signals force row level security;
revoke all on table public.notification_realtime_signals from public, anon;
revoke insert, update, delete on table public.notification_realtime_signals from authenticated;
grant select on table public.notification_realtime_signals to authenticated;
create policy notification_realtime_signals_select_own on public.notification_realtime_signals
  for select to authenticated using (recipient_id=auth.uid());

create function public.signal_notification_change_sprint45() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  insert into public.notification_realtime_signals(recipient_id,notification_id,notification_order,change_type)
  values(new.recipient_id,new.id,new.notification_order,tg_op);
  return new;
end $$;
revoke all on function public.signal_notification_change_sprint45() from public,anon,authenticated;
create trigger signal_notification_change_sprint45 after insert or update on public.notifications
  for each row execute function public.signal_notification_change_sprint45();

do $$ begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notification_realtime_signals') then
    alter publication supabase_realtime add table public.notification_realtime_signals;
  end if;
end $$;

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  contributions boolean not null default true,
  comments boolean not null default true,
  favorites boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;
revoke all on table public.notification_preferences from public, anon, authenticated;
grant select on table public.notification_preferences to authenticated;
create policy notification_preferences_select_own on public.notification_preferences
  for select to authenticated using (user_id=auth.uid());

create function public.get_my_notification_preferences()
returns table(contributions boolean,comments boolean,favorites boolean,updated_at timestamptz)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user_id uuid:=auth.uid();
begin
 if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 insert into public.notification_preferences(user_id) values(v_user_id) on conflict(user_id) do nothing;
 return query select p.contributions,p.comments,p.favorites,p.updated_at from public.notification_preferences p where p.user_id=v_user_id;
end $$;
create function public.update_my_notification_preferences(p_contributions boolean,p_comments boolean,p_favorites boolean) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user_id uuid:=auth.uid();
begin
 if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_contributions is null or p_comments is null or p_favorites is null then raise exception 'Invalid preferences' using errcode='22023'; end if;
 insert into public.notification_preferences(user_id,contributions,comments,favorites) values(v_user_id,p_contributions,p_comments,p_favorites)
 on conflict(user_id) do update set contributions=excluded.contributions,comments=excluded.comments,favorites=excluded.favorites,updated_at=now();
 return true;
end $$;
create function public.delete_my_old_read_notifications() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user_id uuid:=auth.uid();v_count integer;
begin
 if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 delete from public.notifications n where n.recipient_id=v_user_id and n.read_at is not null and n.created_at<now()-interval '30 days';
 get diagnostics v_count=row_count;return v_count;
end $$;
revoke all on function public.get_my_notification_preferences(),public.update_my_notification_preferences(boolean,boolean,boolean),public.delete_my_old_read_notifications() from public,anon;
grant execute on function public.get_my_notification_preferences(),public.update_my_notification_preferences(boolean,boolean,boolean),public.delete_my_old_read_notifications() to authenticated;
commit;
