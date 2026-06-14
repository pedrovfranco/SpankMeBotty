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

// How often to re-check for updates within a single process run.
const updateIntervalMs = 24 * 60 * 60 * 1000; // 24 hours

let lastUpdateCheck = 0;
// In-flight download/update, so concurrent callers share one operation.
let refreshInFlight: Promise<void> | null = null;

function needsRefresh(): boolean {
    if (!fs.existsSync(ytdlpBinaryPath)) {
        return true;
    }

    return Date.now() - lastUpdateCheck > updateIntervalMs;
}

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
        lastUpdateCheck = Date.now();
        return;
    }

    // Binary exists: ask it to self-update in place. A failed update must not
    // block playback, so fall back to the existing binary on any error.
    try {
        console.log('Checking for ytdlp updates...');
        const ytdlp = new ytdlpWrap(ytdlpBinaryPath);
        const output = await ytdlp.execPromise(['-U']);
        console.log(output.trim());
    }
    catch (e) {
        console.error('Failed to update ytdlp binary, keeping existing one:', e);
    }
    finally {
        lastUpdateCheck = Date.now();
    }
}

// Ensure a yt-dlp binary is present and up to date, returning a wrapper for it.
// Downloads when missing; otherwise self-updates at most once per updateIntervalMs.
export async function ensureYtdlp(): Promise<ytdlpWrap> {
    if (!refreshInFlight && needsRefresh()) {
        refreshInFlight = refresh().finally(() => { refreshInFlight = null; });
    }

    if (refreshInFlight) {
        await refreshInFlight;
    }

    return new ytdlpWrap(ytdlpBinaryPath);
}
