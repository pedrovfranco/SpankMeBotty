// Minimal type declarations for the 'yt-search' package (it ships none).
// Only the shapes actually consumed by this project are described here.
declare module 'yt-search' {
    interface Duration {
        seconds: number;
        timestamp: string;
        toString(): string;
    }

    interface Author {
        name: string;
        url: string;
    }

    interface VideoSearchResult {
        type: 'video';
        videoId: string;
        url: string;
        title: string;
        description: string;
        image: string;
        thumbnail: string;
        seconds: number;
        timestamp: string;
        duration: Duration;
        ago: string;
        views: number;
        author: Author;
    }

    interface PlaylistSearchResult {
        type: 'list';
        listId: string;
        url: string;
        title: string;
        image: string;
        thumbnail: string;
        videoCount: number;
        author: Author;
    }

    interface SearchResult {
        videos: VideoSearchResult[];
        playlists: PlaylistSearchResult[];
        live: VideoSearchResult[];
        channels: any[];
        all: any[];
    }

    interface VideoMetadataResult {
        type: 'video';
        videoId: string;
        url: string;
        title: string;
        description: string;
        image: string;
        thumbnail: string;
        seconds: number;
        timestamp: string;
        duration: Duration;
        ago: string;
        views: number;
        genre: string;
        uploadDate: string;
        author: Author;
    }

    interface PlaylistItem {
        title: string;
        videoId: string;
        listId: string;
        thumbnail: string;
        duration: Duration;
        author: Author;
    }

    interface PlaylistMetadataResult {
        title: string;
        listId: string;
        url: string;
        size: number;
        views: number;
        date: string;
        image: string;
        thumbnail: string;
        videos: PlaylistItem[];
        author: Author;
    }

    interface SearchOptions {
        query?: string;
        search?: string;
        videoId?: string;
        listId?: string;
        playlistId?: string;
        category?: string;
        pages?: number;
        pageStart?: number;
        pageEnd?: number;
        hl?: string;
        gl?: string;
        userAgent?: string;
    }

    function yts(query: string): Promise<SearchResult>;
    function yts(options: SearchOptions & { videoId: string }): Promise<VideoMetadataResult>;
    function yts(options: SearchOptions & { listId: string }): Promise<PlaylistMetadataResult>;
    function yts(options: SearchOptions): Promise<SearchResult>;

    export = yts;
}
