create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

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
    from public.room_participants as rp
    join public.game_rooms as gr on gr.id = rp.room_id
    where rp.room_id = messages.room_id
      and rp.user_id = auth.uid()
      and rp.status = 'active'
      and gr.status = 'active'
      and gr.ends_at > now()
  )
);

grant select on table public.game_rooms to authenticated;
grant select on table public.room_participants to authenticated;
grant select on table public.matchmaking_queue to authenticated;
grant select, insert on table public.messages to authenticated;

alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
