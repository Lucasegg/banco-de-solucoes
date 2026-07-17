-- Sprint 22: security helpers, immutable audit trail and abuse boundaries.
create or replace function public.has_role(p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles where id = auth.uid() and role = any(p_roles)
  );
$$;
create or replace function public.has_role(p_role text)
returns boolean language sql stable security definer set search_path = public as $$ select public.has_role(array[p_role]); $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select public.has_role('admin'); $$;
create or replace function public.can_review_contributions() returns boolean language sql stable security definer set search_path = public as $$ select public.has_role(array['curator','admin']); $$;
create or replace function public.can_moderate_comments() returns boolean language sql stable security definer set search_path = public as $$ select public.has_role(array['moderator','admin']); $$;

revoke all on function public.has_role(text[]) from public;
revoke all on function public.has_role(text) from public;
revoke all on function public.is_admin() from public;
revoke all on function public.can_review_contributions() from public;
revoke all on function public.can_moderate_comments() from public;
grant execute on function public.has_role(text[]), public.has_role(text), public.is_admin(), public.can_review_contributions(), public.can_moderate_comments() to authenticated;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'auth.login_succeeded','auth.logout','auth.mfa_enabled','auth.mfa_disabled',
    'problem.created','problem.updated','problem.deleted','solution.created','solution.updated','solution.deleted',
    'contribution.approved','contribution.rejected','moderation.action','user.role_changed','security.unauthorized_attempt'
  )),
  target_type text check (target_type is null or (length(trim(target_type)) between 1 and 50)),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audit_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint audit_metadata_size check (pg_column_size(metadata) <= 4096),
  constraint audit_metadata_sensitive check (not (metadata ?| array['password','token','secret','session','credential','api_key','mfa_secret']))
);
create index audit_events_created_idx on public.audit_events(created_at desc);
create index audit_events_type_idx on public.audit_events(event_type, created_at desc);
create index audit_events_actor_idx on public.audit_events(actor_id, created_at desc);
create index audit_events_target_idx on public.audit_events(target_type, target_id, created_at desc);
alter table public.audit_events enable row level security;
create policy "Admins read audit events" on public.audit_events for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.audit_events from anon, authenticated;

create or replace function public.write_audit_event(p_event_type text, p_target_type text default null, p_target_id uuid default null, p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' or pg_column_size(coalesce(p_metadata, '{}'::jsonb)) > 4096
     or coalesce(p_metadata, '{}'::jsonb) ?| array['password','token','secret','session','credential','api_key','mfa_secret'] then
    raise exception 'Invalid audit metadata' using errcode='22023';
  end if;
  insert into public.audit_events(actor_id,event_type,target_type,target_id,metadata)
  values(auth.uid(),p_event_type,nullif(trim(p_target_type),''),p_target_id,coalesce(p_metadata,'{}')) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.write_audit_event(text,text,uuid,jsonb) from public;
-- Deliberately not granted to clients: critical RPCs/triggers invoke it transactionally.

create or replace function public.audit_domain_change() returns trigger language plpgsql security definer set search_path=public as $$
declare v_type text; v_id uuid;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  v_type := tg_table_name || '.' || lower(tg_op);
  v_id := case when tg_op='DELETE' then old.id else new.id end;
  perform public.write_audit_event(v_type, rtrim(tg_table_name, 's'), v_id, '{}'::jsonb);
  return coalesce(new, old);
end; $$;
create trigger audit_problems_change after insert or update or delete on public.problems for each row execute function public.audit_domain_change();
create trigger audit_solutions_change after insert or update or delete on public.solutions for each row execute function public.audit_domain_change();

create or replace function public.update_user_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path=public as $$
declare old_role text; admin_count integer;
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_role not in ('member','curator','moderator','admin') then raise exception 'Invalid role' using errcode='22023'; end if;
  select role into old_role from public.profiles where id=p_user_id for update;
  if not found then raise exception 'User not found' using errcode='P0002'; end if;
  if old_role='admin' and p_role<>'admin' then
    select count(*) into admin_count from public.profiles where role='admin';
    if admin_count <= 1 then raise exception 'The last administrator cannot be removed' using errcode='23514'; end if;
  end if;
  if old_role = p_role then return; end if;
  perform set_config('app.role_change_authorized', 'true', true);
  update public.profiles set role=p_role where id=p_user_id;
  perform public.write_audit_event('user.role_changed','user',p_user_id,jsonb_build_object('previous_role',old_role,'new_role',p_role));
end; $$;
create or replace function public.prevent_profile_immutable_self_change() returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
 if auth.uid()=old.id and (new.id is distinct from old.id or new.created_at is distinct from old.created_at or (new.role is distinct from old.role and current_setting('app.role_change_authorized',true) is distinct from 'true')) then
  raise exception 'Users cannot change administrative profile fields' using errcode='42501';
 end if;
 return new;
end $$;

create or replace function public.reject_audit_mutation() returns trigger language plpgsql as $$ begin raise exception 'Audit events are immutable' using errcode='42501'; end $$;
create trigger audit_events_no_update_delete before update or delete on public.audit_events for each row execute function public.reject_audit_mutation();

revoke all on function public.update_user_role(uuid,text) from public;
grant execute on function public.update_user_role(uuid,text) to authenticated;

create or replace function public.get_admin_users()
returns table(id uuid, display_name text, username text, role text) language sql stable security definer set search_path=public as $$
 select p.id,p.display_name,p.username,p.role from public.profiles p where public.is_admin() order by coalesce(p.display_name,p.username),p.id;
$$;
revoke all on function public.get_admin_users() from public; grant execute on function public.get_admin_users() to authenticated;

create or replace function public.get_audit_events(p_event_type text default null,p_target_type text default null,p_actor_id uuid default null,p_from timestamptz default null,p_to timestamptz default null,p_search text default null,p_ascending boolean default false,p_limit integer default 50,p_offset integer default 0)
returns table(id uuid,actor_id uuid,actor_name text,event_type text,target_type text,target_id uuid,metadata jsonb,created_at timestamptz) language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Not authorized' using errcode='42501'; end if;
 return query select a.id,a.actor_id,coalesce(nullif(trim(p.display_name),''),nullif(trim(p.username),''),'Sistema'),a.event_type,a.target_type,a.target_id,a.metadata,a.created_at
 from public.audit_events a left join public.profiles p on p.id=a.actor_id
 where (p_event_type is null or a.event_type=p_event_type) and (p_target_type is null or a.target_type=p_target_type)
 and (p_actor_id is null or a.actor_id=p_actor_id) and (p_from is null or a.created_at>=p_from) and (p_to is null or a.created_at<=p_to)
 and (nullif(trim(p_search),'') is null or concat_ws(' ',a.event_type,a.target_type,p.display_name,p.username,a.metadata::text) ilike '%'||trim(p_search)||'%')
 order by case when p_ascending then a.created_at end asc, case when not p_ascending then a.created_at end desc
 limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
end $$;
revoke all on function public.get_audit_events(text,text,uuid,timestamptz,timestamptz,text,boolean,integer,integer) from public;
grant execute on function public.get_audit_events(text,text,uuid,timestamptz,timestamptz,text,boolean,integer,integer) to authenticated;

-- Database-enforced abuse boundaries (existing data is validated separately before deployment).
alter table public.comments add constraint comments_content_sprint22_check check (length(trim(content)) between 1 and 2000) not valid;
alter table public.contributions add constraint contributions_payload_size_sprint22_check check (pg_column_size(payload)<=16384 and jsonb_array_length(payload->'changes') between 1 and 20) not valid;
create or replace function public.validate_contribution_payload_sprint22() returns trigger language plpgsql set search_path=public as $$
declare fields text[];
begin
 if (select count(*) from public.contributions where user_id=auth.uid() and status in ('pending','reviewing')) >= 20 then raise exception 'Pending contribution limit reached' using errcode='54000'; end if;
 if exists(select 1 from jsonb_array_elements(new.payload->'changes') c where jsonb_typeof(c)<>'object' or nullif(trim(c->>'field'),'') is null or not(c ? 'proposedValue')) then raise exception 'Invalid contribution change' using errcode='22023'; end if;
 select array_agg(c->>'field') into fields from jsonb_array_elements(new.payload->'changes') c;
 if cardinality(fields) <> cardinality(array(select distinct unnest(fields))) then raise exception 'Duplicate contribution fields' using errcode='22023'; end if;
 if jsonb_array_length(coalesce(new.payload->'references','[]'))>10 or jsonb_array_length(coalesce(new.payload->'images','[]'))>5 then raise exception 'Contribution array limit exceeded' using errcode='22023'; end if;
 return new;
end $$;
create trigger validate_contribution_payload_sprint22 before insert on public.contributions for each row execute function public.validate_contribution_payload_sprint22();

create or replace function public.moderate_comment_visibility(p_comment_id uuid,p_visibility text) returns uuid language plpgsql security definer set search_path=public as $$
begin
 if not public.can_moderate_comments() then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_visibility not in ('visible','hidden','removed') then raise exception 'Invalid visibility' using errcode='22023'; end if;
 update public.comments set visibility=p_visibility,deleted=p_visibility='removed' where id=p_comment_id;
 if not found then raise exception 'Comment not found' using errcode='P0002'; end if;
 perform public.write_audit_event('moderation.action','comment',p_comment_id,jsonb_build_object('visibility',p_visibility));
 return p_comment_id;
end $$;

create or replace function public.audit_contribution_review_sprint22() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('approved','rejected') and old.status is distinct from new.status then
  perform public.write_audit_event('contribution.'||new.status,'contribution',new.id,jsonb_build_object('target_type',case when new.problem_id is null then 'solution' else 'problem' end));
 end if;
 return new;
end $$;
create trigger audit_contribution_review_sprint22 after update on public.contributions for each row execute function public.audit_contribution_review_sprint22();
