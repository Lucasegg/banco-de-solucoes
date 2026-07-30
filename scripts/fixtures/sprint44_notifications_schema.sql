-- Production-compatible notification contract immediately before Sprint 44.
-- This fixture mirrors the cumulative Sprint 23, 30 and 31 state; it does not
-- replace or modify any historical migration.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists username text;
update public.profiles set display_name=case when role='admin' then 'Admin público' else 'Usuário público' end;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  actor_id uuid,
  type text not null constraint notifications_type_check check (type in (
    'contribution.received','contribution.approved','contribution.rejected','contribution.changes_requested',
    'comment.created','comment.replied','comment.reacted','favorite.content_updated','user.role_changed'
  )),
  title text not null constraint notifications_title_check check (length(trim(title)) between 1 and 120),
  message text not null constraint notifications_message_check check (length(trim(message)) between 1 and 500),
  target_type text constraint notifications_target_type_check check (target_type is null or length(trim(target_type)) between 1 and 50),
  target_id uuid,
  action_url text constraint notifications_action_url_check check (
    action_url is null or (length(action_url)<=500 and action_url like '/%' and left(action_url,2)<>'//' and action_url !~* '^(https?:|javascript:|data:)')
  ),
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc',now()),
  constraint notifications_metadata_object_check check (jsonb_typeof(metadata)='object'),
  constraint notifications_metadata_size_check check (pg_column_size(metadata)<=4096),
  constraint notifications_metadata_sensitive_check check (not (metadata ?| array['password','token','secret','session','credential','api_key','mfa_secret']))
);
create index notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);
create index notifications_recipient_read_created_idx on public.notifications(recipient_id,read_at,created_at desc);
create index notifications_type_created_idx on public.notifications(type,created_at desc);
alter table public.notifications enable row level security;
create policy "Users read only own notifications" on public.notifications for select to authenticated using(recipient_id=auth.uid());
revoke all on public.notifications from public,anon;
revoke insert,update,delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;

-- Every legacy type exists before ALTER CONSTRAINT, proving migration safety with data.
insert into public.notifications(recipient_id,type,title,message)
select '44000000-0000-0000-0000-000000000099',legacy_type,'legacy','legacy'
from unnest(array[
 'contribution.received','contribution.approved','contribution.rejected','contribution.changes_requested',
 'comment.created','comment.replied','comment.reacted','favorite.content_updated','user.role_changed'
]) legacy_type;
