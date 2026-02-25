-- Create modules table
create table if not exists public.modules (
  id uuid default gen_random_uuid() primary key,
  content_id uuid references public.contents(id) on delete cascade not null,
  title text not null,
  "order" integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Update episodes table
alter table public.episodes 
add column if not exists module_id uuid references public.modules(id) on delete set null,
add column if not exists thumbnail_url text,
add column if not exists video_file_path text;

-- Enable RLS on modules
alter table public.modules enable row level security;
create policy "Public view modules" on public.modules for select using (true);
create policy "Auth Insert modules" on public.modules for insert with check (auth.role() = 'authenticated');
create policy "Auth Update modules" on public.modules for update using (auth.role() = 'authenticated');
create policy "Auth Delete modules" on public.modules for delete using (auth.role() = 'authenticated');

-- Storage Buckets Setup
insert into storage.buckets (id, name, public) 
values ('videos', 'videos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('images', 'images', true)
on conflict (id) do nothing;

-- Storage Policies (Images)
create policy "Public Access Images"
on storage.objects for select
using ( bucket_id = 'images' );

create policy "Auth Upload Images"
on storage.objects for insert
with check ( bucket_id = 'images' and auth.role() = 'authenticated' );

create policy "Auth Update Images"
on storage.objects for update
using ( bucket_id = 'images' and auth.role() = 'authenticated' );

create policy "Auth Delete Images"
on storage.objects for delete
using ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- Storage Policies (Videos)
create policy "Public Access Videos"
on storage.objects for select
using ( bucket_id = 'videos' );

create policy "Auth Upload Videos"
on storage.objects for insert
with check ( bucket_id = 'videos' and auth.role() = 'authenticated' );

create policy "Auth Update Videos"
on storage.objects for update
using ( bucket_id = 'videos' and auth.role() = 'authenticated' );

create policy "Auth Delete Videos"
on storage.objects for delete
using ( bucket_id = 'videos' and auth.role() = 'authenticated' );
