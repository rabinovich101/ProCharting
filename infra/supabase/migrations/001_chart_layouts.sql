create extension if not exists pgcrypto;

create table if not exists public.chart_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  snapshot jsonb not null,
  schema_version integer not null default 1,
  is_autosave boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chart_layouts_name_not_blank check (length(trim(name)) > 0),
  constraint chart_layouts_name_length check (char_length(name) <= 120),
  constraint chart_layouts_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint chart_layouts_schema_version_positive check (schema_version > 0)
);

create index if not exists chart_layouts_user_updated_idx
  on public.chart_layouts (user_id, updated_at desc);

create unique index if not exists chart_layouts_one_autosave_per_user_idx
  on public.chart_layouts (user_id)
  where is_autosave;

create or replace function public.set_chart_layout_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_chart_layouts_updated_at on public.chart_layouts;

create trigger set_chart_layouts_updated_at
before update on public.chart_layouts
for each row
execute function public.set_chart_layout_updated_at();

alter table public.chart_layouts enable row level security;

grant select, insert, update, delete on public.chart_layouts to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'chart_layouts'
      and policyname = 'chart_layouts_select_own'
  ) then
    create policy chart_layouts_select_own
      on public.chart_layouts
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'chart_layouts'
      and policyname = 'chart_layouts_insert_own'
  ) then
    create policy chart_layouts_insert_own
      on public.chart_layouts
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'chart_layouts'
      and policyname = 'chart_layouts_update_own'
  ) then
    create policy chart_layouts_update_own
      on public.chart_layouts
      for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'chart_layouts'
      and policyname = 'chart_layouts_delete_own'
  ) then
    create policy chart_layouts_delete_own
      on public.chart_layouts
      for delete
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;
