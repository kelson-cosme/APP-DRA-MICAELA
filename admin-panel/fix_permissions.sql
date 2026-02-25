-- Enable RLS (if not already acting)
alter table public.contents enable row level security;
alter table public.episodes enable row level security;
alter table public.modules enable row level security;

-- Drop existing policies to avoid conflicts (optional but safer for clean slate)
drop policy if exists "Enable delete for authenticated users only" on public.contents;
drop policy if exists "Enable delete for authenticated users only" on public.episodes;
drop policy if exists "Enable delete for authenticated users only" on public.modules;

-- Create Delete Policies for Authenticated Users
create policy "Enable delete for authenticated users only"
on public.contents
for delete
using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only"
on public.episodes
for delete
using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only"
on public.modules
for delete
using (auth.role() = 'authenticated');

-- Ensure Insert/Update policies exist too (just in case)
-- Contents
create policy "Enable insert for authenticated users only" on public.contents for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on public.contents for update using (auth.role() = 'authenticated');

-- Episodes
create policy "Enable insert for authenticated users only" on public.episodes for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on public.episodes for update using (auth.role() = 'authenticated');
