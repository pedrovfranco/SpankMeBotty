// Small helpers to extract YouTube ids from links.
//
// play-dl used to both classify links (validate) and fetch their data. yt-search
// instead expects an explicit videoId/listId, so we parse them out of the url here.

// Returns the YouTube video id for a watch/youtu.be/shorts/embed link, or undefined
// if the link isn't a recognisable YouTube video url.
export function getYoutubeVideoId(link: string): string | undefined {
    try {
        const url = new URL(link);
        const host = url.hostname.replace(/^www\./, '');

        if (host === 'youtu.be') {
            const id = url.pathname.slice(1).split('/')[0];
            return id || undefined;
        }

        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
            const v = url.searchParams.get('v');
            if (v) {
                return v;
            }

            const match = url.pathname.match(/^\/(?:shorts|embed|v)\/([^/?#]+)/);
            if (match) {
                return match[1];
            }
        }
    }
    catch {
        // Not a url, fall through.
    }

    return undefined;
}

// Returns the YouTube playlist id (the "list" query parameter), or undefined.
export function getYoutubePlaylistId(link: string): string | undefined {
    try {
        const url = new URL(link);
        return url.searchParams.get('list') ?? undefined;
    }
    catch {
        return undefined;
    }
}
