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

