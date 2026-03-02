import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        // A function será chamada pelo webhoook/trigger do proprio Supabase quando houver um INSERT em `notifications`
        const { record } = await req.json()

        // record contém user_id, sender_id, type, etc.
        const receiverId = record.user_id;

        if (!receiverId) {
            return new Response("Missing receiverId", { status: 400 })
        }

        // Initialize Supabase Client (usando service_role_key para acessar tabelas protegidas bypassando RLS)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Buscamos o(s) token(s) do receiver
        const { data: pushTokens, error } = await supabase
            .from('user_push_tokens')
            .select('expo_push_token')
            .eq('user_id', receiverId)

        if (error || !pushTokens || pushTokens.length === 0) {
            console.log('Nenhum token encontrado para o usuário:', receiverId)
            return new Response("No push tokens active", { status: 200 })
        }

        // 2. Buscamos o nome do remetente
        let senderName = "Alguém";
        if (record.sender_id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', record.sender_id)
                .single();
            if (profile?.full_name) senderName = profile.full_name;
        }

        // 3. Montamos a mensagem do Push
        let title = "Nova Notificação";
        let body = "Você tem uma nova notificação.";

        if (record.type === 'course_reply') {
            title = "Resposta recebida";
            body = `${senderName} respondeu ao seu comentário na aula.`;
        } else if (record.type === 'community_reply') {
            title = "Comunidade Movimentada";
            body = `${senderName} comentou na sua publicação.`;
        }

        // 4. Disparamos para a Expo API
        const messages = [];
        for (const pushToken of pushTokens) {
            messages.push({
                to: pushToken.expo_push_token,
                sound: 'default',
                title: title,
                body: body,
                // Daria pra passar dados para abrir telas especificas (ex: "screen: 'Comunidade'")
                data: { type: record.type, referenceId: record.reference_id },
            })
        }

        console.log("Enviando push requests para a Expo:", messages);

        const expoResp = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const receipts = await expoResp.json();
        console.log("Expo Responses", receipts);

        return new Response(JSON.stringify({ success: true, receipts }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error) {
        console.error('Error no processamento push:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        })
    }
})
