create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New player',
  age int check (age >= 18 and age <= 99),
  gender text,
  city text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  avatar_color text not null default 'from-rose-500 to-pink-500',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "users can insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'New player')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.events
add column if not exists host_id uuid references auth.users(id) on delete set null,
add column if not exists invited_profile_ids uuid[] not null default '{}';

drop policy if exists "anyone can create events (prototype)" on public.events;

create policy "authenticated users can create own events"
on public.events for insert
to authenticated
with check (host_id = auth.uid());

create or replace function public.nearby_profiles(
  origin_lat double precision,
  origin_lng double precision,
  radius_km double precision default 50
)
returns table (
  id uuid,
  display_name text,
  age int,
  gender text,
  city text,
  latitude double precision,
  longitude double precision,
  avatar_color text,
  distance_km double precision
)
language sql
stable
security invoker
as $$
  select
    p.id,
    p.display_name,
    p.age,
    p.gender,
    p.city,
    p.latitude,
    p.longitude,
    p.avatar_color,
    (
      6371 * acos(
        least(
          1,
          greatest(
            -1,
            cos(radians(origin_lat))
            * cos(radians(p.latitude))
            * cos(radians(p.longitude) - radians(origin_lng))
            + sin(radians(origin_lat))
            * sin(radians(p.latitude))
          )
        )
      )
    ) as distance_km
  from public.profiles p
  where
    p.id <> auth.uid()
    and p.latitude is not null
    and p.longitude is not null
    and (
      6371 * acos(
        least(
          1,
          greatest(
            -1,
            cos(radians(origin_lat))
            * cos(radians(p.latitude))
            * cos(radians(p.longitude) - radians(origin_lng))
            + sin(radians(origin_lat))
            * sin(radians(p.latitude))
          )
        )
      )
    ) <= radius_km
  order by distance_km asc
  limit 50;
$$;
