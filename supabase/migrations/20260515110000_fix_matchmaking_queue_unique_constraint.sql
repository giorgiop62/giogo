alter table public.matchmaking_queue
drop constraint if exists matchmaking_queue_user_id_key;

drop index if exists public.matchmaking_queue_user_id_key;

create unique index if not exists matchmaking_queue_one_active_queue_per_user
on public.matchmaking_queue (user_id)
where status = 'queued';
