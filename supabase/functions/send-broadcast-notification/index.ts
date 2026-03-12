import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { title, body, data: extraData } = await req.json()

        if (!title || !body) {
            return new Response(JSON.stringify({ error: "Title and Body are required" }), { 
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const supabase = createClient(supabaseUrl!, supabaseKey!)

        // 1. Buscamos TODOS os tokens ativos
        const { data: pushTokens, error } = await supabase
            .from('user_push_tokens')
            .select('expo_push_token')

        if (error) throw error

        if (!pushTokens || pushTokens.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No push tokens found" }), { 
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        // 2. Removemos duplicados
        const uniqueTokens = [...new Set(pushTokens.map(t => t.expo_push_token))];

        // 3. Montamos as mensagens em chunks de 100
        const messages = uniqueTokens.map(token => ({
            to: token,
            sound: 'default',
            title: title,
            body: body,
            data: extraData || {},
        }));

        const chunks = [];
        for (let i = 0; i < messages.length; i += 100) {
            chunks.push(messages.slice(i, i + 100));
        }

        const results = [];
        for (const chunk of chunks) {
            const expoResp = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chunk),
            });
            const res = await expoResp.json();
            results.push(res);
        }

        return new Response(JSON.stringify({ success: true, totalSent: uniqueTokens.length, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error) {
        console.error('Error no broadcast:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        })
    }
})
