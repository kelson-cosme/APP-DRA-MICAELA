-- 1. Likes -> Episodes
alter table public.likes drop constraint if exists likes_episode_id_fkey;
alter table public.likes add constraint likes_episode_id_fkey foreign key (episode_id) references public.episodes(id) on delete cascade;

-- 2. Comments -> Episodes (Assuming table name is 'comments')
alter table public.comments drop constraint if exists comments_episode_id_fkey;
alter table public.comments add constraint comments_episode_id_fkey foreign key (episode_id) references public.episodes(id) on delete cascade;

-- 3. Episodes -> Contents
alter table public.episodes drop constraint if exists episodes_content_id_fkey;
alter table public.episodes add constraint episodes_content_id_fkey foreign key (content_id) references public.contents(id) on delete cascade;

-- 4. Modules -> Contents
alter table public.modules drop constraint if exists modules_content_id_fkey;
alter table public.modules add constraint modules_content_id_fkey foreign key (content_id) references public.contents(id) on delete cascade;
