-- WorkoutStudio SaaS database setup
-- Run this in Supabase SQL Editor for the project connected to the app.

create table if not exists public.workoutstudio_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  updated_at timestamptz not null default now()
);

create table if not exists public.workoutstudio_workouts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.workoutstudio_custom_activities (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.workoutstudio_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.workoutstudio_profiles enable row level security;
alter table public.workoutstudio_workouts enable row level security;
alter table public.workoutstudio_custom_activities enable row level security;
alter table public.workoutstudio_sessions enable row level security;

drop policy if exists "Users manage their own profile" on public.workoutstudio_profiles;
create policy "Users manage their own profile"
on public.workoutstudio_profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users manage their own workouts" on public.workoutstudio_workouts;
create policy "Users manage their own workouts"
on public.workoutstudio_workouts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their own custom activities" on public.workoutstudio_custom_activities;
create policy "Users manage their own custom activities"
on public.workoutstudio_custom_activities
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their own sessions" on public.workoutstudio_sessions;
create policy "Users manage their own sessions"
on public.workoutstudio_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists workoutstudio_workouts_user_id_idx
  on public.workoutstudio_workouts(user_id);

create index if not exists workoutstudio_custom_activities_user_id_idx
  on public.workoutstudio_custom_activities(user_id);

create index if not exists workoutstudio_sessions_user_id_idx
  on public.workoutstudio_sessions(user_id);
