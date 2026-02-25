alter table public.episodes drop constraint if exists episodes_content_id_fkey;

alter table public.episodes add constraint episodes_content_id_fkey foreign key (content_id) references public.contents(id) on delete cascade;

alter table public.modules drop constraint if exists modules_content_id_fkey;

alter table public.modules add constraint modules_content_id_fkey foreign key (content_id) references public.contents(id) on delete cascade;
