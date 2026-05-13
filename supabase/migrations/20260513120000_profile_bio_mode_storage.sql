alter table public.profiles
add column if not exists bio text,
add column if not exists preferred_mode text check (preferred_mode is null or preferred_mode in ('chat', 'vocale'));

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = excluded.public;

create policy "profile photos are publicly readable"
on storage.objects for select
using (bucket_id = 'profile-photos');

create policy "users can upload their own profile photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "users can update their own profile photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
