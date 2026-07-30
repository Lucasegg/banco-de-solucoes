-- Sprint 42: secure reports for problems and solutions.
begin;

do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'Sprint 42 requires public.is_admin() from the administrative authorization baseline'
      using errcode = '55000';
  end if;
end
$$;

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  target_type text not null check (target_type in ('problem', 'solution')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'misleading', 'offensive', 'personal_information', 'illegal', 'duplicate', 'other')),
  description text check (description is null or char_length(description) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  moderator_id uuid,
  moderator_note text check (moderator_note is null or char_length(moderator_note) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint content_reports_review_fields check (
    (status in ('open', 'reviewing') and reviewed_at is null)
    or (status in ('resolved', 'dismissed') and moderator_id is not null and reviewed_at is not null)
  )
);

comment on table public.content_reports is 'Immutable-history reports for problem and solution content. Polymorphic targets intentionally have no FK so reports survive target removal.';
create index content_reports_queue_idx on public.content_reports(status, created_at, id);
create index content_reports_target_idx on public.content_reports(target_type, target_id);
create index content_reports_reporter_idx on public.content_reports(reporter_id, created_at desc);
create index content_reports_reason_idx on public.content_reports(reason);
create unique index content_reports_one_active_per_reporter_target_idx
  on public.content_reports(reporter_id, target_type, target_id) where status in ('open', 'reviewing');

alter table public.content_reports enable row level security;
alter table public.content_reports force row level security;
revoke all on table public.content_reports from public, anon, authenticated;

create function public.report_content(p_target_type text, p_target_id uuid, p_reason text, p_description text default null)
returns table (id uuid, target_type text, target_id uuid, reason text, status text, created_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_actor uuid := auth.uid(); v_owner uuid; v_description text := nullif(btrim(p_description), ''); v_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_target_type not in ('problem','solution') then raise exception 'Invalid report target' using errcode = '22023'; end if;
  if p_reason not in ('spam','misleading','offensive','personal_information','illegal','duplicate','other') then raise exception 'Invalid report reason' using errcode = '22023'; end if;
  if char_length(coalesce(v_description,'')) > 1000 or (p_reason = 'other' and v_description is null) then raise exception 'Invalid report description' using errcode = '22023'; end if;
  if p_target_type = 'problem' then
    select p.author_id into v_owner
    from public.problems p
    where p.id = p_target_id and p.status <> 'Arquivado';
  else
    select s.author_id into v_owner
    from public.solutions s
    where s.id = p_target_id and s.status <> 'Arquivada';
  end if;
  if not found then raise exception 'Content is not available' using errcode = 'P0002'; end if;
  if v_owner = v_actor then raise exception 'Own content cannot be reported' using errcode = '42501'; end if;
  select r.id into v_id from public.content_reports r where r.reporter_id=v_actor and r.target_type=p_target_type and r.target_id=p_target_id and r.status in ('open','reviewing') order by r.created_at, r.id limit 1;
  if v_id is null then
    insert into public.content_reports(reporter_id,target_type,target_id,reason,description)
    values(v_actor,p_target_type,p_target_id,p_reason,v_description)
    on conflict do nothing returning content_reports.id into v_id;
    if v_id is null then select r.id into v_id from public.content_reports r where r.reporter_id=v_actor and r.target_type=p_target_type and r.target_id=p_target_id and r.status in ('open','reviewing'); end if;
  end if;
  return query select r.id,r.target_type,r.target_id,r.reason,r.status,r.created_at from public.content_reports r where r.id=v_id;
end $$;

create function public.get_my_content_reports()
returns table (id uuid, target_type text, target_id uuid, reason text, description text, status text, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  return query select r.id,r.target_type,r.target_id,r.reason,r.description,r.status,r.created_at,r.updated_at from public.content_reports r where r.reporter_id=auth.uid() order by r.created_at desc,r.id desc;
end $$;

create function public.get_admin_content_reports(p_status text default null,p_target_type text default null,p_reason text default null,p_limit integer default 25,p_offset integer default 0)
returns table (id uuid,target_type text,target_id uuid,target_title text,reason text,description text,status text,moderator_note text,created_at timestamptz,updated_at timestamptz,reviewed_at timestamptz,total_count bigint)
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_status is not null and p_status not in ('open','reviewing','resolved','dismissed') then raise exception 'Invalid report filter' using errcode='22023'; end if;
  if p_target_type is not null and p_target_type not in ('problem','solution') then raise exception 'Invalid report filter' using errcode='22023'; end if;
  if p_reason is not null and p_reason not in ('spam','misleading','offensive','personal_information','illegal','duplicate','other') then raise exception 'Invalid report filter' using errcode='22023'; end if;
  return query select r.id,r.target_type,r.target_id,case when r.target_type='problem' then (select p.title from public.problems p where p.id=r.target_id) else (select s.title from public.solutions s where s.id=r.target_id) end,r.reason,r.description,r.status,r.moderator_note,r.created_at,r.updated_at,r.reviewed_at,count(*) over()
  from public.content_reports r where (p_status is null or r.status=p_status) and (p_target_type is null or r.target_type=p_target_type) and (p_reason is null or r.reason=p_reason)
  order by r.created_at asc,r.id asc limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
end $$;

create function public.moderate_content_report(p_report_id uuid,p_status text,p_moderator_note text default null)
returns table (id uuid,status text,updated_at timestamptz,reviewed_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_actor uuid:=auth.uid(); v_current text; v_note text:=nullif(btrim(p_moderator_note),'');
begin
  if v_actor is null or not public.is_admin() then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_status not in ('reviewing','resolved','dismissed') then raise exception 'Invalid moderation status' using errcode='22023'; end if;
  if char_length(coalesce(v_note,''))>2000 then raise exception 'Invalid moderator note' using errcode='22023'; end if;
  select r.status into v_current from public.content_reports r where r.id=p_report_id for update;
  if not found then raise exception 'Report not found' using errcode='P0002'; end if;
  if v_current in ('resolved','dismissed') or (p_status='reviewing' and v_current<>'open') then raise exception 'Report transition not allowed' using errcode='23514'; end if;
  update public.content_reports r set status=p_status,moderator_id=v_actor,moderator_note=coalesce(v_note,r.moderator_note),updated_at=now(),reviewed_at=case when p_status in ('resolved','dismissed') then now() else null end where r.id=p_report_id;
  return query select r.id,r.status,r.updated_at,r.reviewed_at from public.content_reports r where r.id=p_report_id;
end $$;

revoke all on function public.report_content(text,uuid,text,text),public.get_my_content_reports(),public.get_admin_content_reports(text,text,text,integer,integer),public.moderate_content_report(uuid,text,text) from public,anon;
grant execute on function public.report_content(text,uuid,text,text),public.get_my_content_reports(),public.get_admin_content_reports(text,text,text,integer,integer),public.moderate_content_report(uuid,text,text) to authenticated;

commit;
