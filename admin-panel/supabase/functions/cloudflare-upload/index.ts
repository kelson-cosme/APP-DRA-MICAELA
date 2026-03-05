// supabase/functions/cloudflare-upload/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    // Lê o body como texto primeiro para debugar
    const rawBody = await req.text()
    console.log('Raw body received:', rawBody)
    console.log('Content-Type:', req.headers.get('content-type'))

    if (!rawBody || rawBody.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Body is empty. Send: { uploadLength, uploadMetadata }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse manual para capturar erros de JSON
    let body: { uploadLength?: number; uploadMetadata?: string }
    try {
      body = JSON.parse(rawBody)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', raw: rawBody.slice(0, 200) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { uploadLength, uploadMetadata } = body

    console.log('uploadLength:', uploadLength)
    console.log('uploadMetadata:', uploadMetadata)

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')

    if (!accountId || !apiToken) {
      return new Response(
        JSON.stringify({
          error: 'Cloudflare credentials not configured.',
          hint: 'Run: supabase secrets set CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_API_TOKEN=yyy && supabase functions deploy cloudflare-upload',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!uploadLength) {
      return new Response(
        JSON.stringify({ error: 'uploadLength is required and must be > 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Requesting Cloudflare TUS URL for ${uploadLength} bytes...`)

    // Adiciona allowedorigins e requiresignedurls=false ao metadata para habilitar MP4 download
    // O Cloudflare usa Upload-Metadata no formato TUS: chave base64,chave base64,...
    function addDownloadPermission(metadata: string): string {
      const parts = metadata ? metadata.split(',').map(p => p.trim()).filter(Boolean) : []
      // requiresignedurls false  → permite download público
      // mp4_download allowed     → habilita geração do MP4
      const extra = [
        `requiresignedurls ${btoa('false')}`,
        `mp4_download ${btoa('allowed')}`,
      ]
      // Evita duplicatas
      const filtered = parts.filter(p => {
        const key = p.split(' ')[0]
        return key !== 'requiresignedurls' && key !== 'mp4_download'
      })
      return [...filtered, ...extra].join(',')
    }

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(uploadLength),
          'Upload-Metadata': addDownloadPermission(uploadMetadata || ''),
        },
      }
    )

    const cfResponseText = await cfResponse.text()
    console.log('Cloudflare response status:', cfResponse.status)
    console.log('Cloudflare response body:', cfResponseText.slice(0, 500))

    if (!cfResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `Cloudflare API error: ${cfResponse.status}`,
          details: cfResponseText,
        }),
        { status: cfResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const location = cfResponse.headers.get('Location')
    const streamMediaId = cfResponse.headers.get('stream-media-id')

    console.log('Location:', location)
    console.log('Media ID:', streamMediaId)

    if (!location) {
      return new Response(
        JSON.stringify({
          error: 'Cloudflare did not return a Location header',
          cfStatus: cfResponse.status,
          cfBody: cfResponseText,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ uploadUrl: location, mediaId: streamMediaId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})