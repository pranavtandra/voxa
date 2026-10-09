-- Normalize independently-created records so concurrent devices cannot replace
-- an entire collection with an older copy. Existing voxa_user_data rows remain
-- untouched as a rollback source.
create table if not exists public.voxa_history_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  spoken_text text not null check (char_length(spoken_text) between 1 and 1000),
  category text not null default 'Communicate' check (char_length(category) between 1 and 80),
  display_time text not null check (char_length(display_time) between 1 and 40),
  activity_date date not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists voxa_history_entries_user_timeline_idx
  on public.voxa_history_entries (user_id, occurred_at desc, id desc);

create table if not exists public.voxa_custom_buttons (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  emoji text not null default '✨' check (char_length(emoji) between 1 and 32),
  category text not null check (char_length(category) between 1 and 80),
  phrase text check (phrase is null or char_length(phrase) <= 500),
  image_path text check (image_path is null or char_length(image_path) <= 500),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  action jsonb,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voxa_custom_buttons_user_order_idx
  on public.voxa_custom_buttons (user_id, position, id);

alter table public.voxa_history_entries enable row level security;
alter table public.voxa_history_entries force row level security;
alter table public.voxa_custom_buttons enable row level security;
alter table public.voxa_custom_buttons force row level security;

revoke all on table public.voxa_history_entries from public, anon, authenticated;
revoke all on table public.voxa_custom_buttons from public, anon, authenticated;
grant select, insert, update, delete on table public.voxa_history_entries to authenticated;
grant select, insert, update, delete on table public.voxa_custom_buttons to authenticated;

drop policy if exists "Users manage their own history" on public.voxa_history_entries;
create policy "Users manage their own history"
on public.voxa_history_entries for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own custom buttons" on public.voxa_custom_buttons;
create policy "Users manage their own custom buttons"
on public.voxa_custom_buttons for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Copy valid legacy history records. Invalid or absent legacy UUIDs receive a
-- stable UUID for this one-time migration. Replaying the migration is safe.
insert into public.voxa_history_entries
  (id, user_id, spoken_text, category, display_time, activity_date, occurred_at)
select
  case
    when item.value->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (item.value->>'id')::uuid
    else gen_random_uuid()
  end,
  source.user_id,
  left(item.value->>'text', 1000),
  left(coalesce(nullif(item.value->>'category', ''), 'Communicate'), 80),
  left(coalesce(nullif(item.value->>'time', ''), 'Earlier'), 40),
  case
    when item.value->>'date' ~ '^\d{4}-\d{2}-\d{2}$' then (item.value->>'date')::date
    else current_date
  end,
  statement_timestamp() - (item.ordinality * interval '1 millisecond')
from public.voxa_user_data as source
cross join lateral jsonb_array_elements(source.value) with ordinality as item(value, ordinality)
where source.key = 'voxa-history'
  and jsonb_typeof(source.value) = 'array'
  and nullif(item.value->>'text', '') is not null
on conflict (id) do nothing;

insert into public.voxa_custom_buttons
  (id, user_id, label, emoji, category, phrase, image_path, position)
select
  case
    when item.value->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (item.value->>'id')::uuid
    else gen_random_uuid()
  end,
  source.user_id,
  left(item.value->>'label', 120),
  left(coalesce(nullif(item.value->>'emoji', ''), '✨'), 32),
  left(coalesce(nullif(item.value->>'category', ''), 'custom'), 80),
  left(nullif(item.value->>'phrase', ''), 500),
  left(nullif(item.value->>'imagePath', ''), 500),
  greatest(item.ordinality::integer - 1, 0)
from public.voxa_user_data as source
cross join lateral jsonb_array_elements(source.value) with ordinality as item(value, ordinality)
where source.key = 'voxa-custom'
  and jsonb_typeof(source.value) = 'array'
  and nullif(item.value->>'label', '') is not null
on conflict (id) do nothing;
