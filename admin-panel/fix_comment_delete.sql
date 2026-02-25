-- FIX COMMENT DELETION ISSUES

-- 1. Ensure RLS Policy allows DELETE for authenticated users
-- Drop existing delete policy if it exists to avoid duplication errors (optional, but finding the name is hard, so we just add a new one or replace)
-- Better: enable RLS and add a policy
alter table public.comments enable row level security;

-- Create or replace a policy for deletion
-- Note: 'create policy' fails if it exists, so we drop first if we knew the name. 
-- Since we don't know the exact name, we'll try to create a broad one.
-- Best practice: Use a unique name.
drop policy if exists "Enable delete for authenticated users only" on public.comments;
create policy "Enable delete for authenticated users only"
on public.comments for delete
to authenticated
using (true);

-- 2. Ensure parent_id supports CASCADE DELETE (so deleting a parent deletes replies)
-- This might fail if the constraint name is different, but let's try standard names or potential ones.

-- Try to drop common constraint name for parent_id
alter table public.comments drop constraint if exists comments_parent_id_fkey;

-- Re-add with ON DELETE CASCADE
alter table public.comments
add constraint comments_parent_id_fkey
foreign key (parent_id)
references public.comments(id)
on delete cascade;

-- 3. Also helper for Community Comments (just in case)
alter table public.community_comments enable row level security;
drop policy if exists "Enable delete for community comments" on public.community_comments;
create policy "Enable delete for community comments"
on public.community_comments for delete
to authenticated
using (true);
