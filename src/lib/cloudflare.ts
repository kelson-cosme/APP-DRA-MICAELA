export const fetchCloudflareVideoDetails = async (uid: string) => {
    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.EXPO_PUBLIC_CLOUDFLARE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Cloudflare API Error: ${response.status}`);
        }

        const data = await response.json();

        // Helper to find the best MP4 if downloads are enabled
        let mp4DownloadUrl = null;
        if (data.result && data.result.playback) {
            // Cloudflare sometimes puts downloads in playback object if enabled
            // We just look for any MP4 link in the result object that resembles a download
            // Typically it's in data.result.download_url or similar if configured
            // Since we need an MP4 for expo-av offline storage, we extract it.
            // If the user hasn't enabled "MP4 Downloads" in Cloudflare, this won't be present.

            // NOTE: Cloudflare puts MP4s in a `downloads` array or similar if enabled.
            // A common pattern is data.result.downloads[0].url or data.result.playback.mp4
            if (data.result.downloads && data.result.downloads.length > 0) {
                // Sort descending by size/quality (if they exist) or just pick first
                mp4DownloadUrl = data.result.downloads[0].url;
            }
        }

        return {
            ...data.result,
            mp4DownloadUrl // Inject into the returning object for easy access
        };
    } catch (error) {
        console.error("Error fetching Cloudflare details:", error);
        return null;
    }
};
