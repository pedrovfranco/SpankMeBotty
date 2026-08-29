// Shared yt-dlp binary management.
//
// YouTube changes its player JS frequently, so a stale yt-dlp binary breaks
// nsig extraction and leads to "Sign in to confirm you're not a bot" errors.
// This module makes sure a binary exists and is kept reasonably up to date.

import fs from 'fs';
import path from 'path';
import os from 'os';
import ytdlpWrap from 'yt-dlp-wrap';

export let ytdlpBinaryPath = './binaries/ytdlp';
if (os.platform() == 'win32')
    ytdlpBinaryPath += '.exe';

// How often to re-check for updates in the background of a long-running process.
const updateIntervalMs = 24 * 60 * 60 * 1000; // 24 hours

// Cached wrapper, created once the binary is known to be present.
let ytdlp: ytdlpWrap | null = null;
let updateTimer: NodeJS.Timeout | null = null;

async function downloadLatest(): Promise<void> {
    let binaryFolderPath = path.dirname(ytdlpBinaryPath);
    fs.rmSync(binaryFolderPath, { force: true, recursive: true });
    fs.mkdirSync(binaryFolderPath, { recursive: true });
    console.log('Downloading ytdlp binary...');
    await ytdlpWrap.downloadFromGithub(ytdlpBinaryPath);
}

async function refresh(): Promise<void> {
    if (!fs.existsSync(ytdlpBinaryPath)) {
        await downloadLatest();
        return;
    }

    // Binary exists: ask it to self-update in place. A failed update must not
    // block playback, so fall back to the existing binary on any error.
    try {
        console.log('Checking for ytdlp updates...');
        const output = await new ytdlpWrap(ytdlpBinaryPath).execPromise(['-U']);
        console.log(output.trim());
    }
    catch (e) {
        console.error('Failed to update ytdlp binary, keeping existing one:', e);
    }
}

// Prepare yt-dlp once on startup: download the binary if missing, otherwise
// self-update it, then schedule a periodic background update so a long-running
// process doesn't drift onto a stale binary. Call this once during boot.
export async function initializeYtdlp(): Promise<void> {
    await refresh();
    ytdlp = new ytdlpWrap(ytdlpBinaryPath);

    if (!updateTimer) {
        updateTimer = setInterval(() => {
            refresh().catch(err => console.error('Background ytdlp update failed:', err));
        }, updateIntervalMs);
        // Don't let the update timer keep the process alive on its own.
        updateTimer.unref?.();
    }
}

// Return the shared wrapper. Cheap: no filesystem or update checks on the hot
// path. Falls back to constructing one (e.g. in a worker thread that never ran
// initializeYtdlp) assuming the main process already placed the binary on disk.
export function getYtdlp(): ytdlpWrap {
    if (!ytdlp) {
        ytdlp = new ytdlpWrap(ytdlpBinaryPath);
    }
    return ytdlp;
}

// YouTube increasingly answers datacenter IPs with "Sign in to confirm you're not
// a bot". The durable workaround is to send a logged-in account's cookies. Export
// a Netscape-format cookies.txt from a browser signed into a (throwaway) YouTube
// account and either set YTDLP_COOKIES to its path or drop it at ./cookies.txt.
// Returns [] when no cookie file exists, so behaviour is unchanged until one is
// provided. Spread the result into every yt-dlp invocation.
//
// Note: we deliberately do NOT pin player_client. Forcing web/mweb/android made
// yt-dlp return no playable audio formats here; its default client selection both
// works and honours the cookies.
const defaultCookiePath = './cookies.txt';
export function getYoutubeArgs(): string[] {
    const cookiePath = process.env.YTDLP_COOKIES || defaultCookiePath;
    if (!fs.existsSync(cookiePath)) {
        return [];
    }
    return ['--cookies', cookiePath];
}

// Normalised metadata for a single video. Mirrors the fields the music worker
// previously consumed from yt-search (url, title, duration in seconds).
export interface YtdlpVideoInfo {
    id: string;
    title: string;
    url: string;
    durationSeconds: number;
}

// Normalised metadata for a playlist.
export interface YtdlpPlaylistInfo {
    title: string;
    videos: YtdlpVideoInfo[];
}

// Build a normalised YtdlpVideoInfo from a yt-dlp JSON entry. yt-dlp gives the
// duration in (possibly fractional) seconds and may or may not include a ready
// to use url, so fall back to building a watch url from the video id.
function toVideoInfo(entry: any): YtdlpVideoInfo {
    const id: string = entry?.id ?? '';
    const url: string = entry?.webpage_url ?? entry?.url ?? (id ? 'https://www.youtube.com/watch?v=' + id : '');
    return {
        id,
        title: entry?.title ?? '',
        url,
        durationSeconds: Math.round(entry?.duration ?? 0),
    };
}

// Fetch metadata for a single video url. --no-playlist keeps yt-dlp from pulling
// in a whole playlist when the link also carries a "list" query parameter.
export async function getVideoInfo(link: string): Promise<YtdlpVideoInfo> {
    const output = await getYtdlp().execPromise([link, '--dump-single-json', '--no-playlist', '--no-warnings', ...getYoutubeArgs()]);
    return toVideoInfo(JSON.parse(output));
}

// Fetch a playlist's title and its videos. --flat-playlist avoids resolving each
// entry's full metadata (much faster) while still exposing id/title/duration.
export async function getPlaylistInfo(link: string): Promise<YtdlpPlaylistInfo> {
    const output = await getYtdlp().execPromise([link, '--dump-single-json', '--flat-playlist', '--no-warnings', ...getYoutubeArgs()]);
    const json = JSON.parse(output);
    const entries: any[] = Array.isArray(json?.entries) ? json.entries : [];
    return {
        title: json?.title ?? '',
        videos: entries.map(toVideoInfo),
    };
}

// Locale used to bias search results, restoring yt-search's old hl=pt/gl=PT
// behaviour. YouTube ranks results by the Accept-Language header.
const searchAcceptLanguage = 'pt-PT';

// Search YouTube and return up to `limit` results (generic video search, the
// equivalent of yt-search's default query / play-dl's "genericvideo" source).
export async function searchVideos(query: string, limit: number = 1): Promise<YtdlpVideoInfo[]> {
    const output = await getYtdlp().execPromise([
        'ytsearch' + limit + ':' + query,
        '--dump-single-json',
        '--flat-playlist',
        '--no-warnings',
        '--add-header', 'Accept-Language:' + searchAcceptLanguage,
        ...getYoutubeArgs(),
    ]);
    const json = JSON.parse(output);
    const entries: any[] = Array.isArray(json?.entries) ? json.entries : [];
    return entries.map(toVideoInfo);
}
