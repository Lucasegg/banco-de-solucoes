-- Sprint 30: contribution lifecycle, author-only changes, moderation and audit.
-- Additive migration; existing contribution authors and content authors are preserved.
begin;

alter table public.contributions add column if not exists moderation_note text;
alter table public.contribution_audit add column if not exists actor_id uuid references public.profiles(id) on delete set null;
alter table public.contribution_audit add column if not exists reason text;
alter table public.contribution_audit add column if not exists previous_payload jsonb;
alter table public.contribution_audit add column if not exists next_payload jsonb;
alter table public.contribution_audit alter column moderator_id drop not null;

-- Normalize legacy values before replacing constraints, preserving all authored rows.
update public.contributions set status='pending' where status='reviewing';
update public.contributions set contribution_type='other' where contribution_type='general';
update public.contributions set contribution_type='status_update' where contribution_type='update';
alter table public.contributions drop constraint if exists contributions_status_check;
alter table public.contributions add constraint contributions_status_check check (status in ('pending','changes_requested','approved','rejected','withdrawn'));
alter table public.contributions drop constraint if exists contributions_type_check;
alter table public.contributions add constraint contributions_type_check check (contribution_type in ('correction','supplement','status_update','evidence','description_improvement','location','other'));
alter table public.contributions drop constraint if exists contributions_review_fields_check;
alter table public.contributions add constraint contributions_review_fields_check check (
  (status in ('pending','changes_requested','withdrawn') and reviewed_at is null)
  or (status in ('approved','rejected') and reviewed_at is not null and moderator_id is not null)
);
alter table public.contribution_audit drop constraint if exists contribution_audit_action_check;
alter table public.contribution_audit add constraint contribution_audit_action_check check (action in ('created','edited','withdrawn','changes_requested','approved','rejected'));

create index if not exists contributions_target_status_created_idx on public.contributions(status, problem_id, solution_id, created_at desc);
create index if not exists contribution_audit_actor_created_idx on public.contribution_audit(actor_id, created_at desc);

-- Direct writes can only change an author's draft fields; status changes are RPC-only.
drop policy if exists "Authors update editable contributions" on public.contributions;
drop policy if exists "Authors delete editable contributions" on public.contributions;
create policy "Authors update editable contributions" on public.contributions for update to authenticated
 using (user_id=auth.uid() and status in ('pending','changes_requested'))
 with check (user_id=auth.uid() and status in ('pending','changes_requested'));

-- RLS identifies the author; this trigger also prevents an author from changing
-- moderation fields or moving a contribution to a different lifecycle state.
create or replace function public.guard_contribution_author_update_sprint30() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not public.is_contribution_moderator() and auth.uid() is not null then
   if old.user_id <> auth.uid() or new.user_id <> old.user_id or new.status <> old.status
      or new.moderator_id is distinct from old.moderator_id or new.reviewed_at is distinct from old.reviewed_at
      or new.rejection_reason is distinct from old.rejection_reason or new.moderation_note is distinct from old.moderation_note then
     raise exception 'Not authorized' using errcode='42501';
   end if;
 end if;
 return new;
end $$;
drop trigger if exists guard_contribution_author_update_sprint30 on public.contributions;
create trigger guard_contribution_author_update_sprint30 before update on public.contributions for each row execute function public.guard_contribution_author_update_sprint30();
create policy "Authors delete editable contributions" on public.contributions for delete to authenticated
 using (user_id=auth.uid() and status in ('pending','changes_requested'));

create or replace function public.audit_contribution_write_sprint30() returns trigger language plpgsql security definer set search_path=public as $$
declare v_action text; v_owner uuid; v_target text; v_id uuid;
begin
 if tg_op='INSERT' then
   insert into public.contribution_audit(contribution_id,actor_id,action,next_payload) values(new.id,new.user_id,'created',new.payload);
   if new.problem_id is not null then select author_id into v_owner from public.problems where id=new.problem_id; v_target:='problem'; v_id:=new.problem_id; else select author_id into v_owner from public.solutions where id=new.solution_id; v_target:='solution'; v_id:=new.solution_id; end if;
   perform public.create_notification(v_owner,'contribution.received','Nova contribuição','Seu conteúdo recebeu uma contribuição para análise.',v_target,v_id,'/'||v_target||'s/'||v_id,jsonb_build_object('contribution_id',new.id),new.user_id);
 elsif tg_op='UPDATE' and old.status is distinct from new.status then
   v_action:=new.status;
   insert into public.contribution_audit(contribution_id,moderator_id,actor_id,action,reason,previous_payload,next_payload) values(new.id,new.moderator_id,case when new.status='withdrawn' then new.user_id else auth.uid() end,v_action,coalesce(new.rejection_reason,new.moderation_note),old.payload,new.payload);
 else
   insert into public.contribution_audit(contribution_id,actor_id,action,previous_payload,next_payload) values(new.id,auth.uid(),'edited',old.payload,new.payload);
 end if;
 return new;
end $$;
drop trigger if exists audit_contribution_write_sprint30 on public.contributions;
create trigger audit_contribution_write_sprint30 after insert or update on public.contributions for each row execute function public.audit_contribution_write_sprint30();

create or replace function public.withdraw_contribution(p_contribution_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
 update public.contributions set status='withdrawn', rejection_reason=null, moderation_note=null, moderator_id=null, reviewed_at=null
 where id=p_contribution_id and user_id=auth.uid() and status in ('pending','changes_requested');
 if not found then raise exception 'Unable to withdraw contribution' using errcode='42501'; end if;
end $$;

create or replace function public.review_contribution(p_contribution_id uuid, p_status text, p_rejection_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare c public.contributions%rowtype; change jsonb; column_name text; proposed jsonb; v_reason text:=nullif(trim(coalesce(p_rejection_reason,'')), ''); v_owner uuid; v_kind text; v_target uuid;
begin
 if auth.uid() is null or not public.is_contribution_moderator() then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_contribution_id is null or p_status not in ('approved','rejected','changes_requested') then raise exception 'Invalid input' using errcode='22023'; end if;
 if p_status in ('rejected','changes_requested') and v_reason is null then raise exception 'A reason is required' using errcode='22023'; end if;
 select * into c from public.contributions where id=p_contribution_id for update;
 if not found or c.status not in ('pending','changes_requested') then raise exception 'Unable to review contribution' using errcode='22023'; end if;
 if p_status='approved' then
  for change in select value from jsonb_array_elements(c.payload->'changes') loop
   column_name:=case change->>'field' when 'title' then 'title' when 'summary' then 'summary' when 'description' then 'description' when 'category' then 'category' when 'status' then 'status' when 'tags' then 'tags' when 'image' then 'image_url' when 'organization' then 'organization' when 'impactMetric' then 'impact_metric' when 'evidenceLinks' then 'evidence_links' else null end;
   if column_name is null then raise exception 'Invalid input' using errcode='22023'; end if; proposed:=change->'proposedValue';
   if c.problem_id is not null then
    if column_name not in ('title','summary','description','category','status','tags','image_url') then raise exception 'Invalid input' using errcode='22023'; end if;
    if column_name='tags' then execute format('update public.problems set %I=$1,updated_at=timezone(''utc'',now()) where id=$2',column_name) using array(select jsonb_array_elements_text(proposed)),c.problem_id; else execute format('update public.problems set %I=$1,updated_at=timezone(''utc'',now()) where id=$2',column_name) using proposed#>>'{}',c.problem_id; end if;
   else
    if column_name not in ('title','summary','description','category','status','tags','image_url','organization','impact_metric','evidence_links') then raise exception 'Invalid input' using errcode='22023'; end if;
    if column_name in ('tags','evidence_links') then execute format('update public.solutions set %I=$1,updated_at=timezone(''utc'',now()) where id=$2',column_name) using array(select jsonb_array_elements_text(proposed)),c.solution_id; else execute format('update public.solutions set %I=$1,updated_at=timezone(''utc'',now()) where id=$2',column_name) using proposed#>>'{}',c.solution_id; end if;
   end if;
  end loop;
 end if;
 update public.contributions set status=p_status,moderator_id=auth.uid(),rejection_reason=case when p_status='rejected' then v_reason else null end,moderation_note=case when p_status='changes_requested' then v_reason else null end,reviewed_at=case when p_status in ('approved','rejected') then timezone('utc',now()) else null end where id=c.id;
 if c.problem_id is not null then select author_id into v_owner from public.problems where id=c.problem_id; v_kind:='problem';v_target:=c.problem_id; else select author_id into v_owner from public.solutions where id=c.solution_id;v_kind:='solution';v_target:=c.solution_id; end if;
 perform public.create_notification(c.user_id,'contribution.'||p_status,case p_status when 'approved' then 'Contribuição aprovada' when 'rejected' then 'Contribuição rejeitada' else 'Ajustes solicitados' end,case p_status when 'approved' then 'Sua contribuição foi aprovada e aplicada.' when 'rejected' then 'Sua contribuição não foi aprovada. Consulte os detalhes.' else 'Foram solicitados ajustes na sua contribuição.' end,'contribution',c.id,'/contributions/'||c.id,jsonb_build_object('status',p_status),auth.uid());
 if p_status='approved' then perform public.create_notification(v_owner,'contribution.approved','Contribuição aprovada','Uma contribuição para seu conteúdo foi aprovada.',v_kind,v_target,'/'||v_kind||'s/'||v_target,jsonb_build_object('contribution_id',c.id),auth.uid()); end if;
end $$;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check(type in ('contribution.received','contribution.approved','contribution.rejected','contribution.changes_requested','comment.created','comment.replied','comment.reacted','favorite.content_updated','user.role_changed'));
drop trigger if exists notify_contribution_review_sprint23 on public.contributions;
-- Fixed signature justification: both RPCs are created in this migration before grants are set.
revoke all on function public.withdraw_contribution(uuid),public.review_contribution(uuid,text,text) from public,anon;
grant execute on function public.withdraw_contribution(uuid),public.review_contribution(uuid,text,text) to authenticated;
commit;
