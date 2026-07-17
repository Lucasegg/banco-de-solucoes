-- Sprint 21: contribuições moderadas para problemas e soluções.
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  solution_id uuid references public.solutions(id) on delete cascade,
  contribution_type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  moderator_id uuid references auth.users(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  constraint contributions_exactly_one_target_check check ((problem_id is not null)::integer + (solution_id is not null)::integer = 1),
  constraint contributions_status_check check (status in ('pending', 'reviewing', 'approved', 'rejected')),
  constraint contributions_type_check check (contribution_type in ('correction', 'update', 'evidence', 'general')),
  constraint contributions_payload_check check (jsonb_typeof(payload) = 'object' and payload <> '{}'::jsonb and jsonb_array_length(coalesce(payload->'changes', '[]'::jsonb)) > 0),
  constraint contributions_review_fields_check check ((status in ('pending', 'reviewing') and reviewed_at is null) or (status in ('approved', 'rejected') and reviewed_at is not null and moderator_id is not null))
);
create index contributions_user_created_idx on public.contributions(user_id, created_at desc);
create index contributions_status_created_idx on public.contributions(status, created_at);
create index contributions_problem_idx on public.contributions(problem_id) where problem_id is not null;
create index contributions_solution_idx on public.contributions(solution_id) where solution_id is not null;

create table public.contribution_audit (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now())
);
create index contribution_audit_contribution_idx on public.contribution_audit(contribution_id, created_at desc);
create index contribution_audit_moderator_idx on public.contribution_audit(moderator_id, created_at desc);

create or replace function public.is_contribution_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('curator', 'admin'));
$$;
revoke all on function public.is_contribution_moderator() from public;
grant execute on function public.is_contribution_moderator() to authenticated;

alter table public.contributions enable row level security;
alter table public.contribution_audit enable row level security;
create policy "Users read own contributions" on public.contributions for select to authenticated using (user_id = auth.uid() or public.is_contribution_moderator());
create policy "Users create own contributions" on public.contributions for insert to authenticated with check (user_id = auth.uid() and status = 'pending' and moderator_id is null and reviewed_at is null and rejection_reason is null);
create policy "Moderators read contribution audit" on public.contribution_audit for select to authenticated using (public.is_contribution_moderator());
-- Escritas de moderação passam exclusivamente pela função transacional abaixo.

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
revoke all on function public.review_contribution(uuid, text, text) from public;
grant execute on function public.review_contribution(uuid, text, text) to authenticated;
