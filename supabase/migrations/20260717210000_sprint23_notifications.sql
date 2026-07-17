-- Sprint 23: central interna de notificações. Retenção será definida em sprint futura.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  actor_id uuid,
  type text not null constraint notifications_type_check check (type in (
    'contribution.approved','contribution.rejected','comment.created','comment.replied',
    'comment.reacted','favorite.content_updated','user.role_changed'
  )),
  title text not null constraint notifications_title_check check (length(trim(title)) between 1 and 120),
  message text not null constraint notifications_message_check check (length(trim(message)) between 1 and 500),
  target_type text constraint notifications_target_type_check check (target_type is null or length(trim(target_type)) between 1 and 50),
  target_id uuid,
  action_url text constraint notifications_action_url_check check (
    action_url is null or (length(action_url) <= 500 and action_url like '/%' and left(action_url,2) <> '//' and action_url !~* '^(https?:|javascript:|data:)')
  ),
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint notifications_metadata_size_check check (pg_column_size(metadata) <= 4096),
  constraint notifications_metadata_sensitive_check check (not (metadata ?| array['password','token','secret','session','credential','api_key','mfa_secret']))
);
create index notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create index notifications_recipient_read_created_idx on public.notifications(recipient_id, read_at, created_at desc);
create index notifications_type_created_idx on public.notifications(type, created_at desc);
alter table public.notifications enable row level security;
create policy "Users read only own notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid());
revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;

create or replace function public.create_notification(
  p_recipient_id uuid, p_type text, p_title text, p_message text,
  p_target_type text default null, p_target_id uuid default null,
  p_action_url text default null, p_metadata jsonb default '{}'::jsonb,
  p_actor_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_recipient_id is null then return null; end if;
  -- Triggers pass auth.uid(); system events may pass NULL. Client roles cannot execute this function.
  if p_actor_id is not null and p_actor_id = p_recipient_id then return null; end if;
  if jsonb_typeof(v_metadata) <> 'object' or pg_column_size(v_metadata) > 4096
     or v_metadata ?| array['password','token','secret','session','credential','api_key','mfa_secret'] then
    raise exception 'Invalid notification metadata' using errcode='22023';
  end if;
  insert into public.notifications(recipient_id,actor_id,type,title,message,target_type,target_id,action_url,metadata)
  values(p_recipient_id,p_actor_id,p_type,trim(p_title),trim(p_message),nullif(trim(p_target_type),''),p_target_id,p_action_url,v_metadata)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_notification(uuid,text,text,text,text,uuid,text,jsonb,uuid) from public, anon, authenticated;

create or replace function public.get_notifications(p_type text default null,p_unread_only boolean default false,p_limit integer default 20,p_offset integer default 0)
returns table(id uuid,actor_id uuid,actor_name text,type text,title text,message text,target_type text,target_id uuid,action_url text,metadata jsonb,read_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_type is not null and p_type not in ('contribution.approved','contribution.rejected','comment.created','comment.replied','comment.reacted','favorite.content_updated','user.role_changed') then
    raise exception 'Invalid notification type' using errcode='22023';
  end if;
  return query select n.id,n.actor_id,coalesce(nullif(trim(p.display_name),''),nullif(trim(p.username),''),'Sistema'),n.type,n.title,n.message,n.target_type,n.target_id,n.action_url,n.metadata,n.read_at,n.created_at
  from public.notifications n left join public.profiles p on p.id=n.actor_id
  where n.recipient_id=auth.uid() and (p_type is null or n.type=p_type) and (not coalesce(p_unread_only,false) or n.read_at is null)
  order by n.created_at desc limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
end $$;
create or replace function public.get_unread_notification_count() returns bigint language plpgsql stable security definer set search_path=public as $$
begin if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
return (select count(*) from public.notifications where recipient_id=auth.uid() and read_at is null); end $$;
create or replace function public.mark_notification_read(p_notification_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
update public.notifications set read_at=coalesce(read_at,timezone('utc',now())) where id=p_notification_id and recipient_id=auth.uid(); return found; end $$;
create or replace function public.mark_all_notifications_read() returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer; begin if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
update public.notifications set read_at=timezone('utc',now()) where recipient_id=auth.uid() and read_at is null; get diagnostics v_count=row_count; return v_count; end $$;
revoke all on function public.get_notifications(text,boolean,integer,integer), public.get_unread_notification_count(), public.mark_notification_read(uuid), public.mark_all_notifications_read() from public,anon;
grant execute on function public.get_notifications(text,boolean,integer,integer), public.get_unread_notification_count(), public.mark_notification_read(uuid), public.mark_all_notifications_read() to authenticated;

create or replace function public.notify_contribution_review_sprint23() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.status in ('approved','rejected') and old.status is distinct from new.status then
 perform public.create_notification(new.user_id,'contribution.'||new.status,case new.status when 'approved' then 'Contribuição aprovada' else 'Contribuição rejeitada' end,
 case new.status when 'approved' then 'Sua contribuição foi aprovada e aplicada.' else 'Sua contribuição foi rejeitada. Consulte os detalhes da revisão.' end,
 'contribution',new.id,'/contributions/'||new.id,jsonb_build_object('status',new.status),auth.uid()); end if; return new; end $$;
create trigger notify_contribution_review_sprint23 after update on public.contributions for each row execute function public.notify_contribution_review_sprint23();

create or replace function public.notify_comment_created_sprint23() returns trigger language plpgsql security definer set search_path=public as $$
declare v_owner uuid; v_parent_owner uuid; v_kind text; v_target uuid; v_url text;
begin
 v_kind:=case when new.problem_id is not null then 'problem' else 'solution' end; v_target:=coalesce(new.problem_id,new.solution_id); v_url:='/'||v_kind||'s/'||v_target;
 if new.parent_id is not null then select user_id into v_parent_owner from public.comments where id=new.parent_id;
   perform public.create_notification(v_parent_owner,'comment.replied','Nova resposta ao seu comentário','Seu comentário recebeu uma nova resposta.',v_kind,v_target,v_url,jsonb_build_object('comment_id',new.id),new.user_id);
 end if;
 if new.problem_id is not null then select author_id into v_owner from public.problems where id=new.problem_id; else select author_id into v_owner from public.solutions where id=new.solution_id; end if;
 if new.parent_id is null or v_owner is distinct from v_parent_owner then
   perform public.create_notification(v_owner,'comment.created','Novo comentário','Seu conteúdo recebeu um novo comentário.',v_kind,v_target,v_url,jsonb_build_object('comment_id',new.id),new.user_id);
 end if; return new;
end $$;
create trigger notify_comment_created_sprint23 after insert on public.comments for each row execute function public.notify_comment_created_sprint23();

create or replace function public.notify_favorite_update_sprint23() returns trigger language plpgsql security definer set search_path=public as $$
declare f record; v_relevant boolean; v_kind text:=rtrim(tg_table_name,'s');
begin
 v_relevant:=new.title is distinct from old.title or new.summary is distinct from old.summary or new.description is distinct from old.description or new.status is distinct from old.status
   or new.tags is distinct from old.tags;
 if not v_relevant then return new; end if;
 for f in execute format('select user_id from public.favorites where %I=$1',v_kind||'_id') using new.id loop
  perform public.create_notification(f.user_id,'favorite.content_updated','Conteúdo favorito atualizado','Um conteúdo que você favoritou recebeu uma atualização.',v_kind,new.id,'/'||v_kind||'s/'||new.id,'{}',auth.uid());
 end loop; return new;
end $$;
create trigger notify_problem_favorites_sprint23 after update on public.problems for each row execute function public.notify_favorite_update_sprint23();
create trigger notify_solution_favorites_sprint23 after update on public.solutions for each row execute function public.notify_favorite_update_sprint23();

-- Mantém auditoria e notificação na mesma transação da alteração de papel.
create or replace function public.update_user_role(p_user_id uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$
declare old_role text; admin_count integer; friendly text;
begin
 if not public.is_admin() then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_role not in ('member','curator','moderator','admin') then raise exception 'Invalid role' using errcode='22023'; end if;
 select role into old_role from public.profiles where id=p_user_id for update; if not found then raise exception 'User not found' using errcode='P0002'; end if;
 if old_role='admin' and p_role<>'admin' then select count(*) into admin_count from public.profiles where role='admin'; if admin_count<=1 then raise exception 'The last administrator cannot be removed' using errcode='23514'; end if; end if;
 if old_role=p_role then return; end if;
 perform set_config('app.role_change_authorized','true',true); update public.profiles set role=p_role where id=p_user_id;
 perform public.write_audit_event('user.role_changed','user',p_user_id,jsonb_build_object('previous_role',old_role,'new_role',p_role));
 friendly:=case p_role when 'member' then 'Membro' when 'curator' then 'Curador' when 'moderator' then 'Moderador' else 'Administrador' end;
 perform public.create_notification(p_user_id,'user.role_changed','Seu papel foi atualizado','Seu novo papel é '||friendly||'.','user',p_user_id,'/profile',jsonb_build_object('role',p_role),auth.uid());
end $$;
revoke all on function public.update_user_role(uuid,text) from public; grant execute on function public.update_user_role(uuid,text) to authenticated;

-- O modelo atual possui reações apenas em problemas/soluções; reações em comentários não são
-- ampliadas silenciosamente nesta migration para não quebrar o contrato existente.
