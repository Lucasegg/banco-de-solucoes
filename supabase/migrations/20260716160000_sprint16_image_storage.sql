-- Sprint 16: upload universal de imagens.
-- Buckets públicos para leitura em páginas públicas; escrita somente autenticada nas pastas auth.uid().
-- Limite documentado e validado também no app: JPEG/PNG/WebP até 5 MB. SVG não permitido.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('problem-images', 'problem-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('solution-images', 'solution-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read image buckets" on storage.objects;
drop policy if exists "Authenticated users upload own images" on storage.objects;
drop policy if exists "Authenticated users update own images" on storage.objects;
drop policy if exists "Authenticated users delete own images" on storage.objects;

create policy "Public read image buckets" on storage.objects for select using (bucket_id in ('avatars', 'problem-images', 'solution-images'));

create policy "Authenticated users upload own images" on storage.objects for insert to authenticated with check (
  bucket_id in ('avatars', 'problem-images', 'solution-images')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users update own images" on storage.objects for update to authenticated using (
  bucket_id in ('avatars', 'problem-images', 'solution-images')
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id in ('avatars', 'problem-images', 'solution-images')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users delete own images" on storage.objects for delete to authenticated using (
  bucket_id in ('avatars', 'problem-images', 'solution-images')
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- Sprint 16 updates Sprint 15 profile self-update protection: avatar_url is an editable public field.
drop trigger if exists prevent_profile_immutable_self_change_before_update on public.profiles;
create or replace function public.prevent_profile_immutable_self_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() = old.id and (
    new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Users cannot change administrative profile fields' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger prevent_profile_immutable_self_change_before_update
before update on public.profiles
for each row execute function public.prevent_profile_immutable_self_change();

comment on function public.prevent_profile_immutable_self_change() is 'Blocks authenticated users from changing immutable/administrative profile fields id, role and created_at while allowing avatar_url edits through the authenticated profile flow.';
