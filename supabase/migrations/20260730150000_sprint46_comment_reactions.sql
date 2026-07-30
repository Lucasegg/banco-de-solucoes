-- Sprint 46: persistent, private comment reactions with batched public summaries.
begin;

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like','support','interesting','needsEvidence')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint comment_reactions_identity_key unique(comment_id,user_id,reaction_type)
);
create index if not exists comment_reactions_comment_active_idx on public.comment_reactions(comment_id,reaction_type) where active;
create index if not exists comment_reactions_user_comment_idx on public.comment_reactions(user_id,comment_id);
alter table public.comment_reactions enable row level security;
alter table public.comment_reactions force row level security;
revoke all on table public.comment_reactions from public,anon,authenticated;

create or replace function public.toggle_my_comment_reaction(p_comment_id uuid,p_reaction_type text)
returns table(active boolean,reaction_count bigint)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=auth.uid(); v_comment public.comments%rowtype; v_active boolean; v_first boolean:=false;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_reaction_type is null or p_reaction_type not in ('like','support','interesting','needsEvidence') then raise exception 'Invalid reaction type' using errcode='22023'; end if;
 if p_comment_id is null then raise exception 'Comment unavailable' using errcode='P0002'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_comment_id::text||':'||v_user::text||':'||p_reaction_type,46));
 select c.* into v_comment from public.comments c where c.id=p_comment_id and not c.deleted and c.visibility='visible' for share;
 if not found then raise exception 'Comment unavailable' using errcode='P0002'; end if;
 -- Self-reactions are intentionally allowed; they use the same limits and never self-notify.
 select cr.active into v_active from public.comment_reactions cr where cr.comment_id=p_comment_id and cr.user_id=v_user and cr.reaction_type=p_reaction_type for update;
 if found then update public.comment_reactions cr set active=not v_active,updated_at=timezone('utc',now()) where cr.comment_id=p_comment_id and cr.user_id=v_user and cr.reaction_type=p_reaction_type returning cr.active into v_active;
 else insert into public.comment_reactions(comment_id,user_id,reaction_type) values(p_comment_id,v_user,p_reaction_type) returning comment_reactions.active into v_active; v_first:=true; end if;
 if v_first and v_active and v_comment.user_id<>v_user and coalesce((select np.comments from public.notification_preferences np where np.user_id=v_comment.user_id),true) then
   perform public.create_event_notification(v_comment.user_id,'comment.reacted',case when v_comment.problem_id is not null then 'problem' else 'solution' end,coalesce(v_comment.problem_id,v_comment.solution_id),null,'comment-reaction:'||p_comment_id||':'||v_user||':'||p_reaction_type,'Nova reação','Seu comentário recebeu uma reação.',case when v_comment.problem_id is not null then '/problems/'||v_comment.problem_id else '/solutions/'||v_comment.solution_id end);
   update public.notifications n set actor_id=v_user where n.event_key='comment-reaction:'||p_comment_id||':'||v_user||':'||p_reaction_type and n.actor_id is null;
 end if;
 return query select v_active,count(*) from public.comment_reactions cr where cr.comment_id=p_comment_id and cr.reaction_type=p_reaction_type and cr.active;
end $$;

create or replace function public.get_comment_reaction_summary(p_problem_id uuid default null,p_solution_id uuid default null)
returns table(comment_id uuid,reaction_type text,reaction_count bigint,selected_by_user boolean)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if (p_problem_id is null)=(p_solution_id is null) then raise exception 'Exactly one target is required' using errcode='22023'; end if;
 if not exists(select 1 from public.problems p where p.id=p_problem_id) and not exists(select 1 from public.solutions s where s.id=p_solution_id) then raise exception 'Target unavailable' using errcode='P0002'; end if;
 return query select c.id,cr.reaction_type,count(*)::bigint,coalesce(bool_or(cr.user_id=auth.uid()),false)
 from public.comments c join public.comment_reactions cr on cr.comment_id=c.id and cr.active
 where not c.deleted and c.visibility='visible' and ((p_problem_id is not null and c.problem_id=p_problem_id) or (p_solution_id is not null and c.solution_id=p_solution_id))
 group by c.id,cr.reaction_type order by c.id,cr.reaction_type;
end $$;
revoke all on function public.toggle_my_comment_reaction(uuid,text),public.get_comment_reaction_summary(uuid,uuid) from public,anon;
grant execute on function public.toggle_my_comment_reaction(uuid,text) to authenticated;
grant execute on function public.get_comment_reaction_summary(uuid,uuid) to anon,authenticated;
commit;
