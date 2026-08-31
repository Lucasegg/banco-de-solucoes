-- Restore the minimum privilege required to maintain the Sprint 32 expression
-- indexes when authenticated members insert or update problems and solutions.
begin;

revoke all on function public.search_tags_text(text[]) from public, anon;
grant execute on function public.search_tags_text(text[]) to authenticated;

commit;
