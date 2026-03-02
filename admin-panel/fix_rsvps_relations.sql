-- Add foreign key constraint to event_rsvps linking user_id to profiles(id)
ALTER TABLE public.event_rsvps
ADD CONSTRAINT fk_event_rsvps_profiles
FOREIGN KEY (user_id) 
REFERENCES public.profiles (id) 
ON DELETE CASCADE;

-- Add foreign key constraint linking event_id to events(id) 
-- (good practice to ensure data integrity if it doesn't exist yet either)
ALTER TABLE public.event_rsvps
ADD CONSTRAINT fk_event_rsvps_events
FOREIGN KEY (event_id)
REFERENCES public.events (id)
ON DELETE CASCADE;
