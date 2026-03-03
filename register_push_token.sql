-- Função para registrar e assumir a propriedade do token de push notification
CREATE OR REPLACE FUNCTION public.register_push_token(push_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Nós usamos SECURITY DEFINER para executar com permissão de administrador
    -- Isso permite alterar o dono do token sem ser bloqueado pelo RLS,
    -- caso o dispositivo tenha sido logado por outro usuário (mesmo token de push, mas outro user_id).
    
    INSERT INTO public.user_push_tokens (user_id, expo_push_token)
    VALUES (auth.uid(), push_token)
    ON CONFLICT (expo_push_token) 
    DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        created_at = now();
END;
$$;
