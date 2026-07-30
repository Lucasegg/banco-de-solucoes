-- Regression assertions for the cumulative Sprint 31 notification contract.
do $$ declare legacy_types text[];begin
 if not (select relrowsecurity from pg_class where oid='public.notifications'::regclass) then raise exception 'Sprint 31 RLS missing';end if;
 if has_table_privilege('anon','public.notifications','select') or has_table_privilege('authenticated','public.notifications','insert,update,delete') then raise exception 'Sprint 31 privileges regressed';end if;
 select array_agg(distinct type order by type) into legacy_types from public.notifications where title='legacy';
 if legacy_types is distinct from array['comment.created','comment.reacted','comment.replied','contribution.approved','contribution.changes_requested','contribution.received','contribution.rejected','favorite.content_updated','user.role_changed']::text[] then raise exception 'legacy type fixture incomplete: %',legacy_types;end if;
end $$;
