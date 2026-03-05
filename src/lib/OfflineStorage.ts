// src/lib/OfflineStorage.ts
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMp4DownloadUrl, getCloudflareThumbUrl } from './cloudflare';

export interface DownloadedEpisode {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    video_url: string;
    local_video_uri: string;
    local_thumbnail_uri: string;
    duration: number;
    downloaded_at: number;
    size?: number;
    content_title?: string;
}

const METADATA_KEY = '@offline_downloads';
const DOWNLOAD_DIR = (FileSystem.documentDirectory || '') + 'downloads/';

const ensureDirExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
};

export const OfflineStorage = {
    getDownloads: async (): Promise<DownloadedEpisode[]> => {
        try {
            const json = await AsyncStorage.getItem(METADATA_KEY);
            return json ? JSON.parse(json) : [];
        } catch {
            return [];
        }
    },

    isDownloaded: async (episodeId: string): Promise<boolean> => {
        const downloads = await OfflineStorage.getDownloads();
        return downloads.some(d => d.id === episodeId);
    },

    saveDownloadMetadata: async (episode: DownloadedEpisode) => {
        const downloads = await OfflineStorage.getDownloads();
        const filtered = downloads.filter(d => d.id !== episode.id);
        filtered.push(episode);
        await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(filtered));
    },

    removeDownloadMetadata: async (episodeId: string) => {
        const downloads = await OfflineStorage.getDownloads();
        const filtered = downloads.filter(d => d.id !== episodeId);
        await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(filtered));
    },

    downloadEpisode: async (
        episode: any,
        contentTitle: string,
        onProgress?: (progress: number) => void
    ): Promise<DownloadedEpisode> => {
        await ensureDirExists();

        if (!episode.video_url) {
            throw new Error('Este episódio não possui vídeo associado.');
        }

        // Busca URL de download MP4 via Edge Function (seguro, sem expor credenciais)
        const mp4Url = await fetchMp4DownloadUrl(episode.video_url);

        if (!mp4Url) {
            throw new Error(
                'Download offline não disponível para este vídeo.\n\n' +
                'O vídeo pode ainda estar sendo processado. Tente novamente em alguns minutos.'
            );
        }

        // 1. Download da thumbnail
        let localThumbnailUri = '';
        const thumbnailUrl = episode.thumbnail_url || getCloudflareThumbUrl(episode.video_url);
        try {
            const thumbDest = DOWNLOAD_DIR + `thumb_${episode.id}.jpg`;
            const { uri } = await FileSystem.downloadAsync(thumbnailUrl, thumbDest);
            localThumbnailUri = uri;
        } catch (e) {
            console.warn('Failed to download thumbnail:', e);
        }

        // 2. Download do vídeo MP4
        const videoDest = DOWNLOAD_DIR + `vid_${episode.id}.mp4`;
        const downloadResumable = FileSystem.createDownloadResumable(
            mp4Url,
            videoDest,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesExpectedToWrite > 0
                    ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
                    : 0;
                onProgress?.(progress);
            }
        );

        const result = await downloadResumable.downloadAsync();
        if (!result?.uri) throw new Error('Download falhou. Tente novamente.');

        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : undefined;

        // 3. Salva metadados
        const downloadedEp: DownloadedEpisode = {
            id: episode.id,
            title: episode.title,
            description: episode.description || '',
            thumbnail_url: thumbnailUrl,
            video_url: episode.video_url,
            local_video_uri: result.uri,
            local_thumbnail_uri: localThumbnailUri,
            duration: episode.duration || 0,
            downloaded_at: Date.now(),
            size: fileSize,
            content_title: contentTitle,
        };

        await OfflineStorage.saveDownloadMetadata(downloadedEp);
        return downloadedEp;
    },

    removeDownload: async (episodeId: string) => {
        const downloads = await OfflineStorage.getDownloads();
        const target = downloads.find(d => d.id === episodeId);
        if (target) {
            if (target.local_video_uri) await FileSystem.deleteAsync(target.local_video_uri, { idempotent: true });
            if (target.local_thumbnail_uri) await FileSystem.deleteAsync(target.local_thumbnail_uri, { idempotent: true });
            await OfflineStorage.removeDownloadMetadata(episodeId);
        }
    },
};