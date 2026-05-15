alter table public.events
drop constraint if exists events_min_players_check;

alter table public.events
drop constraint if exists events_max_players_check;

alter table public.events
add constraint events_min_players_check
check (min_players >= 2 and min_players <= 2)
not valid;

alter table public.events
add constraint events_max_players_check
check (max_players >= 2 and max_players <= 2)
not valid;

alter table public.events
add column if not exists room_id uuid references public.game_rooms(id) on delete set null;

create or replace function public.maybe_start_event_room(p_event_id uuid)
returns table (
  room_id uuid,
  started boolean,
  waiting_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  participant_ids uuid[];
  created_room_id uuid;
  required_count int := 2;
  duration interval;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into target_event
  from public.events
  where id = p_event_id
  for update;

  if target_event.id is null then
    return query select null::uuid, false, 'event_not_found'::text;
    return;
  end if;

  if target_event.host_id <> auth.uid()
    and not exists (
      select 1
      from public.event_participants as ep
      where ep.event_id = p_event_id
        and ep.profile_id = auth.uid()
        and ep.status <> 'cancelled'
    )
  then
    raise exception 'Event not available';
  end if;

  if target_event.room_id is not null then
    return query select target_event.room_id, true, null::text;
    return;
  end if;

  if target_event.scheduled_at is null or target_event.scheduled_at > now() then
    return query select null::uuid, false, 'waiting_for_time'::text;
    return;
  end if;

  select array_agg(ep.profile_id order by ep.created_at asc)
  into participant_ids
  from (
    select ep.profile_id, ep.created_at
    from public.event_participants as ep
    where ep.event_id = p_event_id
      and ep.status <> 'cancelled'
    order by ep.created_at asc
    limit required_count
  ) as ep;

  if coalesce(array_length(participant_ids, 1), 0) < required_count then
    return query select null::uuid, false, 'waiting_for_players'::text;
    return;
  end if;

  duration := case when target_event.play_mode = 'voice' then interval '3 minutes' else interval '5 minutes' end;

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
    target_event.play_mode,
    'local',
    'active',
    target_event.theme,
    null,
    required_count,
    required_count,
    target_event.radius_km,
    target_event.latitude,
    target_event.longitude,
    now(),
    now() + duration,
    target_event.host_id
  )
  returning id into created_room_id;

  insert into public.room_participants (room_id, user_id, status)
  select created_room_id, unnest(participant_ids), 'active';

  update public.events
  set room_id = created_room_id,
      status = 'active'
  where id = p_event_id;

  return query select created_room_id, true, null::text;
end;
$$;

grant execute on function public.maybe_start_event_room(uuid) to authenticated;
grant select, insert, update on table public.events to authenticated;
