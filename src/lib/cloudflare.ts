// src/lib/cloudflare.ts
// O video_url armazenado no banco é o UID do Cloudflare Stream
// Ex: "abc123def456789" — não uma URL completa

import { supabase } from './supabase';

// Gera a URL de HLS diretamente sem precisar chamar a API
export const getCloudflareHLSUrl = (uid: string): string => {
    const customerCode = process.env.EXPO_PUBLIC_CLOUDFLARE_CUSTOMER_CODE;
    if (customerCode) {
        return `https://customer-${customerCode}.cloudflarestream.com/${uid}/manifest/video.m3u8`;
    }
    return `https://videodelivery.net/${uid}/manifest/video.m3u8`;
};

// Gera a URL de thumbnail diretamente
export const getCloudflareThumbUrl = (uid: string): string => {
    const customerCode = process.env.EXPO_PUBLIC_CLOUDFLARE_CUSTOMER_CODE;
    if (customerCode) {
        return `https://customer-${customerCode}.cloudflarestream.com/${uid}/thumbnails/thumbnail.jpg`;
    }
    return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`;
};

// Busca a URL de download MP4 via Edge Function (credenciais ficam no servidor)
export const fetchMp4DownloadUrl = async (uid: string): Promise<string | null> => {
    if (!uid || uid.startsWith('http')) return null;

    try {
        const { data, error } = await supabase.functions.invoke('cloudflare-video-info', {
            body: { uid },
        });

        if (error) {
            console.error('Erro ao buscar URL de download:', error);
            return null;
        }

        return data?.mp4DownloadUrl || null;
    } catch (err) {
        console.error('fetchMp4DownloadUrl error:', err);
        return null;
    }
};

// Mantido por compatibilidade com VideoPlayerScreen
export const fetchCloudflareVideoDetails = async (uid: string) => {
    if (!uid || uid.startsWith('http')) return null;
    return {
        uid,
        playback: { hls: getCloudflareHLSUrl(uid) },
        mp4DownloadUrl: await fetchMp4DownloadUrl(uid),
    };
};