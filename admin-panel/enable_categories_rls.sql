-- Enable RLS (if not already enabled)
alter table public.categories enable row level security;

-- Drop existing policies to avoid conflicts (optional but recommended for clean slate)
drop policy if exists "Enable read access for all" on public.categories;
drop policy if exists "Enable insert for authenticated users only" on public.categories;
drop policy if exists "Enable update for authenticated users only" on public.categories;
drop policy if exists "Enable delete for authenticated users only" on public.categories;

-- Create Policies
-- Allow anyone to read categories
create policy "Enable read access for all"
on public.categories for select
using (true);

-- Allow authenticated users to create categories
create policy "Enable insert for authenticated users only"
on public.categories for insert
with check (auth.role() = 'authenticated');

-- Allow authenticated users to update categories
create policy "Enable update for authenticated users only"
on public.categories for update
using (auth.role() = 'authenticated');

-- Allow authenticated users to delete categories
create policy "Enable delete for authenticated users only"
on public.categories for delete
using (auth.role() = 'authenticated');
