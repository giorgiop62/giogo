alter table public.profiles
add column if not exists looking_for text,
add column if not exists hobbies text[] not null default '{}',
add column if not exists prompt_love text,
add column if not exists prompt_agree text,
add column if not exists prompt_green_flag text,
add column if not exists prompt_spontaneous text;

alter table public.events
drop constraint if exists events_play_mode_check;

alter table public.events
add constraint events_play_mode_check
check (play_mode in ('chat', 'voice'));

alter table public.events
alter column radius_km set default 50;

alter table public.events
add column if not exists latitude double precision check (latitude between -90 and 90),
add column if not exists longitude double precision check (longitude between -180 and 180);

create policy "users can delete their own profile"
on public.profiles for delete
to authenticated
using (id = auth.uid());

drop policy if exists "users can book themselves" on public.event_participants;

create policy "users can book themselves within event radius"
on public.event_participants for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.events e
    left join public.profiles p on p.id = auth.uid()
    where e.id = event_id
      and (
        e.host_id = auth.uid()
        or (
          e.latitude is not null
          and e.longitude is not null
          and p.latitude is not null
          and p.longitude is not null
          and (
            6371 * acos(
              least(
                1,
                greatest(
                  -1,
                  cos(radians(p.latitude))
                  * cos(radians(e.latitude))
                  * cos(radians(e.longitude) - radians(p.longitude))
                  + sin(radians(p.latitude))
                  * sin(radians(e.latitude))
                )
              )
            )
          ) <= least(coalesce(e.radius_km, 50), 50)
        )
      )
  )
);

create table if not exists public.match_requests (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requested_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'round' check (source in ('round', 'event', 'profile')),
  created_at timestamptz not null default now(),
  primary key (requester_id, requested_id)
);

alter table public.match_requests enable row level security;

create policy "users can read their match requests"
on public.match_requests for select
to authenticated
using (requester_id = auth.uid() or requested_id = auth.uid());

create policy "users can create their match requests"
on public.match_requests for insert
to authenticated
with check (requester_id = auth.uid());

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

alter table public.matches enable row level security;

create policy "users can read their matches"
on public.matches for select
to authenticated
using (user_a = auth.uid() or user_b = auth.uid());

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "matched users can read chat messages"
on public.chat_messages for select
to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);

create policy "matched users can send chat messages"
on public.chat_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);

create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'created' check (status in ('created', 'active', 'ended', 'missed')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.voice_sessions enable row level security;

create policy "users can read their voice sessions"
on public.voice_sessions for select
to authenticated
using (caller_id = auth.uid() or receiver_id = auth.uid());

create policy "users can create their voice sessions"
on public.voice_sessions for insert
to authenticated
with check (caller_id = auth.uid());

create or replace function public.accept_match_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
begin
  if exists (
    select 1 from public.match_requests
    where requester_id = new.requested_id
      and requested_id = new.requester_id
  ) then
    a := least(new.requester_id, new.requested_id);
    b := greatest(new.requester_id, new.requested_id);
    insert into public.matches (user_a, user_b)
    values (a, b)
    on conflict (user_a, user_b) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists match_requests_accept on public.match_requests;
create trigger match_requests_accept
after insert on public.match_requests
for each row execute function public.accept_match_request();

drop function if exists public.nearby_profiles(double precision, double precision, double precision);

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
  profile_photo_url text,
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
    p.profile_photo_url,
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
