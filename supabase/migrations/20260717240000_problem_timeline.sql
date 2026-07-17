-- Sprint 24: linha do tempo publica e atualizacoes oficiais.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member','curator','moderator','verified_organization','admin'));

alter table public.problems drop constraint if exists problems_status_check;
update public.problems set status = case status when 'Aberto' then 'Reportado' when 'Em andamento' then 'Em análise' else status end;
alter table public.problems add constraint problems_status_check check (status in (
  'Reportado','Em análise','Em vistoria','Planejado','Licitado','Em execução',
  'Parcialmente resolvido','Resolvido','Arquivado','Reaberto'
));
alter table public.problems alter column status set default 'Reportado';

create table public.problem_timeline (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null,
  actor_id uuid,
  event_type text not null check (event_type in (
    'problem.created','problem.updated','problem.status_changed','problem.comment',
    'problem.official_update','problem.inspection','problem.execution_started',
    'problem.execution_finished','problem.reopened','problem.closed'
  )),
  title text not null check (length(trim(title)) between 1 and 160),
  description text check (description is null or length(description) <= 5000),
  status_before text,
  status_after text,
  official boolean not null default false,
  organization_name text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc',now())
);
create index problem_timeline_problem_created_idx on public.problem_timeline(problem_id,created_at,id);
alter table public.problem_timeline enable row level security;
create policy "Public reads problem timeline" on public.problem_timeline for select to anon,authenticated using (true);
revoke insert,update,delete on public.problem_timeline from anon,authenticated;
grant select on public.problem_timeline to anon,authenticated;

create or replace function public.record_problem_timeline_sprint24() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into public.problem_timeline(problem_id,actor_id,event_type,title,status_after)
    values(new.id,auth.uid(),'problem.created','Problema criado',new.status);
  elsif old.status is distinct from new.status then
    insert into public.problem_timeline(problem_id,actor_id,event_type,title,status_before,status_after)
    values(new.id,auth.uid(),'problem.status_changed',new.status,old.status,new.status);
  end if;
  return new;
end $$;
create trigger record_problem_timeline_sprint24 after insert or update of status on public.problems
for each row execute function public.record_problem_timeline_sprint24();

-- Backfill keeps the public history useful without manufacturing foreign keys or actors.
insert into public.problem_timeline(problem_id,event_type,title,status_after,created_at,metadata)
select p.id,'problem.created','Problema criado',p.status,p.created_at,jsonb_build_object('backfilled',true)
from public.problems p where not exists(select 1 from public.problem_timeline t where t.problem_id=p.id);

create or replace function public.get_problem_timeline(p_problem_id uuid)
returns table(id uuid,event_type text,title text,description text,official boolean,organization_name text,status_before text,status_after text,actor_name text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select t.id,t.event_type,t.title,t.description,t.official,t.organization_name,t.status_before,t.status_after,
    coalesce(nullif(trim(p.display_name),''),nullif(trim(p.username),''),case when t.actor_id is null then 'Sistema' else 'Usuário da plataforma' end),t.created_at
  from public.problem_timeline t left join public.profiles p on p.id=t.actor_id
  where t.problem_id=p_problem_id and exists(select 1 from public.problems x where x.id=p_problem_id)
  order by t.created_at asc,t.id asc;
$$;
revoke all on function public.get_problem_timeline(uuid) from public;
grant execute on function public.get_problem_timeline(uuid) to anon,authenticated;

create or replace function public.notify_favorite_update_sprint23() returns trigger language plpgsql security definer set search_path=public as $$
declare f record; v_relevant boolean; v_kind text:=rtrim(tg_table_name,'s');
begin
if current_setting('app.official_update',true)='true' then return new; end if;
v_relevant:=new.title is distinct from old.title or new.summary is distinct from old.summary or new.description is distinct from old.description or new.status is distinct from old.status or new.tags is distinct from old.tags;
if not v_relevant then return new; end if;
for f in execute format('select user_id from public.favorites where %I=$1',v_kind||'_id') using new.id loop
 perform public.create_notification(f.user_id,'favorite.content_updated','Conteúdo favorito atualizado','Um conteúdo que você favoritou recebeu uma atualização.',v_kind,new.id,'/'||v_kind||'s/'||new.id,'{}',auth.uid());
end loop; return new;
end $$;

create or replace function public.publish_problem_update(p_problem_id uuid,p_title text,p_description text,p_status text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid:=auth.uid();
  v_role text;
  v_organization text;
  v_actor_name text;
  v_old_status text;
  v_event_id uuid;
  v_favorite record;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select p.role,nullif(trim(p.organization),''),coalesce(nullif(trim(p.display_name),''),nullif(trim(p.username),''),'Usuário da plataforma')
  into v_role,v_organization,v_actor_name from public.profiles p where p.id=v_actor;
  if v_role is null or v_role not in ('verified_organization','moderator','admin') then
    raise exception 'Not authorized to publish official updates' using errcode='42501';
  end if;
  if v_role='verified_organization' and v_organization is null then
    raise exception 'Verified organization profile requires an organization' using errcode='23514';
  end if;
  if length(trim(coalesce(p_title,''))) not between 1 and 160 or length(coalesce(p_description,''))>5000 then
    raise exception 'Invalid official update' using errcode='22023';
  end if;
  if p_status is not null and p_status not in ('Reportado','Em análise','Em vistoria','Planejado','Licitado','Em execução','Parcialmente resolvido','Resolvido','Arquivado','Reaberto') then
    raise exception 'Invalid problem status' using errcode='22023';
  end if;
  select status into v_old_status from public.problems where id=p_problem_id for update;
  if not found then raise exception 'Problem not found' using errcode='P0002'; end if;
  insert into public.problem_timeline(problem_id,actor_id,event_type,title,description,official,organization_name,metadata)
  values(p_problem_id,v_actor,'problem.official_update',trim(p_title),nullif(trim(p_description),''),true,v_organization,'{}') returning id into v_event_id;
  if p_status is not null and p_status is distinct from v_old_status then
    perform set_config('app.official_update','true',true);
    update public.problems set status=p_status where id=p_problem_id;
  end if;
  perform public.write_audit_event('problem.updated','problem',p_problem_id,jsonb_strip_nulls(jsonb_build_object(
    'official_update_id',v_event_id,'organization',v_organization,'actor_name',v_actor_name
  )));
  for v_favorite in select user_id from public.favorites where problem_id=p_problem_id and user_id<>v_actor loop
    perform public.create_notification(v_favorite.user_id,'favorite.content_updated','Atualização no problema','O problema recebeu atualização.','problem',p_problem_id,'/problems/'||p_problem_id,jsonb_build_object('official',true),v_actor);
  end loop;
  return v_event_id;
end $$;
revoke all on function public.publish_problem_update(uuid,text,text,text) from public,anon;
grant execute on function public.publish_problem_update(uuid,text,text,text) to authenticated;

-- Allow administrators to assign the new role through the existing protected RPC.
create or replace function public.update_user_role(p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path=public as $$
declare old_role text; admin_count integer; friendly text;
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_role not in ('member','curator','moderator','verified_organization','admin') then raise exception 'Invalid role' using errcode='22023'; end if;
  select role into old_role from public.profiles where id=p_user_id for update;
  if not found then raise exception 'User not found' using errcode='P0002'; end if;
  if old_role='admin' and p_role<>'admin' then select count(*) into admin_count from public.profiles where role='admin'; if admin_count<=1 then raise exception 'The last administrator cannot be removed' using errcode='23514'; end if; end if;
  if old_role=p_role then return; end if;
  perform set_config('app.role_change_authorized','true',true);
  update public.profiles set role=p_role where id=p_user_id;
  perform public.write_audit_event('user.role_changed','user',p_user_id,jsonb_build_object('previous_role',old_role,'new_role',p_role));
  friendly:=case p_role when 'member' then 'Membro' when 'curator' then 'Curador' when 'moderator' then 'Moderador' when 'verified_organization' then 'Organização verificada' else 'Administrador' end;
  perform public.create_notification(p_user_id,'user.role_changed','Seu papel foi atualizado','Seu novo papel é '||friendly||'.','user',p_user_id,'/profile',jsonb_build_object('role',p_role),auth.uid());
end $$;
