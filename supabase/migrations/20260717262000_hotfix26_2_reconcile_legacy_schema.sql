-- Hotfix 26.2 — reconciliation for production databases with an incomplete legacy
-- migration history. This migration is deliberately additive: it never drops tables,
-- truncates rows, changes primary keys, or replays imports/seeds.
-- Inventory reconciled: profiles/social fields; problems/solutions/catalog provenance;
-- comments/comment_reports; favorites/reactions; contributions/contribution_audit;
-- audit_events; notifications; problem_timeline; storage image buckets and policies;
-- Sprint 20–24 triggers/RPCs and Sprint 25 map RPC grants.
create extension if not exists pgcrypto;

-- Tables absent from the confirmed snapshot. Definitions below reproduce the Sprint 20–24 contracts exactly.
create table if not exists public.reactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 problem_id uuid references public.problems(id) on delete cascade, solution_id uuid references public.solutions(id) on delete cascade,
 reaction_type text not null, created_at timestamptz not null default timezone('utc', now()),
 constraint reactions_exactly_one_target_check check ((problem_id is not null)::integer + (solution_id is not null)::integer = 1),
 constraint reactions_type_check check (reaction_type in ('useful', 'liked', 'interesting')));
create table if not exists public.contributions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 problem_id uuid references public.problems(id) on delete cascade, solution_id uuid references public.solutions(id) on delete cascade,
 contribution_type text not null, payload jsonb not null, status text not null default 'pending', moderator_id uuid references auth.users(id) on delete set null,
 rejection_reason text, created_at timestamptz not null default timezone('utc', now()), reviewed_at timestamptz,
 constraint contributions_exactly_one_target_check check ((problem_id is not null)::integer + (solution_id is not null)::integer = 1),
 constraint contributions_status_check check (status in ('pending', 'reviewing', 'approved', 'rejected')),
 constraint contributions_type_check check (contribution_type in ('correction', 'update', 'evidence', 'general')),
 constraint contributions_payload_check check (jsonb_typeof(payload) = 'object' and payload <> '{}'::jsonb and jsonb_array_length(coalesce(payload->'changes', '[]'::jsonb)) > 0),
 constraint contributions_review_fields_check check ((status in ('pending', 'reviewing') and reviewed_at is null) or (status in ('approved', 'rejected') and reviewed_at is not null and moderator_id is not null)));
create table if not exists public.contribution_audit (
 id uuid primary key default gen_random_uuid(), contribution_id uuid not null references public.contributions(id) on delete cascade,
 moderator_id uuid not null references auth.users(id) on delete restrict, action text not null check (action in ('approved', 'rejected')),
 created_at timestamptz not null default timezone('utc', now()));
create table if not exists public.audit_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid,
 event_type text not null check (event_type in ('auth.login_succeeded','auth.logout','auth.mfa_enabled','auth.mfa_disabled','problem.created','problem.updated','problem.deleted','solution.created','solution.updated','solution.deleted','contribution.approved','contribution.rejected','moderation.action','user.role_changed','security.unauthorized_attempt')),
 target_type text check (target_type is null or (length(trim(target_type)) between 1 and 50)), target_id uuid, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default timezone('utc', now()), constraint audit_metadata_object check (jsonb_typeof(metadata) = 'object'), constraint audit_metadata_size check (pg_column_size(metadata) <= 4096), constraint audit_metadata_sensitive check (not (metadata ?| array['password','token','secret','session','credential','api_key','mfa_secret'])));
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users(id) on delete cascade, actor_id uuid references auth.users(id) on delete set null,
 type text not null check (type in ('contribution.approved','contribution.rejected','comment.created','comment.replied','comment.reacted','favorite.content_updated','user.role_changed')),
 title text not null check (length(trim(title)) between 1 and 160), message text not null check (length(trim(message)) between 1 and 1000), target_type text, target_id uuid, action_url text,
 metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object' and pg_column_size(metadata)<=4096), read_at timestamptz, created_at timestamptz not null default timezone('utc',now()));
create table if not exists public.problem_timeline (
 id uuid primary key default gen_random_uuid(), problem_id uuid not null, actor_id uuid,
 event_type text not null check (event_type in ('problem.created','problem.updated','problem.status_changed','problem.comment','problem.official_update','problem.inspection','problem.execution_started','problem.execution_finished','problem.reopened','problem.closed')),
 title text not null check (length(trim(title)) between 1 and 160), description text check (description is null or length(description)<=5000), status_before text,status_after text,official boolean not null default false,organization_name text,metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),created_at timestamptz not null default timezone('utc',now()));

-- Existing tables can be partial. Additive columns use IF NOT EXISTS and nullable
-- defaults so existing rows are preserved (no ID regeneration and no seed replay).
alter table public.profiles add column if not exists website text, add column if not exists organization text, add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.problems add column if not exists source_type text, add column if not exists source_name text, add column if not exists source_url text, add column if not exists source_published_at timestamptz, add column if not exists source_accessed_at timestamptz, add column if not exists source_verified_at timestamptz, add column if not exists source_metadata jsonb not null default '{}'::jsonb, add column if not exists imported_from_external_source boolean not null default false, add column if not exists latitude double precision, add column if not exists longitude double precision, add column if not exists geolocation_precision text, add column if not exists geolocation_source text, add column if not exists geocoded_at timestamptz;
alter table public.comments add column if not exists user_id uuid, add column if not exists visibility text not null default 'visible', add column if not exists deleted boolean not null default false, add column if not exists edited boolean not null default false;
alter table public.favorites add column if not exists created_at timestamptz not null default timezone('utc',now());

-- Constraints are catalog-guarded because ADD CONSTRAINT has no IF NOT EXISTS.
do $$ begin
 if to_regclass('public.problems') is not null and not exists(select 1 from pg_constraint where conrelid='public.problems'::regclass and conname='problems_geolocation_pair_check') then alter table public.problems add constraint problems_geolocation_pair_check check ((latitude is null) = (longitude is null)) not valid; end if;
 if to_regclass('public.problems') is not null and not exists(select 1 from pg_constraint where conrelid='public.problems'::regclass and conname='problems_latitude_check') then alter table public.problems add constraint problems_latitude_check check (latitude is null or latitude between -90 and 90) not valid; end if;
 if to_regclass('public.problems') is not null and not exists(select 1 from pg_constraint where conrelid='public.problems'::regclass and conname='problems_longitude_check') then alter table public.problems add constraint problems_longitude_check check (longitude is null or longitude between -180 and 180) not valid; end if;
 if to_regclass('public.comments') is not null and not exists(select 1 from pg_constraint where conrelid='public.comments'::regclass and conname='comments_user_profile_fkey') then alter table public.comments add constraint comments_user_profile_fkey foreign key(user_id) references public.profiles(id) on delete cascade not valid; end if;
end $$;

create unique index if not exists reactions_user_problem_type_unique on public.reactions(user_id,problem_id,reaction_type) where problem_id is not null;
create unique index if not exists reactions_user_solution_type_unique on public.reactions(user_id,solution_id,reaction_type) where solution_id is not null;
create index if not exists reactions_problem_summary_idx on public.reactions(problem_id,reaction_type) where problem_id is not null;
create index if not exists reactions_solution_summary_idx on public.reactions(solution_id,reaction_type) where solution_id is not null;
create index if not exists reactions_user_id_idx on public.reactions(user_id);
create index if not exists contributions_user_created_idx on public.contributions(user_id,created_at desc);
create index if not exists contributions_status_created_idx on public.contributions(status,created_at);
create index if not exists contributions_problem_idx on public.contributions(problem_id) where problem_id is not null;
create index if not exists contributions_solution_idx on public.contributions(solution_id) where solution_id is not null;
create index if not exists contribution_audit_contribution_idx on public.contribution_audit(contribution_id,created_at desc);
create index if not exists contribution_audit_moderator_idx on public.contribution_audit(moderator_id,created_at desc);
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);
create index if not exists audit_events_type_idx on public.audit_events(event_type,created_at desc);
create index if not exists audit_events_actor_idx on public.audit_events(actor_id,created_at desc);
create index if not exists audit_events_target_idx on public.audit_events(target_type,target_id,created_at desc);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);
create index if not exists problem_timeline_problem_created_idx on public.problem_timeline(problem_id,created_at,id);
create index if not exists problems_latitude_idx on public.problems(latitude) where latitude is not null;
create index if not exists problems_longitude_idx on public.problems(longitude) where longitude is not null;

-- Safe replacements restore the public map contract and preserve the Sprint 25.1 signature.
create or replace function public.public_problem_coordinate(value double precision, precision text) returns double precision language sql immutable strict set search_path=public as $$ select case precision when 'exact' then value when 'street' then round(value::numeric,3)::double precision when 'neighborhood' then round(value::numeric,2)::double precision when 'city' then round(value::numeric,1)::double precision when 'state' then round(value::numeric,0)::double precision end $$;
create or replace function public.get_problem_region_summary() returns table(state text,city text,total_problems bigint,in_progress bigint,resolved bigint,last_updated timestamptz) language sql stable security definer set search_path=public as $$ select state,city,count(*),count(*) filter(where status='Em execução'),count(*) filter(where status='Resolvido'),max(updated_at) from public.problems where latitude is not null and longitude is not null group by state,city order by state,city $$;
create or replace function public.get_public_problem_location(p_problem_id uuid) returns table(id uuid,title text,category text,status text,city text,state text,latitude double precision,longitude double precision,geolocation_precision text,updated_at timestamptz,source_verified_at timestamptz) language sql stable security definer set search_path=public as $$ select id,title,category,status,city,state,public.public_problem_coordinate(latitude,geolocation_precision),public.public_problem_coordinate(longitude,geolocation_precision),geolocation_precision,updated_at,source_verified_at from public.problems where id=p_problem_id and latitude is not null and longitude is not null $$;
create or replace function public.write_audit_event(p_event_type text,p_target_type text default null,p_target_id uuid default null,p_metadata jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path=public as $$ declare v_id uuid; begin insert into public.audit_events(actor_id,event_type,target_type,target_id,metadata) values(auth.uid(),p_event_type,p_target_type,p_target_id,coalesce(p_metadata,'{}')) returning id into v_id; return v_id; end $$;

-- Re-enable RLS and recreate only absent policies; existing policies are retained.
alter table public.reactions enable row level security; alter table public.contributions enable row level security; alter table public.contribution_audit enable row level security; alter table public.audit_events enable row level security; alter table public.notifications enable row level security; alter table public.problem_timeline enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='reactions' and policyname='Users can read own reactions') then create policy "Users can read own reactions" on public.reactions for select to authenticated using(auth.uid()=user_id); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='reactions' and policyname='Users can create own reactions') then create policy "Users can create own reactions" on public.reactions for insert to authenticated with check(auth.uid()=user_id); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='Users read only own notifications') then create policy "Users read only own notifications" on public.notifications for select to authenticated using(recipient_id=auth.uid()); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='problem_timeline' and policyname='Public reads problem timeline') then create policy "Public reads problem timeline" on public.problem_timeline for select to anon,authenticated using(true); end if;
end $$;
revoke all on function public.public_problem_coordinate(double precision,text) from public,anon,authenticated;
revoke all on function public.write_audit_event(text,text,uuid,jsonb) from public;
grant execute on function public.get_problem_region_summary() to anon,authenticated;
grant execute on function public.get_public_problem_location(uuid) to anon,authenticated;

-- Storage catalog writes are idempotent; no objects/content are removed.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),('problem-images','problem-images',true,5242880,array['image/jpeg','image/png','image/webp']),('solution-images','solution-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
do $$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public read image buckets') then create policy "Public read image buckets" on storage.objects for select using(bucket_id in ('avatars','problem-images','solution-images')); end if; end $$;
notify pgrst, 'reload schema';

-- Read-only catalog audit used by scripts/auditLegacySchema.ts. It exposes names,
-- never secrets, and lets the service role inspect complete structural expectations.
create or replace function public.audit_legacy_schema() returns jsonb language sql stable security definer set search_path=public,pg_catalog,information_schema as $$
 with required_tables(name) as (values ('profiles'),('problems'),('solutions'),('comments'),('favorites'),('reactions'),('contributions'),('contribution_audit'),('audit_events'),('notifications'),('problem_timeline')),
 required_columns(table_name,column_name) as (values ('profiles','social_links'),('profiles','website'),('profiles','organization'),('problems','source_metadata'),('problems','source_verified_at'),('problems','latitude'),('problems','longitude'),('comments','user_id'),('favorites','user_id'),('reactions','reaction_type'),('contributions','payload'),('notifications','recipient_id')),
 required_functions(name) as (values ('public.public_problem_coordinate(double precision,text)'),('public.get_problem_region_summary()'),('public.get_public_problem_location(uuid)'),('public.write_audit_event(text,text,uuid,jsonb)')),
 missing as (
 select 'table:'||name item from required_tables where to_regclass('public.'||name) is null union all
 select 'column:'||table_name||'.'||column_name from required_columns r where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name) union all
 select 'function:'||name from required_functions where to_regprocedure(name) is null union all
 select 'policy:storage.objects/Public read image buckets' where not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public read image buckets') union all
 select 'bucket:'||id from (values ('avatars'),('problem-images'),('solution-images')) b(id) where not exists(select 1 from storage.buckets where buckets.id=b.id)
 ) select jsonb_build_object('ok',not exists(select 1 from missing),'missing',coalesce((select jsonb_agg(item order by item) from missing),'[]'::jsonb))
$$;
revoke all on function public.audit_legacy_schema() from public;
grant execute on function public.audit_legacy_schema() to service_role;

-- Exact Sprint 20 reaction RPC contract.
create or replace function public.get_reaction_summary(p_problem_id uuid default null, p_solution_id uuid default null)
returns table (reaction_type text, reaction_count bigint, selected_by_user boolean)
language sql stable security definer set search_path = public as $$
  select types.reaction_type,count(r.id)::bigint,coalesce(bool_or(r.user_id = auth.uid()), false)
  from (values ('useful'::text), ('liked'::text), ('interesting'::text)) types(reaction_type)
  left join public.reactions r on r.reaction_type=types.reaction_type and ((p_problem_id is not null and p_solution_id is null and r.problem_id=p_problem_id) or (p_problem_id is null and p_solution_id is not null and r.solution_id=p_solution_id))
  where ((p_problem_id is not null)::integer + (p_solution_id is not null)::integer)=1 group by types.reaction_type;
$$;
revoke all on function public.get_reaction_summary(uuid,uuid) from public;
grant execute on function public.get_reaction_summary(uuid,uuid) to anon,authenticated;

create or replace function public.is_contribution_moderator() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('curator','admin')); $$;
revoke all on function public.is_contribution_moderator() from public; grant execute on function public.is_contribution_moderator() to authenticated;
-- The full public history signature is retained; review uses this protected RPC.
create or replace function public.get_contribution_history(p_problem_id uuid default null,p_solution_id uuid default null)
returns table(id uuid,problem_id uuid,solution_id uuid,contribution_type text,payload jsonb,status text,rejection_reason text,created_at timestamptz,reviewed_at timestamptz,target_title text,author_name text,author_avatar_url text)
language sql stable security definer set search_path=public as $$ select c.id,c.problem_id,c.solution_id,c.contribution_type,c.payload,c.status,c.rejection_reason,c.created_at,c.reviewed_at,coalesce(p.title,s.title),coalesce(nullif(trim(a.display_name),''),nullif(trim(a.username),''),'Colaborador(a)'),a.avatar_url from public.contributions c join public.profiles a on a.id=c.user_id left join public.problems p on p.id=c.problem_id left join public.solutions s on s.id=c.solution_id where ((p_problem_id is not null)::integer+(p_solution_id is not null)::integer)=1 and c.status in ('approved','rejected') and ((p_problem_id is not null and c.problem_id=p_problem_id) or (p_solution_id is not null and c.solution_id=p_solution_id)) order by c.created_at desc; $$;
revoke all on function public.get_contribution_history(uuid,uuid) from public; grant execute on function public.get_contribution_history(uuid,uuid) to anon,authenticated;

-- Sprint 22 authorization helpers retain their original signatures.
create or replace function public.has_role(p_roles text[]) returns boolean language sql stable security definer set search_path=public as $$ select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and role=any(p_roles)); $$;
create or replace function public.has_role(p_role text) returns boolean language sql stable security definer set search_path=public as $$ select public.has_role(array[p_role]); $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select public.has_role('admin'); $$;
create or replace function public.can_review_contributions() returns boolean language sql stable security definer set search_path=public as $$ select public.has_role(array['curator','admin']); $$;
create or replace function public.can_moderate_comments() returns boolean language sql stable security definer set search_path=public as $$ select public.has_role(array['moderator','admin']); $$;
revoke all on function public.has_role(text[]) from public; revoke all on function public.has_role(text) from public; revoke all on function public.is_admin() from public; revoke all on function public.can_review_contributions() from public; revoke all on function public.can_moderate_comments() from public; grant execute on function public.has_role(text[]),public.has_role(text),public.is_admin(),public.can_review_contributions(),public.can_moderate_comments() to authenticated;

create or replace function public.review_contribution(p_contribution_id uuid, p_status text, p_rejection_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.contributions%rowtype; changes jsonb; change jsonb; column_name text; proposed jsonb;
begin
  if not public.is_contribution_moderator() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'Invalid status' using errcode = '22023'; end if;
  if p_status = 'rejected' and nullif(trim(p_rejection_reason), '') is null then raise exception 'Rejection reason is required' using errcode = '22023'; end if;
  select * into c from public.contributions where id = p_contribution_id for update;
  if not found then raise exception 'Contribution not found' using errcode = 'P0002'; end if;
  if c.status not in ('pending', 'reviewing') then raise exception 'Contribution already reviewed' using errcode = '22023'; end if;
  if p_status = 'approved' then
    changes := c.payload->'changes';
    for change in select value from jsonb_array_elements(changes) loop
      column_name := case change->>'field'
        when 'title' then 'title' when 'summary' then 'summary' when 'description' then 'description'
        when 'category' then 'category' when 'status' then 'status' when 'tags' then 'tags'
        when 'image' then 'image_url' when 'organization' then 'organization'
        when 'impactMetric' then 'impact_metric' when 'evidenceLinks' then 'evidence_links'
        else null end;
      if column_name is null then raise exception 'Field is not eligible for contribution' using errcode = '22023'; end if;
      proposed := change->'proposedValue';
      if c.problem_id is not null then
        if column_name not in ('title','summary','description','category','status','tags','image_url') then raise exception 'Invalid problem field' using errcode = '22023'; end if;
        if column_name = 'tags' then execute format('update public.problems set %I = $1, updated_at = timezone(''utc'', now()) where id = $2', column_name) using array(select jsonb_array_elements_text(proposed)), c.problem_id;
        else execute format('update public.problems set %I = $1, updated_at = timezone(''utc'', now()) where id = $2', column_name) using proposed #>> '{}', c.problem_id; end if;
      else
        if column_name not in ('title','summary','description','category','status','tags','image_url','organization','impact_metric','evidence_links') then raise exception 'Invalid solution field' using errcode = '22023'; end if;
        if column_name in ('tags','evidence_links') then execute format('update public.solutions set %I = $1, updated_at = timezone(''utc'', now()) where id = $2', column_name) using array(select jsonb_array_elements_text(proposed)), c.solution_id;
        else execute format('update public.solutions set %I = $1, updated_at = timezone(''utc'', now()) where id = $2', column_name) using proposed #>> '{}', c.solution_id; end if;
      end if;
    end loop;
  end if;
  update public.contributions set status = p_status, moderator_id = auth.uid(), rejection_reason = case when p_status = 'rejected' then trim(p_rejection_reason) else null end, reviewed_at = timezone('utc', now()) where id = c.id;
  insert into public.contribution_audit(contribution_id, moderator_id, action) values (c.id, auth.uid(), p_status);
end; $$;
revoke all on function public.review_contribution(uuid,text,text) from public; grant execute on function public.review_contribution(uuid,text,text) to authenticated;

create or replace function public.create_notification(p_recipient_id uuid,p_type text,p_title text,p_message text,p_target_type text default null,p_target_id uuid default null,p_action_url text default null,p_metadata jsonb default '{}'::jsonb,p_actor_id uuid default null) returns uuid language plpgsql security definer set search_path=public as $$ declare v_id uuid; v_metadata jsonb:=coalesce(p_metadata,'{}'::jsonb); begin if p_recipient_id is null or (p_actor_id is not null and p_actor_id=p_recipient_id) then return null; end if; if jsonb_typeof(v_metadata)<>'object' or pg_column_size(v_metadata)>4096 or v_metadata ?| array['password','token','secret','session','credential','api_key','mfa_secret'] then raise exception 'Invalid notification metadata' using errcode='22023'; end if; insert into public.notifications(recipient_id,actor_id,type,title,message,target_type,target_id,action_url,metadata) values(p_recipient_id,p_actor_id,p_type,trim(p_title),trim(p_message),nullif(trim(p_target_type),''),p_target_id,p_action_url,v_metadata) returning id into v_id; return v_id; end $$;
revoke all on function public.create_notification(uuid,text,text,text,text,uuid,text,jsonb,uuid) from public,anon,authenticated;
create or replace function public.get_unread_notification_count() returns bigint language plpgsql stable security definer set search_path=public as $$ begin if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if; return (select count(*) from public.notifications where recipient_id=auth.uid() and read_at is null); end $$;
create or replace function public.mark_notification_read(p_notification_id uuid) returns boolean language plpgsql security definer set search_path=public as $$ begin if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if; update public.notifications set read_at=coalesce(read_at,timezone('utc',now())) where id=p_notification_id and recipient_id=auth.uid(); return found; end $$;
create or replace function public.mark_all_notifications_read() returns integer language plpgsql security definer set search_path=public as $$ declare v_count integer; begin if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if; update public.notifications set read_at=timezone('utc',now()) where recipient_id=auth.uid() and read_at is null; get diagnostics v_count=row_count; return v_count; end $$;

create or replace function public.get_problem_timeline(p_problem_id uuid) returns table(id uuid,event_type text,title text,description text,official boolean,organization_name text,status_before text,status_after text,actor_name text,created_at timestamptz) language sql stable security definer set search_path=public as $$ select t.id,t.event_type,t.title,t.description,t.official,t.organization_name,t.status_before,t.status_after,coalesce(nullif(trim(p.display_name),''),nullif(trim(p.username),''),case when t.actor_id is null then 'Sistema' else 'Usuário da plataforma' end),t.created_at from public.problem_timeline t left join public.profiles p on p.id=t.actor_id where t.problem_id=p_problem_id and exists(select 1 from public.problems x where x.id=p_problem_id) order by t.created_at,t.id $$;
revoke all on function public.get_problem_timeline(uuid) from public; grant execute on function public.get_problem_timeline(uuid) to anon,authenticated;
create or replace function public.record_problem_timeline_sprint24() returns trigger language plpgsql security definer set search_path=public as $$ begin if tg_op='INSERT' then insert into public.problem_timeline(problem_id,actor_id,event_type,title,status_after) values(new.id,auth.uid(),'problem.created','Problema criado',new.status); elsif old.status is distinct from new.status then insert into public.problem_timeline(problem_id,actor_id,event_type,title,status_before,status_after) values(new.id,auth.uid(),'problem.status_changed',new.status,old.status,new.status); end if; return new; end $$;
drop trigger if exists record_problem_timeline_sprint24 on public.problems; create trigger record_problem_timeline_sprint24 after insert or update of status on public.problems for each row execute function public.record_problem_timeline_sprint24();
