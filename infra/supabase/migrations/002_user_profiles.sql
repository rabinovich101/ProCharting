create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_display_name_not_blank
    check (display_name is null or length(trim(display_name)) > 0),
  constraint user_profiles_display_name_length
    check (display_name is null or char_length(display_name) <= 80),
  constraint user_profiles_avatar_url_length
    check (avatar_url is null or char_length(avatar_url) <= 2048)
);

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();

create or replace function public.create_user_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_display_name text;
  profile_avatar_url text;
begin
  profile_display_name := nullif(left(trim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    ''
  )), 80), '');

  profile_avatar_url := nullif(left(trim(coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture',
    ''
  )), 2048), '');

  insert into public.user_profiles (user_id, display_name, avatar_url)
  values (new.id, profile_display_name, profile_avatar_url)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_user_profile_on_signup on auth.users;

create trigger create_user_profile_on_signup
after insert on auth.users
for each row
execute function public.create_user_profile_for_new_auth_user();

insert into public.user_profiles (user_id, display_name, avatar_url)
select
  users.id,
  nullif(left(trim(coalesce(
    users.raw_user_meta_data ->> 'display_name',
    users.raw_user_meta_data ->> 'name',
    users.raw_user_meta_data ->> 'full_name',
    ''
  )), 80), '') as display_name,
  nullif(left(trim(coalesce(
    users.raw_user_meta_data ->> 'avatar_url',
    users.raw_user_meta_data ->> 'picture',
    ''
  )), 2048), '') as avatar_url
from auth.users
on conflict (user_id) do nothing;

alter table public.user_profiles enable row level security;

grant select, insert, update on public.user_profiles to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_select_own'
  ) then
    create policy user_profiles_select_own
      on public.user_profiles
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_insert_own'
  ) then
    create policy user_profiles_insert_own
      on public.user_profiles
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_update_own'
  ) then
    create policy user_profiles_update_own
      on public.user_profiles
      for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;
