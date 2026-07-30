-- Sprint 44: private, idempotent notifications for reports and content moderation.
begin;

alter table public.notifications
  add column notification_order bigint generated always as identity,
  add column report_id uuid,
  add column event_key text;

alter table public.notifications
  add constraint notifications_notification_order_key unique (notification_order),
  add constraint notifications_event_key_key unique (event_key),
  add constraint notifications_event_key_format check (
    event_key is null or (char_length(event_key) between 1 and 200 and event_key = btrim(event_key))
  );

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'contribution.received','contribution.approved','contribution.rejected','contribution.changes_requested',
  'comment.created','comment.replied','comment.reacted','favorite.content_updated','user.role_changed',
  'report.reviewing','report.resolved','report.dismissed','content.archived','content.restored'
));

create index notifications_recipient_order_idx
  on public.notifications(recipient_id, notification_order desc);
alter table public.notifications force row level security;
revoke all on table public.notifications from public, anon;
revoke insert, update, delete on table public.notifications from authenticated;
grant select on table public.notifications to authenticated;

-- Internal only. event_key makes retries and concurrent trigger execution harmless.
create function public.create_event_notification(
  p_recipient_id uuid, p_type text, p_target_type text, p_target_id uuid,
  p_report_id uuid, p_event_key text, p_title text, p_message text, p_action_url text
) returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  if p_recipient_id is null or p_event_key is null then return null; end if;
  insert into public.notifications(
    recipient_id,type,title,message,target_type,target_id,report_id,event_key,action_url,metadata
  ) values (
    p_recipient_id,p_type,p_title,p_message,p_target_type,p_target_id,p_report_id,p_event_key,p_action_url,'{}'::jsonb
  ) on conflict (event_key) do nothing returning id into v_id;
  if v_id is null then select n.id into v_id from public.notifications n where n.event_key=p_event_key; end if;
  return v_id;
end $$;
revoke all on function public.create_event_notification(uuid,text,text,uuid,uuid,text,text,text,text) from public,anon,authenticated;

create function public.notify_report_status_sprint44() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if old.status is distinct from new.status and new.status in ('reviewing','resolved','dismissed') then
    perform public.create_event_notification(
      new.reporter_id,'report.'||new.status,new.target_type,new.target_id,new.id,
      'report:'||new.id||':status:'||new.status,
      case new.status when 'reviewing' then 'Denúncia em análise' when 'resolved' then 'Denúncia resolvida' else 'Denúncia descartada' end,
      case new.status when 'reviewing' then 'Sua denúncia está sendo analisada.' when 'resolved' then 'A análise da sua denúncia foi concluída.' else 'Sua denúncia foi analisada e descartada.' end,
      '/'||new.target_type||'s/'||new.target_id
    );
  end if;
  return new;
end $$;
create trigger notify_report_status_sprint44 after update of status on public.content_reports
for each row execute function public.notify_report_status_sprint44();
revoke all on function public.notify_report_status_sprint44() from public,anon,authenticated;

create function public.notify_content_moderation_sprint44() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_recipient uuid;
begin
  if new.target_type='problem' then select p.author_id into v_recipient from public.problems p where p.id=new.target_id;
  else select s.author_id into v_recipient from public.solutions s where s.id=new.target_id; end if;
  perform public.create_event_notification(
    v_recipient,case new.action when 'archive' then 'content.archived' else 'content.restored' end,
    new.target_type,new.target_id,new.report_id,'moderation-action:'||new.id,
    case new.action when 'archive' then 'Conteúdo arquivado' else 'Conteúdo restaurado' end,
    case new.action when 'archive' then 'Seu conteúdo foi arquivado pela moderação.' else 'Seu conteúdo foi restaurado.' end,
    '/'||new.target_type||'s/'||new.target_id
  );
  return new;
end $$;
create trigger notify_content_moderation_sprint44 after insert on public.content_moderation_actions
for each row execute function public.notify_content_moderation_sprint44();
revoke all on function public.notify_content_moderation_sprint44() from public,anon,authenticated;

create function public.get_my_notifications(p_limit integer default 20,p_offset integer default 0,p_unread_only boolean default false)
returns table(id uuid,actor_id uuid,actor_name text,notification_type text,target_type text,target_id uuid,report_id uuid,read_at timestamptz,created_at timestamptz,notification_order bigint,title text,message text,action_url text)
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset < 0 or p_offset > 10000 then raise exception 'Invalid pagination' using errcode='22023'; end if;
  return query select n.id,n.actor_id,
    case when n.type like 'report.%' or n.type like 'content.%' then null
         else coalesce(nullif(btrim(p.display_name),''),nullif(btrim(p.username),''),'Sistema') end,
    n.type,n.target_type,n.target_id,n.report_id,n.read_at,n.created_at,n.notification_order,n.title,n.message,n.action_url
  from public.notifications n left join public.profiles p on p.id=n.actor_id
  where n.recipient_id=auth.uid() and (not coalesce(p_unread_only,false) or n.read_at is null)
  order by n.notification_order desc limit p_limit + 1 offset p_offset;
end $$;

create function public.get_my_unread_notification_count() returns bigint
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return (select count(*) from public.notifications n where n.recipient_id=auth.uid() and n.read_at is null);
end $$;

create function public.mark_my_notification_read(p_notification_id uuid) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update public.notifications n set read_at=coalesce(n.read_at,now()) where n.id=p_notification_id and n.recipient_id=auth.uid();
 return found;
end $$;

create function public.mark_all_my_notifications_read() returns integer
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update public.notifications n set read_at=now() where n.recipient_id=auth.uid() and n.read_at is null;
 get diagnostics v_count=row_count; return v_count;
end $$;

revoke all on function public.get_my_notifications(integer,integer,boolean),public.get_my_unread_notification_count(),public.mark_my_notification_read(uuid),public.mark_all_my_notifications_read() from public,anon;
grant execute on function public.get_my_notifications(integer,integer,boolean),public.get_my_unread_notification_count(),public.mark_my_notification_read(uuid),public.mark_all_my_notifications_read() to authenticated;

commit;
