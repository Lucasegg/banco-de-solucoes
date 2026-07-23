-- Sprint 31: hardened private notification centre.
-- Existing notification RPC signatures are audited through pg_proc below; the
-- legacy get_notifications(p_type ...) contract is deliberately not changed.
begin;

-- New distinct RPC for category filtering and limit + 1 pagination. p_type on
-- get_notifications remains a technical notification type for legacy callers.
create or replace function public.get_notifications_page(p_category text default null,p_unread_only boolean default false,p_limit integer default 20,p_offset integer default 0)
returns table(id uuid,actor_id uuid,actor_name text,type text,title text,message text,target_type text,target_id uuid,action_url text,metadata jsonb,read_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare v_category text := nullif(trim(coalesce(p_category,'')), '');
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if v_category is not null and v_category not in ('contributions','comments','favorites','account') then raise exception 'Invalid notification category' using errcode='22023'; end if;
 return query select n.id,n.actor_id,coalesce(nullif(trim(p.display_name),''),nullif(trim(p.username),''),'Sistema'),n.type,n.title,n.message,n.target_type,n.target_id,n.action_url,
   jsonb_strip_nulls(jsonb_build_object('contribution_id',n.metadata->'contribution_id','problem_id',n.metadata->'problem_id','solution_id',n.metadata->'solution_id','comment_id',n.metadata->'comment_id','actor_id',n.actor_id,'status',n.metadata->'status','category',case when n.type like 'contribution.%' then 'contributions' when n.type like 'comment.%' then 'comments' when n.type like 'favorite.%' then 'favorites' else 'account' end)),n.read_at,n.created_at
 from public.notifications n left join public.profiles p on p.id=n.actor_id
 where n.recipient_id=auth.uid() and (not coalesce(p_unread_only,false) or n.read_at is null)
 and (v_category is null or (v_category='contributions' and n.type like 'contribution.%') or (v_category='comments' and n.type like 'comment.%') or (v_category='favorites' and n.type like 'favorite.%') or (v_category='account' and n.type not like 'contribution.%' and n.type not like 'comment.%' and n.type not like 'favorite.%'))
 order by n.created_at desc,n.id desc limit least(greatest(coalesce(p_limit,20),1),50) + 1 offset greatest(coalesce(p_offset,0),0);
end $$;

-- Resolve actual signatures rather than assuming an overload. User-facing RPCs
-- receive authenticated execution only; create_notification stays internal.
do $$
declare fn record;
begin
 for fn in select p.proname, p.oid::regprocedure as signature
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname = any(array['get_notifications','get_unread_notification_count','mark_notification_read','mark_all_notifications_read','create_notification'])
 loop
   execute format('revoke all on function %s from public, anon', fn.signature);
   if fn.proname = 'create_notification' then
     execute format('revoke all on function %s from authenticated', fn.signature);
   else
     execute format('grant execute on function %s to authenticated', fn.signature);
   end if;
 end loop;
end $$;
revoke all on function public.get_notifications_page(text,boolean,integer,integer) from public, anon;
grant execute on function public.get_notifications_page(text,boolean,integer,integer) to authenticated;
revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;
commit;
