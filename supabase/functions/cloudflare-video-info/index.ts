// supabase/functions/cloudflare-video-info/index.ts
// Retorna detalhes do vídeo incluindo URL de download MP4
// As credenciais ficam seguras no servidor, nunca expostas ao app

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const { uid } = await req.json()

    if (!uid) {
      return new Response(
        JSON.stringify({ error: 'uid is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')

    if (!accountId || !apiToken) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare credentials not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Busca detalhes do vídeo
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`,
      { headers: { 'Authorization': `Bearer ${apiToken}` } }
    )

    const data = await res.json()

    if (!data.success) {
      console.error('Cloudflare error:', JSON.stringify(data.errors))
      return new Response(
        JSON.stringify({ error: 'Video not found', details: data.errors }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = data.result

    // Log para debug
    console.log('Video status:', result.status?.state)
    console.log('Downloads field:', JSON.stringify(result.downloads))
    console.log('requireSignedURLs:', result.requireSignedURLs)

    // Busca ou cria o download MP4 via endpoint correto: /stream/{uid}/downloads
    const dlRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}/downloads`,
      {
        method: 'POST', // POST cria se não existir, retorna se já existir
        headers: { 'Authorization': `Bearer ${apiToken}` },
      }
    )
    const dlData = await dlRes.json()
    console.log('Downloads response:', JSON.stringify(dlData))

    const mp4DownloadUrl = dlData?.result?.default?.url || null
    const mp4Status = dlData?.result?.default?.status || null

    // Se ainda está processando, retorna null para o app tentar mais tarde
    if (mp4Status === 'inprogress') {
      return new Response(
        JSON.stringify({ uid, mp4DownloadUrl: null, mp4Status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ uid, status: result.status?.state, mp4DownloadUrl, mp4Status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})