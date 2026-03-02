-- 1. Trigger para novas respostas nos comentários de Aulas
CREATE OR REPLACE FUNCTION handle_new_course_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
    parent_comment_user_id UUID;
BEGIN
    -- Verifica se é uma resposta a outro comentário
    IF NEW.parent_id IS NOT NULL THEN
        -- Busca o user_id do dono do comentário original
        SELECT user_id INTO parent_comment_user_id FROM public.comments WHERE id = NEW.parent_id;
        
        -- Garante que não notifique a si mesmo
        IF parent_comment_user_id IS NOT NULL AND parent_comment_user_id != NEW.user_id THEN
            INSERT INTO public.notifications (user_id, sender_id, type, reference_id)
            VALUES (parent_comment_user_id, NEW.user_id, 'course_reply', NEW.episode_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_course_comment_reply ON public.comments;
CREATE TRIGGER on_course_comment_reply
    AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION handle_new_course_comment_reply();


-- 2. Trigger para comentários na Comunidade
CREATE OR REPLACE FUNCTION handle_new_community_comment()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
BEGIN
    -- Busca o user_id dono da postagem
    SELECT user_id INTO post_author_id FROM public.community_posts WHERE id = NEW.post_id;
    
    -- Se o autor do comentário não for o dono do post
    IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, sender_id, type, reference_id)
        VALUES (post_author_id, NEW.user_id, 'community_reply', NEW.post_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_community_comment ON public.community_comments;
CREATE TRIGGER on_community_comment
    AFTER INSERT ON public.community_comments
    FOR EACH ROW EXECUTE FUNCTION handle_new_community_comment();
