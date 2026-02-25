import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DownloadedEpisode {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string; // Remote URL
    video_url: string; // Remote URL
    local_video_uri: string; // Local file URI
    local_thumbnail_uri: string; // Local file URI
    duration: number;
    downloaded_at: number;
    size?: number;
    content_title?: string; // Course title
}

const METADATA_KEY = '@offline_downloads';
const DOWNLOAD_DIR = (FileSystem.documentDirectory || '') + 'downloads/';

// Ensure directory exists
const ensureDirExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
};

export const OfflineStorage = {
    // Get all downloaded episodes metadata
    getDownloads: async (): Promise<DownloadedEpisode[]> => {
        try {
            const json = await AsyncStorage.getItem(METADATA_KEY);
            return json ? JSON.parse(json) : [];
        } catch (error) {
            console.error('Error getting downloads:', error);
            return [];
        }
    },

    // Check if an episode is downloaded
    isDownloaded: async (episodeId: string): Promise<boolean> => {
        const downloads = await OfflineStorage.getDownloads();
        return downloads.some(d => d.id === episodeId);
    },

    // Save download metadata
    saveDownloadMetadata: async (episode: DownloadedEpisode) => {
        const downloads = await OfflineStorage.getDownloads();
        // Remove existing if any (update)
        const filtered = downloads.filter(d => d.id !== episode.id);
        filtered.push(episode);
        await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(filtered));
    },

    // Remove download metadata
    removeDownloadMetadata: async (episodeId: string) => {
        const downloads = await OfflineStorage.getDownloads();
        const filtered = downloads.filter(d => d.id !== episodeId);
        await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(filtered));
    },

    // Download an episode
    downloadEpisode: async (
        episode: any,
        contentTitle: string,
        onProgress?: (progress: number) => void
    ): Promise<DownloadedEpisode> => {
        await ensureDirExists();

        // 1. Download Thumbnail
        let localThumbnailUri = '';
        if (episode.thumbnail_url) {
            const thumbFilename = `thumb_${episode.id}.jpg`;
            const thumbDest = DOWNLOAD_DIR + thumbFilename;
            try {
                const { uri } = await FileSystem.downloadAsync(episode.thumbnail_url, thumbDest);
                localThumbnailUri = uri;
            } catch (e) {
                console.warn('Failed to download thumbnail', e);
                // Fallback to remote or empty
            }
        }

        // 2. Download Video
        const videoFilename = `vid_${episode.id}.mp4`; // Assuming mp4 for now
        const videoDest = DOWNLOAD_DIR + videoFilename;

        const downloadResumable = FileSystem.createDownloadResumable(
            episode.video_url,
            videoDest,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesExpectedToWrite > 0
                    ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
                    : 0;
                if (onProgress) onProgress(progress);
            }
        );

        const result = await downloadResumable.downloadAsync();

        if (!result || !result.uri) {
            throw new Error('Download failed');
        }

        // 3. Save Metadata
        const downloadedEp: DownloadedEpisode = {
            id: episode.id,
            title: episode.title,
            description: episode.description,
            thumbnail_url: episode.thumbnail_url,
            video_url: episode.video_url,
            local_video_uri: result.uri,
            local_thumbnail_uri: localThumbnailUri,
            duration: episode.duration,
            downloaded_at: Date.now(),
            content_title: contentTitle
        };

        await OfflineStorage.saveDownloadMetadata(downloadedEp);
        return downloadedEp;
    },

    // Remove a download (files + metadata)
    removeDownload: async (episodeId: string) => {
        const downloads = await OfflineStorage.getDownloads();
        const target = downloads.find(d => d.id === episodeId);

        if (target) {
            // Delete Video File
            if (target.local_video_uri) {
                await FileSystem.deleteAsync(target.local_video_uri, { idempotent: true });
            }
            // Delete Thumbnail File
            if (target.local_thumbnail_uri) {
                await FileSystem.deleteAsync(target.local_thumbnail_uri, { idempotent: true });
            }

            // Remove Metadata
            await OfflineStorage.removeDownloadMetadata(episodeId);
        }
    }
};
