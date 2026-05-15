drop function if exists public.join_matchmaking(text, text, text, int, double precision, double precision, text);

create function public.join_matchmaking(
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

  update public.matchmaking_queue as mq
  set status = 'cancelled'
  where mq.user_id = auth.uid()
    and mq.status = 'queued';

  update public.room_participants as rp
  set status = 'disconnected',
      left_at = now()
  from public.game_rooms as gr
  where rp.room_id = gr.id
    and rp.user_id = auth.uid()
    and rp.status = 'active'
    and gr.status = 'active';

  update public.game_rooms as gr
  set status = 'finished',
      finished_at = now(),
      finish_reason = 'user_rejoined'
  where gr.status = 'active'
    and exists (
      select 1
      from public.room_participants as rp
      where rp.room_id = gr.id
        and rp.user_id = auth.uid()
        and rp.status = 'disconnected'
    );

  update public.room_participants as rp
  set status = 'disconnected',
      left_at = coalesce(rp.left_at, now())
  from public.game_rooms as gr
  where rp.room_id = gr.id
    and gr.status = 'finished'
    and gr.finish_reason = 'user_rejoined'
    and rp.status = 'active';

  duration := case when p_mode = 'voice' then interval '3 minutes' else interval '5 minutes' end;

  select mq.id, mq.user_id
  into candidate_queue_id, candidate_user_id
  from public.matchmaking_queue as mq
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

  update public.matchmaking_queue as mq
  set status = 'matched',
      room_id = created_room_id,
      matched_at = now()
  where mq.id = candidate_queue_id;

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

grant execute on function public.join_matchmaking(text, text, text, int, double precision, double precision, text) to authenticated;
