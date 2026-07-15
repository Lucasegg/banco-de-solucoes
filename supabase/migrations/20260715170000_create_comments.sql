create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  solution_id uuid references public.solutions(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint comments_single_target_check check (
    (problem_id is not null and solution_id is null)
    or (problem_id is null and solution_id is not null)
  ),
  constraint comments_content_length_check check (char_length(btrim(content)) between 1 and 2000)
);

create index if not exists comments_author_id_idx on public.comments(author_id);
create index if not exists comments_problem_id_created_at_idx on public.comments(problem_id, created_at desc) where problem_id is not null;
create index if not exists comments_solution_id_created_at_idx on public.comments(solution_id, created_at desc) where solution_id is not null;

drop trigger if exists set_comments_updated_at_before_update on public.comments;
create trigger set_comments_updated_at_before_update before update on public.comments for each row execute function public.set_domain_updated_at();

create or replace function public.refresh_target_comment_count(p_problem_id uuid, p_solution_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_problem_id is not null then
    update public.problems
    set comments = (select count(*)::integer from public.comments where problem_id = p_problem_id)
    where id = p_problem_id;
  end if;

  if p_solution_id is not null then
    update public.solutions
    set comments = (select count(*)::integer from public.comments where solution_id = p_solution_id)
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
  elsif tg_op = 'DELETE' then
    perform public.refresh_target_comment_count(old.problem_id, old.solution_id);
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_comment_count_after_insert on public.comments;
create trigger sync_comment_count_after_insert after insert on public.comments for each row execute function public.sync_comment_count();
drop trigger if exists sync_comment_count_after_delete on public.comments;
create trigger sync_comment_count_after_delete after delete on public.comments for each row execute function public.sync_comment_count();

alter table public.comments enable row level security;

drop policy if exists "Public can read comments" on public.comments;
create policy "Public can read comments" on public.comments for select to anon, authenticated using (true);
drop policy if exists "Authenticated users can create comments" on public.comments;
create policy "Authenticated users can create comments" on public.comments for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists "Authors can update own comments" on public.comments;
create policy "Authors can update own comments" on public.comments for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "Authors can delete own comments" on public.comments;
create policy "Authors can delete own comments" on public.comments for delete to authenticated using (auth.uid() = author_id);
