-- Keep all account data owner-scoped, even if table grants drift later.
alter table public.voxa_user_data enable row level security;
alter table public.voxa_user_data force row level security;

revoke all on table public.voxa_user_data from anon, authenticated;
grant select, insert, update, delete on table public.voxa_user_data to authenticated;

drop policy if exists "Users can read their own Voxa data" on public.voxa_user_data;
drop policy if exists "Users can add their own Voxa data" on public.voxa_user_data;
drop policy if exists "Users can update their own Voxa data" on public.voxa_user_data;
drop policy if exists "Users can delete their own Voxa data" on public.voxa_user_data;

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

-- Voxa media is private. Object names must begin with the authenticated user's UUID.
update storage.buckets set public = false where public = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voxa-user-media',
  'voxa-user-media',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own Voxa media" on storage.objects;
drop policy if exists "Users can upload their own Voxa media" on storage.objects;
drop policy if exists "Users can update their own Voxa media" on storage.objects;
drop policy if exists "Users can delete their own Voxa media" on storage.objects;

create policy "Users can read their own Voxa media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'voxa-user-media'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can upload their own Voxa media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'voxa-user-media'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can update their own Voxa media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'voxa-user-media'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'voxa-user-media'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete their own Voxa media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'voxa-user-media'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

