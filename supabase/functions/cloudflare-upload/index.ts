import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upload-length, upload-metadata',
}

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { uploadLength, uploadMetadata } = await req.json()

        const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
        const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')

        if (!accountId || !apiToken) {
            throw new Error('Cloudflare credentials not configured in Edge Function')
        }

        // Call Cloudflare API to get a direct TUS upload URL
        // We append 'requiresignedurls ZmFsc2U=' (base64 for 'false') to allow public playback
        const metadata = uploadMetadata 
            ? `${uploadMetadata},requiresignedurls ZmFsc2U=` 
            : 'requiresignedurls ZmFsc2U=';

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Tus-Resumable': '1.0.0',
                    'Upload-Length': uploadLength.toString(),
                    'Upload-Metadata': metadata,
                },
                body: JSON.stringify({
                    requireSignedURLs: false,
                })
            }
        )

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Cloudflare Error:", errorText);
            throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
        }

        const location = response.headers.get('Location')
        const streamMediaId = response.headers.get('stream-media-id')

        if (!location) {
            throw new Error('Cloudflare API did not return a Location header');
        }

        return new Response(
            JSON.stringify({
                uploadUrl: location,
                mediaId: streamMediaId
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
