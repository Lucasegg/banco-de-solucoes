-- Sprint 43: explicit administrative content moderation with immutable audit history.
begin;

create table public.content_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('problem','solution')),
  target_id uuid not null,
  report_id uuid,
  moderator_id uuid not null,
  action text not null check (action in ('archive','restore')),
  reason text not null check (char_length(reason) between 1 and 500 and reason = btrim(reason)),
  moderator_note text check (moderator_note is null or char_length(moderator_note) between 1 and 2000),
  previous_status text not null,
  resulting_status text not null,
  created_at timestamptz not null default now()
);
comment on table public.content_moderation_actions is 'Append-only administrative audit. Polymorphic target and optional report deliberately have no FK so history survives removal.';
create index content_moderation_actions_target_idx on public.content_moderation_actions(target_type,target_id,created_at,id);
create index content_moderation_actions_report_idx on public.content_moderation_actions(report_id) where report_id is not null;
create index content_moderation_actions_created_idx on public.content_moderation_actions(created_at,id);
alter table public.content_moderation_actions enable row level security;
alter table public.content_moderation_actions force row level security;
revoke all on table public.content_moderation_actions from public,anon,authenticated;

create function public.prevent_content_moderation_action_mutation() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin raise exception 'Moderation history is immutable' using errcode='55000'; end $$;
create trigger content_moderation_actions_immutable before update or delete on public.content_moderation_actions
for each row execute function public.prevent_content_moderation_action_mutation();
revoke all on function public.prevent_content_moderation_action_mutation() from public,anon,authenticated;

create function public.moderate_reported_content(p_target_type text,p_target_id uuid,p_action text,p_reason text,p_moderator_note text default null,p_report_id uuid default null)
returns table(id uuid,target_type text,target_id uuid,action text,previous_status text,resulting_status text,created_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_actor uuid:=auth.uid();v_current text;v_result text;v_reason text:=btrim(coalesce(p_reason,''));v_note text:=nullif(btrim(p_moderator_note),'');v_id uuid;
begin
 if v_actor is null or not public.is_admin() then raise exception 'Not authorized' using errcode='42501';end if;
 if p_target_type not in ('problem','solution') then raise exception 'Invalid content target' using errcode='22023';end if;
 if p_action not in ('archive','restore') then raise exception 'Invalid moderation action' using errcode='22023';end if;
 if char_length(v_reason) not between 1 and 500 then raise exception 'Invalid moderation reason' using errcode='22023';end if;
 if char_length(coalesce(v_note,''))>2000 then raise exception 'Invalid moderator note' using errcode='22023';end if;
 if p_report_id is not null and not exists(select 1 from public.content_reports r where r.id=p_report_id and r.target_type=p_target_type and r.target_id=p_target_id) then raise exception 'Report does not match content' using errcode='23514';end if;
 if p_target_type='problem' then select p.status into v_current from public.problems p where p.id=p_target_id for update;
 else select s.status into v_current from public.solutions s where s.id=p_target_id for update;end if;
 if not found then raise exception 'Content not found' using errcode='P0002';end if;
 if p_action='archive' then
   if v_current in ('Arquivado','Arquivada') then raise exception 'Content is already archived' using errcode='23514';end if;
   v_result:=case when p_target_type='problem' then 'Arquivado' else 'Arquivada' end;
 else
   if v_current<>case when p_target_type='problem' then 'Arquivado' else 'Arquivada' end then raise exception 'Content is not archived' using errcode='23514';end if;
   select a.previous_status into v_result from public.content_moderation_actions a where a.target_type=p_target_type and a.target_id=p_target_id and a.action='archive' order by a.created_at desc,a.id desc limit 1;
   if v_result is null or v_result in ('Arquivado','Arquivada') or (p_target_type='problem' and v_result not in ('Reportado','Em análise','Em vistoria','Planejado','Licitado','Em execução','Parcialmente resolvido','Resolvido','Reaberto')) or (p_target_type='solution' and v_result not in ('Proposta','Em teste','Implementada','Validada')) then raise exception 'No valid previous status' using errcode='23514';end if;
 end if;
 if p_target_type='problem' then update public.problems p set status=v_result where p.id=p_target_id;else update public.solutions s set status=v_result where s.id=p_target_id;end if;
 insert into public.content_moderation_actions(target_type,target_id,report_id,moderator_id,action,reason,moderator_note,previous_status,resulting_status) values(p_target_type,p_target_id,p_report_id,v_actor,p_action,v_reason,v_note,v_current,v_result) returning content_moderation_actions.id into v_id;
 return query select a.id,a.target_type,a.target_id,a.action,a.previous_status,a.resulting_status,a.created_at from public.content_moderation_actions a where a.id=v_id;
end $$;

create function public.get_content_moderation_history(p_target_type text,p_target_id uuid)
returns table(id uuid,action text,reason text,moderator_note text,previous_status text,resulting_status text,created_at timestamptz)
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Not authorized' using errcode='42501';end if;
 if p_target_type not in ('problem','solution') then raise exception 'Invalid content target' using errcode='22023';end if;
 return query select a.id,a.action,a.reason,a.moderator_note,a.previous_status,a.resulting_status,a.created_at from public.content_moderation_actions a where a.target_type=p_target_type and a.target_id=p_target_id order by a.created_at asc,a.id asc;
end $$;
revoke all on function public.moderate_reported_content(text,uuid,text,text,text,uuid),public.get_content_moderation_history(text,uuid) from public,anon;
grant execute on function public.moderate_reported_content(text,uuid,text,text,text,uuid),public.get_content_moderation_history(text,uuid) to authenticated;
commit;
