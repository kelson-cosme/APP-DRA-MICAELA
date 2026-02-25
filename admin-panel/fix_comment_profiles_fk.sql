-- Add explicit foreign key from comments.user_id to profiles.id
-- This allows Supabase (PostgREST) to "see" the relationship for joins

-- Drop potential conflicting constraints first (optional but good for retry)
alter table public.comments drop constraint if exists comments_user_id_fkey_profiles;

-- Add the foreign key
alter table public.comments
add constraint comments_user_id_fkey_profiles
foreign key (user_id)
references public.profiles(id)
on delete cascade;

-- Do the same for community_posts and community_comments just in case
alter table public.community_posts drop constraint if exists community_posts_user_id_fkey_profiles;

alter table public.community_posts
add constraint community_posts_user_id_fkey_profiles
foreign key (user_id)
references public.profiles(id)
on delete cascade;

alter table public.community_comments drop constraint if exists community_comments_user_id_fkey_profiles;

alter table public.community_comments
add constraint community_comments_user_id_fkey_profiles
foreign key (user_id)
references public.profiles(id)
on delete cascade;
