-- Hotfix: preserve the existing profile/auth identity contract (profiles.id = auth.users.id)
-- and make ownership the database authority for every mutable content domain.
begin;

-- Favorites have one nullable target column and partial unique indexes from Sprint 16.
-- Normalize only exact duplicate rows before asserting the indexes remain valid.
delete from public.favorites older using public.favorites newer
 where older.user_id = newer.user_id
   and ((older.problem_id is not null and older.problem_id = newer.problem_id)
     or (older.solution_id is not null and older.solution_id = newer.solution_id))
   and (older.created_at, older.id) < (newer.created_at, newer.id);

drop policy if exists "Users can read own favorites" on public.favorites;
drop policy if exists "Users can create own favorites" on public.favorites;
drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can read own favorites" on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "Users can create own favorites" on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "Users can delete own favorites" on public.favorites for delete to authenticated using (user_id = auth.uid());

-- Re-state the author-only policies so direct table calls cannot bypass the UI.
drop policy if exists "Authors can update own problems" on public.problems;
drop policy if exists "Authors can delete own problems" on public.problems;
create policy "Authors can update own problems" on public.problems for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors can delete own problems" on public.problems for delete to authenticated using (author_id = auth.uid());
drop policy if exists "Authors can update own solutions" on public.solutions;
drop policy if exists "Authors can delete own solutions" on public.solutions;
create policy "Authors can update own solutions" on public.solutions for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors can delete own solutions" on public.solutions for delete to authenticated using (author_id = auth.uid());

-- A contributor may edit/cancel only an unreviewed contribution; reviewers still use review_contribution.
drop policy if exists "Authors update editable contributions" on public.contributions;
drop policy if exists "Authors delete editable contributions" on public.contributions;
create policy "Authors update editable contributions" on public.contributions for update to authenticated
 using (user_id = auth.uid() and status in ('pending', 'reviewing'))
 with check (user_id = auth.uid() and status in ('pending', 'reviewing') and moderator_id is null and reviewed_at is null);
create policy "Authors delete editable contributions" on public.contributions for delete to authenticated
 using (user_id = auth.uid() and status in ('pending', 'reviewing'));

-- Grants for update_solution_with_problems are owned by the earlier Sprint 29
-- migration. Do not repeat them here: a fixed signature can fail on legitimate
-- overloads or deployments where the RPC is not installed.
commit;
