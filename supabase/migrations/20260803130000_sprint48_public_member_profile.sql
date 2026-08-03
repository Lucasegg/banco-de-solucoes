-- Sprint 48: privacy-enforced, aggregate public member portfolio.
begin;

alter table public.profiles add column if not exists public_profile boolean not null default true;
comment on column public.profiles.public_profile is 'Server-enforced opt-in for the username public portfolio.';

create index if not exists profiles_public_username_idx on public.profiles(lower(username)) where public_profile and username is not null;

create or replace function public.get_public_member_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare v_username text; v_profile public.profiles%rowtype; v_result jsonb;
begin
  v_username:=lower(btrim(coalesce(p_username,'')));
  if char_length(v_username) not between 3 and 30 or v_username !~ '^[a-z0-9._-]+$' then
    return jsonb_build_object('status','not_found');
  end if;
  select p.* into v_profile from public.profiles p where lower(p.username)=v_username;
  if not found then return jsonb_build_object('status','not_found'); end if;
  -- Deliberately identical to an unknown username to avoid disclosing membership.
  if not v_profile.public_profile then return jsonb_build_object('status','not_found'); end if;

  select jsonb_build_object(
    'status','public','profile',jsonb_build_object(
      'userId',v_profile.id,'username',v_profile.username,'displayName',v_profile.display_name,
      'avatarUrl',v_profile.avatar_url,'bio',v_profile.bio,'organization',v_profile.organization,
      'city',v_profile.city,'state',v_profile.state,'country',v_profile.country,
      'website',v_profile.website,'role',v_profile.role,'joinedAt',v_profile.created_at,
      'metrics',jsonb_build_object(
        'reputation',coalesce(r.points,0),'comments',coalesce(r.active_comments,0),
        'discussions',coalesce(r.discussions_participated,0),'reactionsReceived',coalesce(r.reactions_received,0),
        'bestAnswers',coalesce(r.best_answers,0),
        'problems',(select count(*) from public.problems x where x.author_id=v_profile.id),
        'solutions',(select count(*) from public.solutions x where x.author_id=v_profile.id),
        'approvedContributions',(select count(*) from public.contributions x where x.user_id=v_profile.id and x.status='approved')
      ),
      'achievements',coalesce((select jsonb_agg(jsonb_build_object('key',a.achievement_key,'earnedAt',a.earned_at) order by a.earned_at desc,a.achievement_key) from public.user_achievements a where a.user_id=v_profile.id),'[]'::jsonb),
      'activity',coalesce((select jsonb_agg(item order by occurred_at desc,kind,id) from (
        select 'problem'::text kind,p.id,p.title,p.created_at occurred_at from public.problems p where p.author_id=v_profile.id
        union all select 'solution',s.id,s.title,s.created_at from public.solutions s where s.author_id=v_profile.id
        union all select 'comment',c.id,left(c.content,160),c.created_at from public.comments c where c.user_id=v_profile.id and not c.deleted and c.visibility='visible'
        union all select 'contribution',c.id,coalesce(c.payload->>'title',c.payload->>'summary',''),c.reviewed_at from public.contributions c where c.user_id=v_profile.id and c.status='approved'
        order by occurred_at desc,kind,id limit 20
      ) recent),'[]'::jsonb)
    )) into v_result from (select 1) seed left join public.user_reputation r on r.user_id=v_profile.id;
  return v_result;
end $$;

revoke all on function public.get_public_member_profile(text) from public;
grant execute on function public.get_public_member_profile(text) to anon,authenticated;
revoke insert,delete on table public.profiles from anon,authenticated;
revoke update(public_profile) on table public.profiles from anon;

commit;
