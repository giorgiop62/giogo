
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_name text not null,
  theme text not null,
  mode text not null check (mode in ('random','custom')),
  play_mode text not null default 'chat' check (play_mode in ('chat','voice')),
  min_players int not null default 4 check (min_players >= 4 and min_players <= 20),
  age_min int check (age_min >= 18 and age_min <= 99),
  age_max int check (age_max >= 18 and age_max <= 99),
  gender_filter text[] not null default '{}',
  invited_names text[] not null default '{}',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events are public readable"
on public.events for select using (true);

create policy "anyone can create events (prototype)"
on public.events for insert with check (true);
