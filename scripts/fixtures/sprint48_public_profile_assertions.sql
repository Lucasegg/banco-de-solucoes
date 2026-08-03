\set ON_ERROR_STOP on
begin;
do $$ declare payload jsonb;begin
 if not has_function_privilege('anon','public.get_public_member_profile(text)','execute') or not has_function_privilege('authenticated','public.get_public_member_profile(text)','execute') then raise exception 'minimal RPC grants missing';end if;
 if has_table_privilege('anon','public.profiles','insert,update,delete') then raise exception 'anon profile DML leaked';end if;
 if not exists(select 1 from pg_proc where oid='public.get_public_member_profile(text)'::regprocedure and prosecdef and 'search_path=pg_catalog, public'=any(proconfig)) then raise exception 'unsafe RPC search_path';end if;
 set local role anon; payload:=public.get_public_member_profile('  AUTOR-47  ');
 if payload->>'status'<>'public' or payload#>>'{profile,username}'<>'autor-47' then raise exception 'public profile/normalization failed: %',payload;end if;
 if payload::text ~* 'email|token|provider|consent|notification|audit|moderation_note' then raise exception 'private field leaked';end if;
 if (payload#>>'{profile,metrics,reputation}')::integer<>7 then raise exception 'reputation metric incorrect';end if;
 if jsonb_array_length(payload#>'{profile,activity}')>20 then raise exception 'activity is not bounded';end if;
 if public.get_public_member_profile('unknown-48')->>'status'<>'not_found' then raise exception 'unknown username disclosed';end if;
 reset role; update public.profiles set public_profile=false where username='autor-47'; set local role anon;
 if public.get_public_member_profile('autor-47')<>jsonb_build_object('status','not_found') then raise exception 'private profile disclosed to anon';end if;
 reset role; set local role authenticated;
 if public.get_public_member_profile('autor-47')<>jsonb_build_object('status','not_found') then raise exception 'private profile disclosed externally';end if;
 reset role;
 if not exists(select 1 from public.profiles where id='47000000-0000-0000-0000-000000000001' and not public_profile) then raise exception 'owner row access broken';end if;
end $$;
rollback;
