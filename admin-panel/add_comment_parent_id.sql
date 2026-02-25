-- Add parent_id column to comments table to support nested replies
alter table public.comments 
add column if not exists parent_id uuid references public.comments(id) on delete cascade;
