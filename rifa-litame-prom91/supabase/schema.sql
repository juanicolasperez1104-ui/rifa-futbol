-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.raffle_tickets (
  number smallint primary key check (number between 0 and 99),
  status text not null default 'available' check (status in ('available', 'held', 'paid')),
  updated_at timestamptz not null default now(),
  check (status in ('available', 'held', 'paid'))
);
-- Remove contact fields from any earlier draft: the public table must stay PII-free.
alter table public.raffle_tickets drop column if exists name;
alter table public.raffle_tickets drop column if exists phone;

-- Contact information is kept in a separate table and is never readable by public visitors.
create table if not exists public.raffle_reservations (
  number smallint primary key references public.raffle_tickets(number) on delete cascade,
  name text not null,
  phone text not null,
  updated_at timestamptz not null default now()
);

insert into public.raffle_tickets (number)
select n from generate_series(0, 99) as n
on conflict (number) do nothing;

alter table public.raffle_tickets enable row level security;
drop policy if exists "Anyone can view raffle tickets" on public.raffle_tickets;
create policy "Anyone can view raffle tickets" on public.raffle_tickets
  for select to anon, authenticated using (true);
grant select on public.raffle_tickets to anon, authenticated;
grant all on public.raffle_tickets to service_role;

-- Mutations happen only through the private server using the service role key.
revoke insert, update, delete on public.raffle_tickets from anon, authenticated;
alter table public.raffle_reservations enable row level security;
revoke all on public.raffle_reservations from anon, authenticated;
grant all on public.raffle_reservations to service_role;

create or replace function public.reserve_raffle_tickets(p_numbers smallint[], p_name text, p_phone text)
returns smallint[]
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if p_name is null or length(trim(p_name)) = 0 or p_phone is null or length(trim(p_phone)) = 0
     or cardinality(p_numbers) < 1 or cardinality(p_numbers) > 10 then
    raise exception 'invalid reservation';
  end if;
  update raffle_tickets
     set status = 'held', updated_at = now()
   where number = any(p_numbers) and status = 'available';
  get diagnostics affected = row_count;
  -- If even one ticket was unavailable, abort the transaction so no partial hold is left.
  if affected <> cardinality(p_numbers) then
    raise exception 'one or more tickets already taken';
  end if;
  insert into raffle_reservations (number, name, phone)
  select ticket_number, trim(p_name), trim(p_phone) from unnest(p_numbers) as tickets(ticket_number);
  return p_numbers;
end;
$$;
revoke all on function public.reserve_raffle_tickets(smallint[], text, text) from public, anon, authenticated;
grant execute on function public.reserve_raffle_tickets(smallint[], text, text) to service_role;

-- Enable realtime publication for live board updates.
do $$ begin
  alter publication supabase_realtime add table public.raffle_tickets;
exception when duplicate_object then null;
end $$;
