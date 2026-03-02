-- Enable RLS (if not already enabled)
alter table public.events enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Enable read access for all" on public.events;
drop policy if exists "Enable insert for authenticated users only" on public.events;
drop policy if exists "Enable update for authenticated users only" on public.events;
drop policy if exists "Enable delete for authenticated users only" on public.events;

-- Create Policies
-- Allow anyone to read events
create policy "Enable read access for all"
on public.events for select
using (true);

-- Allow authenticated users to create events
create policy "Enable insert for authenticated users only"
on public.events for insert
with check (auth.role() = 'authenticated');

-- Allow authenticated users to update their events (or all events depending on your app logic)
create policy "Enable update for authenticated users only"
on public.events for update
using (auth.role() = 'authenticated');

-- Allow authenticated users to delete events
create policy "Enable delete for authenticated users only"
on public.events for delete
using (auth.role() = 'authenticated');
