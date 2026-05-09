alter table public.profiles
add column if not exists nationality text,
add column if not exists spoken_languages text[] not null default '{}',
add column if not exists preferred_language text,
add column if not exists interests text[] not null default '{}',
add column if not exists profile_photo_url text,
add column if not exists matching_preferences jsonb not null default '{}';

alter table public.events
add column if not exists event_kind text not null default 'local' check (event_kind in ('global', 'local')),
add column if not exists scheduled_at timestamptz,
add column if not exists max_players int not null default 20 check (max_players >= 4 and max_players <= 20),
add column if not exists radius_km int check (radius_km is null or (radius_km >= 1 and radius_km <= 250)),
add column if not exists participant_count int not null default 1 check (participant_count >= 0);

alter table public.events
drop constraint if exists events_local_requires_schedule;

alter table public.events
add constraint events_local_requires_schedule
check (event_kind <> 'local' or scheduled_at is not null)
not valid;

create table if not exists public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'booked' check (status in ('booked', 'checked_in', 'cancelled')),
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

alter table public.event_participants enable row level security;

create policy "authenticated users can read event bookings"
on public.event_participants for select
to authenticated
using (true);

create policy "users can book themselves"
on public.event_participants for insert
to authenticated
with check (profile_id = auth.uid());

create policy "users can update their own booking"
on public.event_participants for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create or replace function public.refresh_event_participant_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events e
  set participant_count = (
    select count(*)::int
    from public.event_participants ep
    where ep.event_id = coalesce(new.event_id, old.event_id)
      and ep.status <> 'cancelled'
  )
  where e.id = coalesce(new.event_id, old.event_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists event_participants_refresh_count_insert on public.event_participants;
drop trigger if exists event_participants_refresh_count_update on public.event_participants;
drop trigger if exists event_participants_refresh_count_delete on public.event_participants;

create trigger event_participants_refresh_count_insert
after insert on public.event_participants
for each row execute function public.refresh_event_participant_count();

create trigger event_participants_refresh_count_update
after update on public.event_participants
for each row execute function public.refresh_event_participant_count();

create trigger event_participants_refresh_count_delete
after delete on public.event_participants
for each row execute function public.refresh_event_participant_count();
