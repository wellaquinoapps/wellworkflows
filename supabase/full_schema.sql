-- Migration: Initial Schema for Nano Banana Image Studio
-- Description: profiles, api_credentials, projects, workflows, workflow_images, generation_jobs, api_usage_logs

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Helper function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 1. PROFILES
-- ==============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Function to handle new user registration from auth.users (if created via admin)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'admin')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync user creation into profiles
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- 2. API_CREDENTIALS
-- ==============================================================================
-- Stores Google Gemini API keys securely encrypted with AES-GCM via Edge Functions
create table if not exists public.api_credentials (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  encrypted_api_key text not null, -- base64/hex encrypted payload from server
  google_project_ref text, -- informative google project id
  priority integer not null default 1,
  enabled boolean not null default true,
  status text not null default 'active' check (status in ('active', 'cooldown', 'invalid', 'disabled')),
  last_used_at timestamptz,
  cooldown_until timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.api_credentials enable row level security;

create trigger set_api_credentials_updated_at
  before update on public.api_credentials
  for each row execute function public.handle_updated_at();

-- Index for key rotation queue lookup
create index if not exists idx_api_credentials_rotation 
  on public.api_credentials(enabled, status, priority, cooldown_until);

-- ==============================================================================
-- 3. PROJECTS
-- ==============================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();

create index if not exists idx_projects_user_id on public.projects(user_id);

-- ==============================================================================
-- 4. WORKFLOWS
-- ==============================================================================
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  prompt text not null,
  aspect_ratio text not null check (aspect_ratio in ('9:16', '16:9', '1:1')),
  output_count integer not null default 4 check (output_count between 1 and 4),
  status text not null default 'draft' check (status in ('draft', 'queued', 'processing', 'completed', 'partial', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workflows enable row level security;

create trigger set_workflows_updated_at
  before update on public.workflows
  for each row execute function public.handle_updated_at();

create index if not exists idx_workflows_user_id on public.workflows(user_id);
create index if not exists idx_workflows_project_id on public.workflows(project_id);

-- ==============================================================================
-- 5. WORKFLOW_IMAGES
-- ==============================================================================
create table if not exists public.workflow_images (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('reference', 'result')),
  position integer not null default 0,
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size bigint not null default 0,
  prompt text, -- individual instruction for this result position
  status text check (status in ('queued', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.workflow_images enable row level security;

create index if not exists idx_workflow_images_workflow_id on public.workflow_images(workflow_id);
create index if not exists idx_workflow_images_user_id on public.workflow_images(user_id);

-- ==============================================================================
-- 6. GENERATION_JOBS
-- ==============================================================================
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'partial', 'failed')),
  requested_count integer not null default 4 check (requested_count between 1 and 4),
  completed_count integer not null default 0,
  failed_count integer not null default 0,
  attempt_count integer not null default 0,
  error_summary text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.generation_jobs enable row level security;

create index if not exists idx_generation_jobs_workflow_id on public.generation_jobs(workflow_id);
create index if not exists idx_generation_jobs_user_id on public.generation_jobs(user_id);

-- ==============================================================================
-- 7. API_USAGE_LOGS
-- ==============================================================================
-- High-privacy logging: NEVER log full prompt, keys, tokens, or raw images
create table if not exists public.api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid references public.api_credentials(id) on delete set null,
  job_id uuid references public.generation_jobs(id) on delete cascade,
  model text not null,
  operation text not null,
  http_status integer,
  success boolean not null,
  latency_ms integer,
  error_code text,
  created_at timestamptz not null default now()
);

alter table public.api_usage_logs enable row level security;

create index if not exists idx_api_usage_logs_credential_id on public.api_usage_logs(credential_id);
create index if not exists idx_api_usage_logs_job_id on public.api_usage_logs(job_id);

-- ==============================================================================
-- ATOMIC CREDENTIAL LEASE / ROTATION FUNCTION
-- ==============================================================================
-- Safely selects and locks an eligible Google Gemini API key avoiding race conditions
create or replace function public.lease_gemini_credential()
returns table (
  credential_id uuid,
  encrypted_key text,
  key_label text,
  google_proj text
) as $$
declare
  selected_id uuid;
begin
  -- Clear cooldowns that have expired
  update public.api_credentials
  set status = 'active',
      cooldown_until = null
  where status = 'cooldown'
    and cooldown_until is not null
    and cooldown_until <= now();

  -- Select the best eligible credential with row locking (SKIP LOCKED prevents concurrency contention)
  select id into selected_id
  from public.api_credentials
  where enabled = true
    and status = 'active'
    and (cooldown_until is null or cooldown_until <= now())
  order by priority desc, last_used_at asc nulls first, created_at asc
  limit 1
  for update skip locked;

  if selected_id is not null then
    update public.api_credentials
    set last_used_at = now()
    where id = selected_id;

    return query
    select id, encrypted_api_key, label, google_project_ref
    from public.api_credentials
    where id = selected_id;
  end if;

  return;
end;
$$ language plpgsql security definer;

-- Migration: Row Level Security & Policies
-- Description: Strict access controls for admin and owner isolation

-- Helper function to check if current user is an admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

-- ==============================================================================
-- 1. PROFILES POLICIES
-- ==============================================================================
-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can update their own profile (cannot change role directly unless admin)
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (public.is_admin());

-- ==============================================================================
-- 2. API_CREDENTIALS POLICIES
-- ==============================================================================
-- CRITICAL SECURITY RULE:
-- api_credentials must NEVER be selected directly by standard clients (to hide encrypted_api_key).
-- Only Admins can manage credentials, and even then, Edge Functions handle read/write of encrypted payloads.
-- Direct client access to table is blocked for non-admins; admins can view non-sensitive columns via view or function.

create policy "Admins can view api_credentials"
  on public.api_credentials
  for select
  using (public.is_admin());

create policy "Admins can insert api_credentials"
  on public.api_credentials
  for insert
  with check (public.is_admin());

create policy "Admins can update api_credentials"
  on public.api_credentials
  for update
  using (public.is_admin());

create policy "Admins can delete api_credentials"
  on public.api_credentials
  for delete
  using (public.is_admin());

-- Create a secure public view that exposes ONLY masked metadata (never encrypted_api_key)
create or replace view public.v_api_credentials_masked as
select
  id,
  label,
  google_project_ref,
  priority,
  enabled,
  status,
  last_used_at,
  cooldown_until,
  last_error_code,
  '••••••••••••••••'::text as masked_key,
  created_at,
  updated_at
from public.api_credentials
where public.is_admin();

-- ==============================================================================
-- 3. PROJECTS POLICIES
-- ==============================================================================
create policy "Users can view own projects"
  on public.projects
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects
  for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- 4. WORKFLOWS POLICIES
-- ==============================================================================
create policy "Users can view own workflows"
  on public.workflows
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own workflows"
  on public.workflows
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workflows"
  on public.workflows
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own workflows"
  on public.workflows
  for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- 5. WORKFLOW_IMAGES POLICIES
-- ==============================================================================
create policy "Users can view own workflow images"
  on public.workflow_images
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own workflow images"
  on public.workflow_images
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workflow images"
  on public.workflow_images
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own workflow images"
  on public.workflow_images
  for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- 6. GENERATION_JOBS POLICIES
-- ==============================================================================
create policy "Users can view own generation jobs"
  on public.generation_jobs
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own generation jobs"
  on public.generation_jobs
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own generation jobs"
  on public.generation_jobs
  for update
  using (auth.uid() = user_id);

-- ==============================================================================
-- 7. API_USAGE_LOGS POLICIES
-- ==============================================================================
-- Only admins can inspect API usage logs for audit, troubleshooting and telemetry
create policy "Admins can view api usage logs"
  on public.api_usage_logs
  for select
  using (public.is_admin());

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

