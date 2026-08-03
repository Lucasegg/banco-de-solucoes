-- Sprint 47: server-derived, auditable reputation and achievements.
begin;

create table public.reputation_rules (
  rule_key text primary key,
  points integer not null check (points >= 0),
  description text not null
);
comment on table public.reputation_rules is 'Central, immutable scoring contract: active_comment=5, received_reaction=2, best_answer=25.';
insert into public.reputation_rules(rule_key,points,description) values
 ('active_comment',5,'Visible, non-deleted comment'),
 ('received_reaction',2,'Active reaction received from another account on a valid comment'),
 ('best_answer',25,'Valid comment currently selected as best answer');

create table public.user_reputation (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  active_comments integer not null default 0 check (active_comments >= 0),
  reactions_received integer not null default 0 check (reactions_received >= 0),
  best_answers integer not null default 0 check (best_answers >= 0),
  discussions_participated integer not null default 0 check (discussions_participated >= 0),
  updated_at timestamptz not null default timezone('utc',now())
);

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null check (achievement_key in ('active_voice','supported_idea','best_answer','frequent_collaborator','community_expert')),
  earned_at timestamptz not null default timezone('utc',now()),
  primary key(user_id,achievement_key)
);

create table public.reputation_audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  reason text not null,
  previous_points integer not null,
  resulting_points integer not null,
  active_comments integer not null,
  reactions_received integer not null,
  best_answers integer not null,
  discussions_participated integer not null,
  created_at timestamptz not null default timezone('utc',now())
);
comment on table public.reputation_audit_log is 'Append-only server audit; user_id deliberately has no FK so account deletion preserves history.';
create index reputation_audit_user_created_idx on public.reputation_audit_log(user_id,created_at desc,id desc);

alter table public.reputation_rules enable row level security;
alter table public.reputation_rules force row level security;
alter table public.user_reputation enable row level security;
alter table public.user_reputation force row level security;
alter table public.user_achievements enable row level security;
alter table public.user_achievements force row level security;
alter table public.reputation_audit_log enable row level security;
alter table public.reputation_audit_log force row level security;
revoke all on table public.reputation_rules,public.user_reputation,public.user_achievements,public.reputation_audit_log from public,anon,authenticated;
revoke all on sequence public.reputation_audit_log_id_seq from public,anon,authenticated;

create function public.prevent_reputation_internal_mutation() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin raise exception 'Reputation data is server managed' using errcode='55000'; end $$;
create trigger reputation_rules_immutable before insert or update or delete on public.reputation_rules
for each row execute function public.prevent_reputation_internal_mutation();
create trigger reputation_audit_immutable before update or delete on public.reputation_audit_log
for each row execute function public.prevent_reputation_internal_mutation();
revoke all on function public.prevent_reputation_internal_mutation() from public,anon,authenticated;

create function public.refresh_user_reputation(p_user_id uuid,p_reason text default 'reconciliation') returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_comments integer:=0;v_reactions integer:=0;v_best integer:=0;v_discussions integer:=0;
 v_points integer:=0;v_previous integer:=0;v_comment_points integer;v_reaction_points integer;v_best_points integer;
begin
 if p_user_id is null then return;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,47));
 if not exists(select 1 from public.profiles p where p.id=p_user_id) then return;end if;
 select count(*)::integer,count(*) filter(where c.best_answer)::integer,
        count(distinct coalesce('problem:'||c.problem_id::text,'solution:'||c.solution_id::text))::integer
 into v_comments,v_best,v_discussions from public.comments c
 where c.user_id=p_user_id and not c.deleted and c.visibility='visible';
 select count(*)::integer into v_reactions from public.comment_reactions r join public.comments c on c.id=r.comment_id
 where c.user_id=p_user_id and r.user_id<>p_user_id and r.active and not c.deleted and c.visibility='visible';
 select points into strict v_comment_points from public.reputation_rules where rule_key='active_comment';
 select points into strict v_reaction_points from public.reputation_rules where rule_key='received_reaction';
 select points into strict v_best_points from public.reputation_rules where rule_key='best_answer';
 v_points:=v_comments*v_comment_points+v_reactions*v_reaction_points+v_best*v_best_points;
 select points into v_previous from public.user_reputation where user_id=p_user_id for update;
 if not found then v_previous:=0;end if;
 insert into public.user_reputation(user_id,points,active_comments,reactions_received,best_answers,discussions_participated)
 values(p_user_id,v_points,v_comments,v_reactions,v_best,v_discussions)
 on conflict(user_id) do update set points=excluded.points,active_comments=excluded.active_comments,reactions_received=excluded.reactions_received,best_answers=excluded.best_answers,discussions_participated=excluded.discussions_participated,updated_at=timezone('utc',now());
 insert into public.user_achievements(user_id,achievement_key)
 select p_user_id,k from unnest(array[
   case when v_comments>=1 then 'active_voice' end,
   case when v_reactions>=3 then 'supported_idea' end,
   case when v_best>=1 then 'best_answer' end,
   case when v_discussions>=5 then 'frequent_collaborator' end,
   case when v_points>=250 then 'community_expert' end]) k where k is not null
 on conflict do nothing;
 delete from public.user_achievements a where a.user_id=p_user_id and not (
  (a.achievement_key='active_voice' and v_comments>=1) or (a.achievement_key='supported_idea' and v_reactions>=3) or
  (a.achievement_key='best_answer' and v_best>=1) or (a.achievement_key='frequent_collaborator' and v_discussions>=5) or
  (a.achievement_key='community_expert' and v_points>=250));
 if v_previous<>v_points or p_reason='initial-backfill' then
  insert into public.reputation_audit_log(user_id,reason,previous_points,resulting_points,active_comments,reactions_received,best_answers,discussions_participated)
  values(p_user_id,left(coalesce(nullif(p_reason,''),'reconciliation'),100),v_previous,v_points,v_comments,v_reactions,v_best,v_discussions);
 end if;
end $$;
revoke all on function public.refresh_user_reputation(uuid,text) from public,anon,authenticated;

create function public.sync_reputation_from_comment() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 perform public.refresh_user_reputation(coalesce(new.user_id,old.user_id),'comment-'||lower(tg_op));
 if tg_op='UPDATE' and new.user_id is distinct from old.user_id then perform public.refresh_user_reputation(old.user_id,'comment-update');end if;
 return coalesce(new,old);
end $$;
create trigger sync_reputation_comment after insert or update or delete on public.comments
for each row execute function public.sync_reputation_from_comment();

create function public.sync_reputation_from_reaction() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_new_author uuid;v_old_author uuid;
begin
 if tg_op<>'DELETE' then select user_id into v_new_author from public.comments where id=new.comment_id;end if;
 if tg_op<>'INSERT' then select user_id into v_old_author from public.comments where id=old.comment_id;end if;
 perform public.refresh_user_reputation(coalesce(v_new_author,v_old_author),'reaction-'||lower(tg_op));
 if v_old_author is distinct from v_new_author then perform public.refresh_user_reputation(v_old_author,'reaction-update');end if;
 return coalesce(new,old);
end $$;
create trigger sync_reputation_reaction after insert or update or delete on public.comment_reactions
for each row execute function public.sync_reputation_from_reaction();
revoke all on function public.sync_reputation_from_comment(),public.sync_reputation_from_reaction() from public,anon,authenticated;

create function public.get_public_reputations(p_user_ids uuid[]) returns table(
 user_id uuid,points integer,active_comments integer,reactions_received integer,best_answers integer,discussions_participated integer,achievements jsonb)
language sql stable security definer set search_path=pg_catalog,public as $$
 select r.user_id,r.points,r.active_comments,r.reactions_received,r.best_answers,r.discussions_participated,
  coalesce((select jsonb_agg(jsonb_build_object('key',a.achievement_key,'earnedAt',a.earned_at) order by a.earned_at,a.achievement_key) from public.user_achievements a where a.user_id=r.user_id),'[]'::jsonb)
 from public.user_reputation r where r.user_id=any(coalesce(p_user_ids,array[]::uuid[])) order by r.user_id limit 100;
$$;
create function public.get_my_reputation() returns table(
 user_id uuid,points integer,active_comments integer,reactions_received integer,best_answers integer,discussions_participated integer,achievements jsonb)
language sql stable security definer set search_path=pg_catalog,public as $$
 select * from public.get_public_reputations(array[auth.uid()]);
$$;
revoke all on function public.get_public_reputations(uuid[]),public.get_my_reputation() from public;
grant execute on function public.get_public_reputations(uuid[]) to anon,authenticated;
grant execute on function public.get_my_reputation() to authenticated;

do $$ declare v_user uuid;begin for v_user in select id from public.profiles loop perform public.refresh_user_reputation(v_user,'initial-backfill');end loop;end $$;
commit;
