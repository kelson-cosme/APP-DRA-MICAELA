-- Tabela para armazenar os tokens de push notification
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    expo_push_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configuração de RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens insert" 
ON public.user_push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tokens select" 
ON public.user_push_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tokens update" 
ON public.user_push_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tokens delete" 
ON public.user_push_tokens FOR DELETE
USING (auth.uid() = user_id);
