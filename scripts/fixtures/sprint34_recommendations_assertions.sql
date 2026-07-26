do $$ begin
 if to_regprocedure('public.get_related_problems(uuid,integer,integer)') is null or to_regprocedure('public.get_recommended_solutions(uuid,integer,integer)') is null or to_regprocedure('public.get_related_problems_for_solution(uuid,integer,integer)') is null then raise exception 'Sprint 34 RPC signatures missing'; end if;
 if not has_function_privilege('anon','public.get_related_problems(uuid,integer,integer)','execute') then raise exception 'anon recommendation grant missing'; end if;
end $$;
select count(*) from public.get_related_problems('00000000-0000-0000-0000-000000000099',24,-1);
select count(*) from public.get_recommended_solutions('00000000-0000-0000-0000-000000000099',24,-1);
select count(*) from public.get_related_problems_for_solution('00000000-0000-0000-0000-000000000099',24,-1);
