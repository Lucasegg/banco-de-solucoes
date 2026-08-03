-- Sprint 48: privacy-enforced, aggregate public member portfolio.
begin;

-- Opt-in: adding the column with false keeps every existing member private.
alter table public.profiles add column if not exists public_profile boolean default false;
update public.profiles set public_profile=false where public_profile is null;
alter table public.profiles alter column public_profile set default false;
alter table public.profiles alter column public_profile set not null;
comment on column public.profiles.public_profile is 'Server-enforced opt-in for the username public portfolio; false for existing and new profiles until explicitly enabled.';
create index if not exists profiles_public_username_idx on public.profiles(lower(username)) where public_profile and username is not null;

create or replace function public.get_public_member_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare v_username text; v_profile public.profiles%rowtype; v_result jsonb;
begin
  v_username:=lower(btrim(coalesce(p_username,'')));
  if char_length(v_username) not between 3 and 30 or v_username !~ '^[a-z0-9._-]+$' then return jsonb_build_object('status','not_found');end if;
  select p.* into v_profile from public.profiles p where lower(p.username)=v_username;
  if not found or not v_profile.public_profile then return jsonb_build_object('status','not_found');end if;

  with public_comments as (
    select c.* from public.comments c where c.user_id=v_profile.id and not c.deleted and c.visibility='visible'
      and ((c.problem_id is not null and exists(select 1 from public.problems p where p.id=c.problem_id and p.status in ('Reportado','Em análise','Em vistoria','Planejado','Licitado','Em execução','Parcialmente resolvido','Resolvido','Reaberto')))
        or (c.solution_id is not null and exists(select 1 from public.solutions s where s.id=c.solution_id and s.status in ('Proposta','Em teste','Implementada','Validada'))))
  ), metrics as (
    select count(*)::integer comments,
      count(*) filter(where c.best_answer)::integer best_answers,
      count(distinct coalesce('problem:'||c.problem_id::text,'solution:'||c.solution_id::text))::integer discussions,
      (select count(*)::integer from public.comment_reactions cr join public_comments pc on pc.id=cr.comment_id where cr.active and cr.user_id<>v_profile.id) reactions
    from public_comments c
  ), totals as (
    select m.*,m.comments*5+m.reactions*2+m.best_answers*25 reputation,
      (select count(*)::integer from public.problems p where p.author_id=v_profile.id and p.status in ('Reportado','Em análise','Em vistoria','Planejado','Licitado','Em execução','Parcialmente resolvido','Resolvido','Reaberto')) problems,
      (select count(*)::integer from public.solutions s where s.author_id=v_profile.id and s.status in ('Proposta','Em teste','Implementada','Validada')) solutions,
      (select count(*)::integer from public.contributions c where c.user_id=v_profile.id and c.status='approved' and c.reviewed_at is not null
        and ((c.problem_id is not null and exists(select 1 from public.problems p where p.id=c.problem_id and p.status in ('Reportado','Em análise','Em vistoria','Planejado','Licitado','Em execução','Parcialmente resolvido','Resolvido','Reaberto')))
          or (c.solution_id is not null and exists(select 1 from public.solutions s where s.id=c.solution_id and s.status in ('Proposta','Em teste','Implementada','Validada'))))) approved_contributions
    from metrics m
  )
  select jsonb_build_object('status','public','profile',jsonb_build_object(
    'userId',v_profile.id,'username',v_profile.username,'displayName',v_profile.display_name,'avatarUrl',v_profile.avatar_url,
    'bio',v_profile.bio,'organization',v_profile.organization,'city',v_profile.city,'state',v_profile.state,'country',v_profile.country,
    'website',v_profile.website,'role',v_profile.role,'joinedAt',v_profile.created_at,
    'metrics',jsonb_build_object('reputation',t.reputation,'comments',t.comments,'discussions',t.discussions,'reactionsReceived',t.reactions,
      'bestAnswers',t.best_answers,'problems',t.problems,'solutions',t.solutions,'approvedContributions',t.approved_contributions),
    'achievements',coalesce((select jsonb_agg(jsonb_build_object('key',a.achievement_key,'earnedAt',a.earned_at) order by a.earned_at desc,a.achievement_key)
      from public.user_achievements a where a.user_id=v_profile.id and ((a.achievement_key='active_voice' and t.comments>=1)
       or (a.achievement_key='supported_idea' and t.reactions>=3) or (a.achievement_key='best_answer' and t.best_answers>=1)
       or (a.achievement_key='frequent_collaborator' and t.discussions>=5) or (a.achievement_key='community_expert' and t.reputation>=250))),'[]'::jsonb),
    'activity',coalesce((select jsonb_agg(item order by occurred_at desc,kind,id) from (
      select 'problem'::text kind,p.id,p.title,p.created_at occurred_at,'problem'::text target_kind,p.id target_id from public.problems p where p.author_id=v_profile.id and p.status in ('Reportado','Em análise','Em vistoria','Planejado','Licitado','Em execução','Parcialmente resolvido','Resolvido','Reaberto')
      union all select 'solution',s.id,s.title,s.created_at,'solution',s.id from public.solutions s where s.author_id=v_profile.id and s.status in ('Proposta','Em teste','Implementada','Validada')
      union all select 'comment',c.id,left(c.content,160),c.created_at,case when c.problem_id is not null then 'problem' else 'solution' end,coalesce(c.problem_id,c.solution_id) from public_comments c
      union all select 'contribution',c.id,coalesce(c.payload->>'title',c.payload->>'summary',''),c.reviewed_at,case when c.problem_id is not null then 'problem' else 'solution' end,coalesce(c.problem_id,c.solution_id)
        from public.contributions c where c.user_id=v_profile.id and c.status='approved' and c.reviewed_at is not null
        and ((c.problem_id is not null and exists(select 1 from public.problems p where p.id=c.problem_id and p.status in ('Reportado','Em análise','Em vistoria','Planejado','Licitado','Em execução','Parcialmente resolvido','Resolvido','Reaberto'))) or (c.solution_id is not null and exists(select 1 from public.solutions s where s.id=c.solution_id and s.status in ('Proposta','Em teste','Implementada','Validada'))))
      order by occurred_at desc,kind,id limit 20) recent item),'[]'::jsonb))) into v_result from totals t;
  return v_result;
end $$;

revoke all on function public.get_public_member_profile(text) from public;
grant execute on function public.get_public_member_profile(text) to anon,authenticated;
revoke insert,delete on table public.profiles from anon,authenticated;
revoke update(public_profile) on table public.profiles from anon;
commit;
