-- The slice of the production schema that the badge migration reads, for tests in PGlite.
-- Column names and types follow supabase/schema.sql; RLS policies and unrelated columns are left out.
-- Supabase's auth.uid() reads the signed-in user from request.jwt.claim.sub, as it does here.

create role anon;
create role authenticated;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create schema private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_path text,
  banner_path text,
  follower_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  slug text not null,
  classification text not null default 'game',
  published boolean not null default true,
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.project_likes (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.profile_follows (
  creator_id uuid not null references public.profiles (id) on delete cascade,
  follower_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (creator_id, follower_id),
  constraint profile_follows_no_self check (creator_id <> follower_id)
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table public.project_curation (
  project_id uuid primary key references public.projects (id) on delete cascade,
  status text not null default 'listed',
  creator_name text not null default 'Someone',
  license text not null default 'MIT',
  claimed_at timestamptz,
  constraint project_curation_status_check check (status in ('listed', 'claim_pending', 'claimed'))
);

create function public.curated_owner_id() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where handle = 'listed';
$$;
