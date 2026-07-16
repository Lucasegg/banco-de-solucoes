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
