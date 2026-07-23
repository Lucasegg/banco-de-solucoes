-- Sprint 31: hardened private notification centre. The existing signatures were
-- audited in Sprint 23/Sprint 26 and are recreated below with their known signature.
begin;

-- Fixed signature justification: get_notifications(text,boolean,integer,integer) was
-- created by the applied notification schema and is intentionally kept compatible.
create or replace function public.get_notifications(p_type text default null,p_unread_only boolean default false,p_limit integer default 20,p_offset integer default 0)
returns table(id uuid,actor_id uuid,actor_name text,type text,title text,message text,target_type text,target_id uuid,action_url text,metadata jsonb,read_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare v_category text := nullif(trim(coalesce(p_type,'')), '');
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if v_category is not null and v_category not in ('contributions','comments','favorites','account') then raise exception 'Invalid notification category' using errcode='22023'; end if;
 return query select n.id,n.actor_id,coalesce(nullif(trim(p.display_name),''),nullif(trim(p.username),''),'Sistema'),n.type,n.title,n.message,n.target_type,n.target_id,n.action_url,
   jsonb_strip_nulls(jsonb_build_object('contribution_id',n.metadata->'contribution_id','problem_id',n.metadata->'problem_id','solution_id',n.metadata->'solution_id','comment_id',n.metadata->'comment_id','actor_id',n.actor_id,'status',n.metadata->'status','category',case when n.type like 'contribution.%' then 'contributions' when n.type like 'comment.%' then 'comments' when n.type like 'favorite.%' then 'favorites' else 'account' end)),n.read_at,n.created_at
 from public.notifications n left join public.profiles p on p.id=n.actor_id
 where n.recipient_id=auth.uid() and (not coalesce(p_unread_only,false) or n.read_at is null)
 and (v_category is null or (v_category='contributions' and n.type like 'contribution.%') or (v_category='comments' and n.type like 'comment.%') or (v_category='favorites' and n.type like 'favorite.%') or (v_category='account' and n.type not like 'contribution.%' and n.type not like 'comment.%' and n.type not like 'favorite.%'))
 order by n.created_at desc,n.id desc limit least(greatest(coalesce(p_limit,20),1),50) offset greatest(coalesce(p_offset,0),0);
end $$;

revoke all on function public.get_notifications(text,boolean,integer,integer) from public, anon;
grant execute on function public.get_notifications(text,boolean,integer,integer) to authenticated;
revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;
commit;
