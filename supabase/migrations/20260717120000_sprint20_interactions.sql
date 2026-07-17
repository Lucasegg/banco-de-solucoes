-- Sprint 20: comentários, reações e favoritos.
-- Ajusta o nome da coluna de autoria criado na entrega parcial anterior.
alter table public.comments rename column author_id to user_id;
alter table public.comments drop constraint if exists comments_author_id_fkey;
alter table public.comments add constraint comments_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.comments add constraint comments_user_profile_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter index if exists comments_author_id_idx rename to comments_user_id_idx;

-- A autoria e o alvo nunca podem ser alterados pelo cliente.
create or replace function public.sprint20_protect_comment_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.user_id is distinct from old.user_id or new.problem_id is distinct from old.problem_id
    or new.solution_id is distinct from old.solution_id or new.created_at is distinct from old.created_at then
    raise exception 'Comment ownership and target cannot be changed' using errcode = '42501';
  end if;
  if new.content is distinct from old.content then new.edited := true; end if;
  return new;
end; $$;
drop trigger if exists prevent_comment_immutable_update_before_update on public.comments;
drop trigger if exists sprint20_protect_comment_fields_before_update on public.comments;
create trigger sprint20_protect_comment_fields_before_update before update on public.comments for each row execute function public.sprint20_protect_comment_fields();

-- Policies são recriadas após a renomeação para documentar a regra da Sprint 20.
drop policy if exists "Authenticated users can create comments" on public.comments;
drop policy if exists "Authors can update own comments" on public.comments;
drop policy if exists "Authors can delete own comments" on public.comments;
create policy "Authenticated users can create comments" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "Authors can update own comments" on public.comments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Authors can delete own comments" on public.comments for delete to authenticated using (auth.uid() = user_id);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  problem_id uuid references public.problems(id) on delete cascade,
  solution_id uuid references public.solutions(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reactions_exactly_one_target_check check ((problem_id is not null)::integer + (solution_id is not null)::integer = 1),
  constraint reactions_type_check check (reaction_type in ('useful', 'liked', 'interesting'))
);
create unique index reactions_user_problem_type_unique on public.reactions(user_id, problem_id, reaction_type) where problem_id is not null;
create unique index reactions_user_solution_type_unique on public.reactions(user_id, solution_id, reaction_type) where solution_id is not null;
create index reactions_problem_summary_idx on public.reactions(problem_id, reaction_type) where problem_id is not null;
create index reactions_solution_summary_idx on public.reactions(solution_id, reaction_type) where solution_id is not null;
create index reactions_user_id_idx on public.reactions(user_id);
alter table public.reactions enable row level security;
create policy "Users can read own reactions" on public.reactions for select to authenticated using (auth.uid() = user_id);
create policy "Users can create own reactions" on public.reactions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own reactions" on public.reactions for delete to authenticated using (auth.uid() = user_id);
-- UPDATE é deliberadamente proibido: o toggle é DELETE + INSERT.

-- Contagens públicas sem revelar user_id; selected_by_user somente considera auth.uid().
create or replace function public.get_reaction_summary(p_problem_id uuid default null, p_solution_id uuid default null)
returns table (reaction_type text, reaction_count bigint, selected_by_user boolean)
language sql stable security definer set search_path = public as $$
  select types.reaction_type,
    count(r.id)::bigint,
    coalesce(bool_or(r.user_id = auth.uid()), false)
  from (values ('useful'::text), ('liked'::text), ('interesting'::text)) types(reaction_type)
  left join public.reactions r on r.reaction_type = types.reaction_type
    and ((p_problem_id is not null and p_solution_id is null and r.problem_id = p_problem_id)
      or (p_problem_id is null and p_solution_id is not null and r.solution_id = p_solution_id))
  where ((p_problem_id is not null)::integer + (p_solution_id is not null)::integer) = 1
  group by types.reaction_type;
$$;
revoke all on function public.get_reaction_summary(uuid, uuid) from public;
grant execute on function public.get_reaction_summary(uuid, uuid) to anon, authenticated;

-- Favoritos já existiam parcialmente; garante vínculo direto e policies explícitas.
alter table public.favorites drop constraint if exists favorites_user_id_fkey;
alter table public.favorites add constraint favorites_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
drop policy if exists "Users can update own favorites" on public.favorites;
-- Nenhuma policy UPDATE: favoritos são imutáveis e removidos por DELETE.
