-- Bound each account's writable surface. RLS isolates owners, while these
-- constraints prevent an authenticated account from filling the database with
-- arbitrary keys or unbounded JSON payloads.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.voxa_user_data'::regclass
      and conname = 'voxa_user_data_allowed_key'
  ) then
    alter table public.voxa_user_data
      add constraint voxa_user_data_allowed_key
      check (
        key = any (array[
          'voxa-style',
          'voxa-phrases',
          'voxa-history',
          'voxa-icons',
          'voxa-animations',
          'voxa-size',
          'voxa-tts',
          'voxa-auto-speak',
          'voxa-voice',
          'voxa-language',
          'voxa-routines',
          'voxa-conversation',
          'voxa-custom'
        ])
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.voxa_user_data'::regclass
      and conname = 'voxa_user_data_value_size'
  ) then
    alter table public.voxa_user_data
      add constraint voxa_user_data_value_size
      check (pg_column_size(value) <= 2097152) not valid;
  end if;
end;
$$;

alter table public.voxa_user_data
  validate constraint voxa_user_data_allowed_key;

alter table public.voxa_user_data
  validate constraint voxa_user_data_value_size;

-- The quota state is deliberately outside the exposed public schema. The only
-- interface is the narrowly scoped authenticated RPC below.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.generation_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('minute', 'day')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, period)
);

alter table private.generation_rate_limits enable row level security;
alter table private.generation_rate_limits force row level security;
revoke all on table private.generation_rate_limits from public, anon, authenticated;

create or replace function public.consume_generation_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  current_count integer;
  current_window timestamptz;
begin
  if caller_id is null then
    return false;
  end if;

  current_window := date_trunc('minute', statement_timestamp());
  insert into private.generation_rate_limits as limits
    (user_id, period, window_started_at, request_count)
  values (caller_id, 'minute', current_window, 1)
  on conflict (user_id, period) do update
  set window_started_at = case
        when limits.window_started_at < excluded.window_started_at then excluded.window_started_at
        else limits.window_started_at
      end,
      request_count = case
        when limits.window_started_at < excluded.window_started_at then 1
        else limits.request_count + 1
      end
  returning request_count into current_count;

  if current_count > 20 then
    return false;
  end if;

  current_window := date_trunc('day', statement_timestamp());
  insert into private.generation_rate_limits as limits
    (user_id, period, window_started_at, request_count)
  values (caller_id, 'day', current_window, 1)
  on conflict (user_id, period) do update
  set window_started_at = case
        when limits.window_started_at < excluded.window_started_at then excluded.window_started_at
        else limits.window_started_at
      end,
      request_count = case
        when limits.window_started_at < excluded.window_started_at then 1
        else limits.request_count + 1
      end
  returning request_count into current_count;

  return current_count <= 200;
end;
$$;

revoke all on function public.consume_generation_quota() from public, anon;
grant execute on function public.consume_generation_quota() to authenticated;
