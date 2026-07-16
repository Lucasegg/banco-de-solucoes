create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  solution_id uuid references public.solutions(id) on delete cascade,
  content text not null,
  edited boolean not null default false,
  deleted boolean not null default false,
  visibility text not null default 'visible',
  best_answer boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint comments_single_target_check check (
    (problem_id is not null and solution_id is null)
    or (problem_id is null and solution_id is not null)
  ),
  constraint comments_content_length_check check (char_length(btrim(content)) between 1 and 2000),
  constraint comments_visibility_check check (visibility in ('visible', 'hidden', 'removed'))
);

create index if not exists comments_parent_id_idx on public.comments(parent_id);
create index if not exists comments_author_id_idx on public.comments(author_id);
create index if not exists comments_problem_id_created_at_idx on public.comments(problem_id, created_at desc) where problem_id is not null;
create index if not exists comments_solution_id_created_at_idx on public.comments(solution_id, created_at desc) where solution_id is not null;


create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint comment_reports_reason_check check (char_length(btrim(reason)) between 1 and 1000),
  constraint comment_reports_unique_reporter_per_comment unique (comment_id, reporter_id)
);

create index if not exists comment_reports_comment_id_idx on public.comment_reports(comment_id);
create index if not exists comment_reports_reporter_id_idx on public.comment_reports(reporter_id);



create or replace function public.validate_comment_target_and_depth()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record public.comments%rowtype;
  reply_depth integer := 1;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into parent_record from public.comments where id = new.parent_id;
  if not found then
    raise exception 'Parent comment not found' using errcode = '23503';
  end if;

  if parent_record.problem_id is distinct from new.problem_id or parent_record.solution_id is distinct from new.solution_id then
    raise exception 'Reply must target the same problem or solution as its parent' using errcode = '23514';
  end if;

  with recursive ancestors as (
    select id, parent_id, 1 as depth from public.comments where id = new.parent_id
    union all
    select parent.id, parent.parent_id, ancestors.depth + 1
    from public.comments parent
    join ancestors on ancestors.parent_id = parent.id
  ) select coalesce(max(depth), 0) + 1 into reply_depth from ancestors;

  if reply_depth > 3 then
    raise exception 'Replies are allowed up to three levels' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_comment_target_and_depth_before_write on public.comments;
create trigger validate_comment_target_and_depth_before_write before insert or update on public.comments for each row execute function public.validate_comment_target_and_depth();

create or replace function public.prevent_comment_immutable_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.author_id is distinct from old.author_id
    or new.problem_id is distinct from old.problem_id
    or new.solution_id is distinct from old.solution_id
    or new.parent_id is distinct from old.parent_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Comment ownership and target fields cannot be changed' using errcode = '42501';
  end if;

  if auth.uid() = old.author_id and current_user in ('authenticated', 'anon') and (new.best_answer is distinct from old.best_answer
    or new.visibility is distinct from old.visibility
    or new.deleted is distinct from old.deleted) then
    raise exception 'Comment administrative fields cannot be changed directly' using errcode = '42501';
  end if;

  if new.content is distinct from old.content then
    new.edited := true;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_comment_immutable_update_before_update on public.comments;
create trigger prevent_comment_immutable_update_before_update before update on public.comments for each row execute function public.prevent_comment_immutable_update();

drop trigger if exists set_comments_updated_at_before_update on public.comments;
create trigger set_comments_updated_at_before_update before update on public.comments for each row execute function public.set_domain_updated_at();

create or replace function public.refresh_target_comment_count(p_problem_id uuid, p_solution_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_problem_id is not null then
    update public.problems
    set comments = (select count(*)::integer from public.comments where problem_id = p_problem_id and deleted = false and visibility <> 'removed')
    where id = p_problem_id;
  end if;

  if p_solution_id is not null then
    update public.solutions
    set comments = (select count(*)::integer from public.comments where solution_id = p_solution_id and deleted = false and visibility <> 'removed')
    where id = p_solution_id;
  end if;
end;
$$;

create or replace function public.sync_comment_count()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_target_comment_count(new.problem_id, new.solution_id);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.deleted is distinct from old.deleted or new.visibility is distinct from old.visibility or new.problem_id is distinct from old.problem_id or new.solution_id is distinct from old.solution_id then
      perform public.refresh_target_comment_count(old.problem_id, old.solution_id);
      perform public.refresh_target_comment_count(new.problem_id, new.solution_id);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    perform public.refresh_target_comment_count(old.problem_id, old.solution_id);
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_comment_count_after_insert on public.comments;
create trigger sync_comment_count_after_insert after insert on public.comments for each row execute function public.sync_comment_count();
drop trigger if exists sync_comment_count_after_update on public.comments;
create trigger sync_comment_count_after_update after update on public.comments for each row execute function public.sync_comment_count();
drop trigger if exists sync_comment_count_after_delete on public.comments;
create trigger sync_comment_count_after_delete after delete on public.comments for each row execute function public.sync_comment_count();

alter table public.comments enable row level security;

drop policy if exists "Public can read comments" on public.comments;
create policy "Public can read comments" on public.comments for select to anon, authenticated using (deleted = false and visibility = 'visible');
drop policy if exists "Authenticated users can create comments" on public.comments;
create policy "Authenticated users can create comments" on public.comments for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "Authors can update own comments" on public.comments;
create policy "Authors can update own comments" on public.comments for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "Authors can delete own comments" on public.comments;
create policy "Authors can delete own comments" on public.comments for delete to authenticated using (auth.uid() = author_id);

create or replace function public.report_comment(p_comment_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  reporter_id uuid := auth.uid();
begin
  if reporter_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.comments where id = p_comment_id and author_id <> reporter_id) then
    raise exception 'Comment report was not accepted' using errcode = '42501';
  end if;

  insert into public.comment_reports (comment_id, reporter_id, reason)
  values (p_comment_id, reporter_id, btrim(p_reason));

  return p_comment_id;
end;
$$;

create or replace function public.mark_comment_best_answer(p_comment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_record public.comments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into comment_record from public.comments where id = p_comment_id;
  if not found then
    raise exception 'Comment not found' using errcode = 'P0002';
  end if;

  if comment_record.problem_id is not null and not exists (select 1 from public.problems where id = comment_record.problem_id and author_id = auth.uid()) then
    raise exception 'Only the problem author can mark the best answer' using errcode = '42501';
  end if;

  if comment_record.solution_id is not null and not exists (select 1 from public.solutions where id = comment_record.solution_id and author_id = auth.uid()) then
    raise exception 'Only the solution author can mark the best answer' using errcode = '42501';
  end if;

  update public.comments
  set best_answer = false
  where (comment_record.problem_id is not null and problem_id = comment_record.problem_id)
     or (comment_record.solution_id is not null and solution_id = comment_record.solution_id);

  update public.comments set best_answer = true where id = p_comment_id;
  return p_comment_id;
end;
$$;



alter table public.comment_reports enable row level security;

drop policy if exists "Moderators can read comment reports" on public.comment_reports;
create policy "Moderators can read comment reports" on public.comment_reports for select to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and role in ('moderator', 'admin')));
drop policy if exists "Authenticated users can create comment reports" on public.comment_reports;

create or replace function public.list_reported_comments()
returns table (
  id uuid,
  author_id uuid,
  parent_id uuid,
  problem_id uuid,
  solution_id uuid,
  content text,
  edited boolean,
  deleted boolean,
  visibility text,
  best_answer boolean,
  reports jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  display_name text,
  username text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.author_id, c.parent_id, c.problem_id, c.solution_id, c.content, c.edited, c.deleted, c.visibility, c.best_answer,
    coalesce(jsonb_agg(jsonb_build_object('userId', cr.reporter_id::text, 'reason', cr.reason, 'createdAt', cr.created_at::text) order by cr.created_at) filter (where cr.id is not null), '[]'::jsonb) as reports,
    c.created_at, c.updated_at, p.display_name, p.username, p.avatar_url
  from public.comments c
  join public.comment_reports cr on cr.comment_id = c.id
  left join public.profiles p on p.id = c.author_id
  where exists (select 1 from public.profiles moderator where moderator.id = auth.uid() and moderator.role in ('moderator', 'admin'))
  group by c.id, p.display_name, p.username, p.avatar_url
  order by c.updated_at desc;
$$;

create or replace function public.moderate_comment_visibility(p_comment_id uuid, p_visibility text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  moderator_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select role into moderator_role from public.profiles where id = auth.uid();
  if moderator_role not in ('moderator', 'admin') then
    raise exception 'Only moderators can moderate comments' using errcode = '42501';
  end if;

  if p_visibility not in ('visible', 'hidden', 'removed') then
    raise exception 'Invalid visibility' using errcode = '23514';
  end if;

  update public.comments
  set visibility = p_visibility,
      deleted = p_visibility = 'removed'
  where id = p_comment_id;

  if not found then
    raise exception 'Comment not found' using errcode = 'P0002';
  end if;

  return p_comment_id;
end;
$$;


revoke all on function public.report_comment(uuid, text) from public;
grant execute on function public.report_comment(uuid, text) to authenticated;
revoke all on function public.mark_comment_best_answer(uuid) from public;
grant execute on function public.mark_comment_best_answer(uuid) to authenticated;
revoke all on function public.moderate_comment_visibility(uuid, text) from public;
grant execute on function public.moderate_comment_visibility(uuid, text) to authenticated;
revoke all on function public.list_reported_comments() from public;
grant execute on function public.list_reported_comments() to authenticated;
