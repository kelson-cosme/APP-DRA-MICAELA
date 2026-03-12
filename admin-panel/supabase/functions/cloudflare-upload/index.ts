import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, upload-length, upload-metadata',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { uploadLength, uploadMetadata } = await req.json()

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')

    if (!accountId || !apiToken) {
      throw new Error('Cloudflare credentials not configured')
    }

    // cria upload TUS
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': uploadLength.toString(),
          'Upload-Metadata': uploadMetadata ?? '',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cloudflare Error:', errorText)
      throw new Error(`Cloudflare API error: ${response.status}`)
    }

    const uploadUrl = response.headers.get('Location')
    const streamMediaId = response.headers.get('stream-media-id')

    if (!uploadUrl || !streamMediaId) {
      throw new Error('Cloudflare did not return upload URL or media ID')
    }

    // 🔧 desativa Signed URLs
    const patchResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${streamMediaId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requireSignedURLs: false,
        }),
      }
    )

    if (!patchResponse.ok) {
      const errorText = await patchResponse.text()
      console.error('Patch Error:', errorText)
    }

    return new Response(
      JSON.stringify({
        uploadUrl,
        mediaId: streamMediaId,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})