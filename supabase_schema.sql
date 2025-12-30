-- Run in Supabase SQL editor
-- 1) Table
create extension if not exists pgcrypto;

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),

  -- Short public code used in URLs: /s/{short_code}
  -- We intentionally allow reuse after expiry, so we don't add a global unique constraint.
  short_code smallint not null check (short_code between 1 and 100),

  -- Internal token to avoid storage path collisions (not shown to users)
  token uuid not null default gen_random_uuid(),

  kind text not null check (kind in ('text', 'file')),
  text_content text,
  file_path text,
  file_name text,
  content_type text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists shares_short_code_idx on public.shares(short_code);
create index if not exists shares_token_idx on public.shares(token);
create index if not exists shares_expires_at_idx on public.shares(expires_at);

-- Optional: one-time view support
-- when a share is viewed you can set consumed_at, and treat consumed shares as invalid.

-- 2) Enable RLS (optional for this app; app uses service role server-side)
alter table public.shares enable row level security;

-- If you later want to allow anon reads with a token, you can add a policy like:
-- create policy "anon read by token" on public.shares
-- for select to anon
-- using (token is not null and expires_at > now() and consumed_at is null);

-- 3) Storage bucket
-- Create a bucket named: shares
-- You can do it via Dashboard (Storage) or SQL:
-- insert into storage.buckets (id, name, public)
-- values ('shares', 'shares', false)
-- on conflict (id) do nothing;

-- For service-role-only access, you don't need storage policies.
