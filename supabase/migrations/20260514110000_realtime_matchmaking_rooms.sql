alter table public.profiles
add column if not exists search_radius_km int not null default 50
  check (search_radius_km between 1 and 500);

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('chat', 'voice')),
  room_type text not null check (room_type in ('global', 'local')),
  status text not null default 'active' check (status in ('active', 'finished')),
  theme text,
  language text,
  min_participants int not null default 2 check (min_participants >= 2),
  max_participants int not null default 2 check (max_participants >= min_participants),
  radius_km int,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  finished_at timestamptz,
  finish_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'disconnected', 'left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (room_id, user_id)
);

create unique index if not exists room_participants_one_live_room_per_user
on public.room_participants (user_id)
where status = 'active';

create table if not exists public.matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.game_rooms(id) on delete set null,
  mode text not null check (mode in ('chat', 'voice')),
  room_type text not null check (room_type in ('global', 'local')),
  language text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  radius_km int,
  status text not null default 'queued' check (status in ('queued', 'matched', 'cancelled')),
  created_at timestamptz not null default now(),
  matched_at timestamptz
);

alter table public.matchmaking_queue
drop constraint if exists matchmaking_queue_user_id_key;

create unique index if not exists matchmaking_queue_one_active_queue_per_user
on public.matchmaking_queue (user_id)
where status = 'queued';

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.game_rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.matchmaking_queue enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_room_member(target_room_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_participants
    where room_id = target_room_id
      and user_id = target_user_id
      and status in ('active', 'disconnected', 'left')
  );
$$;

drop policy if exists "room members can read rooms" on public.game_rooms;
create policy "room members can read rooms"
on public.game_rooms for select
to authenticated
using (public.is_room_member(game_rooms.id, auth.uid()));

drop policy if exists "users can read their queue rows" on public.matchmaking_queue;
create policy "users can read their queue rows"
on public.matchmaking_queue for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "room members can read participants" on public.room_participants;
create policy "room members can read participants"
on public.room_participants for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_room_member(room_participants.room_id, auth.uid())
);

drop policy if exists "room members can read messages" on public.messages;
create policy "room members can read messages"
on public.messages for select
to authenticated
using (public.is_room_member(messages.room_id, auth.uid()));

drop policy if exists "active room members can send messages" on public.messages;
create policy "active room members can send messages"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.room_participants rp
    join public.game_rooms gr on gr.id = rp.room_id
    where rp.room_id = messages.room_id
      and rp.user_id = auth.uid()
      and rp.status = 'active'
      and gr.status = 'active'
      and gr.ends_at > now()
  )
);

create or replace function public.room_participant_count(target_room_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.room_participants
  where room_id = target_room_id
    and status = 'active';
$$;

create or replace function public.join_matchmaking(
  p_mode text,
  p_room_type text,
  p_language text default null,
  p_radius_km int default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_theme text default null
)
returns table (
  queue_id uuid,
  room_id uuid,
  room_status text,
  participant_count int,
  matched boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_queue_id uuid;
  candidate_user_id uuid;
  created_room_id uuid;
  current_queue_id uuid;
  duration interval;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_mode not in ('chat', 'voice') then
    raise exception 'Invalid mode';
  end if;

  if p_room_type not in ('global', 'local') then
    raise exception 'Invalid room type';
  end if;

  perform pg_advisory_xact_lock(hashtext('giogo-matchmaking-' || p_room_type || '-' || p_mode || '-' || coalesce(p_language, '')));

  update public.matchmaking_queue
  set status = 'cancelled'
  where user_id = auth.uid()
    and status = 'queued';

  update public.room_participants rp
  set status = 'disconnected',
      left_at = now()
  from public.game_rooms gr
  where rp.room_id = gr.id
    and rp.user_id = auth.uid()
    and rp.status = 'active'
    and gr.status = 'active';

  update public.game_rooms gr
  set status = 'finished',
      finished_at = now(),
      finish_reason = 'user_rejoined'
  where gr.status = 'active'
    and exists (
      select 1
      from public.room_participants rp
      where rp.room_id = gr.id
        and rp.user_id = auth.uid()
        and rp.status = 'disconnected'
    );

  update public.room_participants rp
  set status = 'disconnected',
      left_at = coalesce(left_at, now())
  from public.game_rooms gr
  where rp.room_id = gr.id
    and gr.status = 'finished'
    and gr.finish_reason = 'user_rejoined'
    and rp.status = 'active';

  duration := case when p_mode = 'voice' then interval '3 minutes' else interval '5 minutes' end;

  select mq.id, mq.user_id
  into candidate_queue_id, candidate_user_id
  from public.matchmaking_queue mq
  where mq.status = 'queued'
    and mq.user_id <> auth.uid()
    and mq.mode = p_mode
    and mq.room_type = p_room_type
    and coalesce(mq.language, '') = coalesce(p_language, '')
    and (
      p_room_type = 'global'
      or mq.latitude is null
      or mq.longitude is null
      or p_latitude is null
      or p_longitude is null
      or (
        6371 * acos(
          least(
            1,
            greatest(
              -1,
              cos(radians(p_latitude))
              * cos(radians(mq.latitude))
              * cos(radians(mq.longitude) - radians(p_longitude))
              + sin(radians(p_latitude))
              * sin(radians(mq.latitude))
            )
          )
        )
      ) <= least(coalesce(mq.radius_km, p_radius_km, 50), coalesce(p_radius_km, mq.radius_km, 50))
    )
  order by mq.created_at asc
  for update skip locked
  limit 1;

  if candidate_queue_id is null then
    insert into public.matchmaking_queue (
      user_id,
      mode,
      room_type,
      language,
      latitude,
      longitude,
      radius_km,
      status
    )
    values (
      auth.uid(),
      p_mode,
      p_room_type,
      p_language,
      p_latitude,
      p_longitude,
      p_radius_km,
      'queued'
    )
    returning id into current_queue_id;

    return query
    select current_queue_id, null::uuid, null::text, 1, false;
    return;
  end if;

  insert into public.game_rooms (
    mode,
    room_type,
    status,
    theme,
    language,
    min_participants,
    max_participants,
    radius_km,
    latitude,
    longitude,
    started_at,
    ends_at,
    created_by
  )
  values (
    p_mode,
    p_room_type,
    'active',
    p_theme,
    p_language,
    2,
    2,
    p_radius_km,
    p_latitude,
    p_longitude,
    now(),
    now() + duration,
    auth.uid()
  )
  returning id into created_room_id;

  insert into public.room_participants (room_id, user_id, status)
  values
    (created_room_id, candidate_user_id, 'active'),
    (created_room_id, auth.uid(), 'active');

  update public.matchmaking_queue
  set status = 'matched',
      room_id = created_room_id,
      matched_at = now()
  where id = candidate_queue_id;

  insert into public.matchmaking_queue (
    user_id,
    room_id,
    mode,
    room_type,
    language,
    latitude,
    longitude,
    radius_km,
    status,
    matched_at
  )
  values (
    auth.uid(),
    created_room_id,
    p_mode,
    p_room_type,
    p_language,
    p_latitude,
    p_longitude,
    p_radius_km,
    'matched',
    now()
  )
  returning id into current_queue_id;

  return query
  select current_queue_id, created_room_id, 'active'::text, 2, true;
end;
$$;

create or replace function public.cancel_matchmaking()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.matchmaking_queue
  set status = 'cancelled'
  where user_id = auth.uid()
    and status = 'queued';
end;
$$;

create or replace function public.leave_matchmaking(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.room_participants
  set status = 'disconnected',
      left_at = now()
  where room_id = p_room_id
    and user_id = auth.uid()
    and status = 'active';

  update public.game_rooms
  set status = 'finished',
      finished_at = now(),
      finish_reason = 'user_disconnected'
  where id = p_room_id
    and status = 'active';

  update public.room_participants
  set status = 'disconnected',
      left_at = coalesce(left_at, now())
  where room_id = p_room_id
    and status = 'active';
end;
$$;

create or replace function public.finish_expired_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.game_rooms
  set status = 'finished',
      finished_at = now(),
      finish_reason = 'timer_expired'
  where id = p_room_id
    and status = 'active'
    and ends_at <= now()
    and public.is_room_member(p_room_id, auth.uid());

  update public.room_participants
  set status = 'left',
      left_at = coalesce(left_at, now())
  where room_id = p_room_id
    and status = 'active'
    and exists (
      select 1
      from public.game_rooms gr
      where gr.id = p_room_id
        and gr.status = 'finished'
        and gr.finish_reason = 'timer_expired'
    );
end;
$$;

grant execute on function public.join_matchmaking(text, text, text, int, double precision, double precision, text) to authenticated;
grant execute on function public.cancel_matchmaking() to authenticated;
grant execute on function public.leave_matchmaking(uuid) to authenticated;
grant execute on function public.finish_expired_room(uuid) to authenticated;
grant execute on function public.is_room_member(uuid, uuid) to authenticated;
grant execute on function public.room_participant_count(uuid) to authenticated;

alter table public.game_rooms replica identity full;
alter table public.room_participants replica identity full;
alter table public.matchmaking_queue replica identity full;
alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.game_rooms;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.room_participants;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.matchmaking_queue;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
