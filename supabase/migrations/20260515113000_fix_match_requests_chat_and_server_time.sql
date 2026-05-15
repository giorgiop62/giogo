drop policy if exists "users can update their match requests" on public.match_requests;
create policy "users can update their match requests"
on public.match_requests for update
to authenticated
using (requester_id = auth.uid())
with check (requester_id = auth.uid());

grant select, insert, update on table public.match_requests to authenticated;
grant select on table public.matches to authenticated;
grant select, insert on table public.chat_messages to authenticated;

drop policy if exists "matched users can read chat messages" on public.chat_messages;
create policy "matched users can read chat messages"
on public.chat_messages for select
to authenticated
using (
  exists (
    select 1
    from public.matches as m
    where m.id = chat_messages.match_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);

drop policy if exists "matched users can send chat messages" on public.chat_messages;
create policy "matched users can send chat messages"
on public.chat_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.matches as m
    where m.id = chat_messages.match_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);

alter table public.chat_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

create or replace function public.server_now()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select now();
$$;

grant execute on function public.server_now() to authenticated;
