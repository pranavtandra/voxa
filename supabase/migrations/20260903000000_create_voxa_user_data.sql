create table if not exists public.voxa_user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (char_length(key) between 1 and 80),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.voxa_user_data enable row level security;

revoke all on table public.voxa_user_data from anon;
grant select, insert, update, delete on table public.voxa_user_data to authenticated;

create policy "Users can read their own Voxa data"
on public.voxa_user_data for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own Voxa data"
on public.voxa_user_data for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own Voxa data"
on public.voxa_user_data for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own Voxa data"
on public.voxa_user_data for delete
to authenticated
using ((select auth.uid()) = user_id);
