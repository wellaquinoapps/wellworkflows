-- Migration: Storage Buckets and Access Policies
-- Buckets: image-references, image-results (Strictly Private)

-- 1. Insert buckets if they don't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('image-references', 'image-references', false, 15728640, array['image/jpeg', 'image/png', 'image/webp']),
  ('image-results', 'image-results', false, 20971520, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ==============================================================================
-- Storage RLS Policies
-- Files are organized by path: `{user_id}/{workflow_id}/{file_name}`
-- ==============================================================================

-- 2. image-references Policies
create policy "Users can upload their own reference images"
  on storage.objects for insert
  with check (
    bucket_id = 'image-references' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read their own reference images"
  on storage.objects for select
  using (
    bucket_id = 'image-references' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own reference images"
  on storage.objects for update
  using (
    bucket_id = 'image-references' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own reference images"
  on storage.objects for delete
  using (
    bucket_id = 'image-references' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. image-results Policies
-- Users can read and delete results. Inserts are typically executed by Edge Functions with service role,
-- but owner check is supported as well.
create policy "Users can read their own result images"
  on storage.objects for select
  using (
    bucket_id = 'image-results' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own result images"
  on storage.objects for delete
  using (
    bucket_id = 'image-results' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

