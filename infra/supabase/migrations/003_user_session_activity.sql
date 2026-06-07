create table if not exists public.user_session_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id text not null,
  fingerprint_hash text not null,
  fingerprint_version text not null default 'local-device-id-v1',
  login_ip_address inet,
  last_ip_address inet,
  ip_source text,
  user_agent text,
  browser_context jsonb not null default '{}'::jsonb,
  sign_in_count integer not null default 0,
  signed_in_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  signed_out_at timestamptz,
  last_event_type text not null default 'session_seen',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_session_activity_unique_session_fingerprint
    unique (user_id, auth_session_id, fingerprint_hash),
  constraint user_session_activity_auth_session_id_not_blank
    check (length(trim(auth_session_id)) > 0),
  constraint user_session_activity_auth_session_id_length
    check (char_length(auth_session_id) <= 200),
  constraint user_session_activity_fingerprint_hash_format
    check (fingerprint_hash ~ '^[a-f0-9]{64}$'),
  constraint user_session_activity_fingerprint_version_length
    check (char_length(fingerprint_version) <= 80),
  constraint user_session_activity_ip_source_length
    check (ip_source is null or char_length(ip_source) <= 80),
  constraint user_session_activity_user_agent_length
    check (user_agent is null or char_length(user_agent) <= 512),
  constraint user_session_activity_browser_context_object
    check (jsonb_typeof(browser_context) = 'object'),
  constraint user_session_activity_sign_in_count_non_negative
    check (sign_in_count >= 0),
  constraint user_session_activity_event_type
    check (last_event_type in ('session_seen', 'sign_in', 'sign_up', 'token_refreshed', 'sign_out'))
);

create index if not exists user_session_activity_user_seen_idx
  on public.user_session_activity (user_id, last_seen_at desc);

create index if not exists user_session_activity_fingerprint_seen_idx
  on public.user_session_activity (fingerprint_hash, last_seen_at desc);

create or replace function public.set_user_session_activity_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_session_activity_updated_at on public.user_session_activity;

create trigger set_user_session_activity_updated_at
before update on public.user_session_activity
for each row
execute function public.set_user_session_activity_updated_at();

alter table public.user_session_activity enable row level security;

revoke all on public.user_session_activity from anon;
revoke all on public.user_session_activity from authenticated;
grant select, insert, update, delete on public.user_session_activity to service_role;
