-- Hotfix 25.1: fail deployment if Sprint 25 RPC is missing and refresh PostgREST.
do $$
begin
  if to_regprocedure('public.get_problems_in_bounds(double precision,double precision,double precision,double precision,text,text,text,text,text,boolean,integer,boolean)') is null then
    raise exception 'Sprint 25 get_problems_in_bounds migration must be applied first';
  end if;
end $$;

-- Supabase PostgREST listens for this notification and reloads function signatures.
notify pgrst, 'reload schema';
