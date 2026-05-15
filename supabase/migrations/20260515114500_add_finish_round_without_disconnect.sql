create or replace function public.finish_round_without_disconnect(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_room_member(p_room_id, auth.uid()) then
    raise exception 'Room not available';
  end if;

  update public.room_participants as rp
  set status = 'left',
      left_at = coalesce(rp.left_at, now())
  where rp.room_id = p_room_id
    and rp.user_id = auth.uid()
    and rp.status = 'active';

  update public.game_rooms as gr
  set status = 'finished',
      finished_at = now(),
      finish_reason = 'timer_expired'
  where gr.id = p_room_id
    and gr.status = 'active'
    and gr.ends_at <= now();

  update public.room_participants as rp
  set status = 'left',
      left_at = coalesce(rp.left_at, now())
  where rp.room_id = p_room_id
    and rp.status = 'active'
    and exists (
      select 1
      from public.game_rooms as gr
      where gr.id = p_room_id
        and gr.status = 'finished'
        and gr.finish_reason = 'timer_expired'
    );
end;
$$;

grant execute on function public.finish_round_without_disconnect(uuid) to authenticated;
