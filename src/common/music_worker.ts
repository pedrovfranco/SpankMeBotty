import workerpool from 'workerpool';
import {validate, video_basic_info, playlist_info, spotify, search, SpotifyPlaylist, SpotifyAlbum, SpotifyTrack, YouTubeVideo } from 'play-dl';
import { performance } from 'perf_hooks';
import http from 'http';
import https from 'https';

import { refreshCredentialsIfNecessary, maxYtdlRetries, QueueItem, MusicWorkerResult, DEBUG_WORKER, directStreamMacro } from './music';

const maxPlaylistSize = 1000;
const maxYoutubeSearchBatchSize = 100;
const utf8Macro = 'utf-8';

export async function getSong(search_query: string): Promise<MusicWorkerResult | undefined> {
 
    let validation: string | boolean | undefined = undefined;
    try {
        if (search_query.startsWith(directStreamMacro)) {
            let splitLinks = search_query.replace(directStreamMacro, '').split(' ');
            let songName = 'DirectStream';
            let itemList = [];
    
            for (const link of splitLinks)
            {
                const requestModule = link.startsWith('http://') ? http : https;
                const req = requestModule.request(link, { method: 'GET' });
                req.end();
    
                const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
                    req.on('response', resolve);
                    req.on('error', reject);
                });
                
                // Extract filename from context disposition using regex
                const contentDisposition = res.headers['content-disposition'] ?? '';
                const filenamePattern = /filename\*[^;=\n]*=([^;\n]*)/i;
                const filenameMatches = contentDisposition.match(filenamePattern);
    
                if (!(filenameMatches && filenameMatches.length >= 2)) {
                    return;
                }
    
                // Remove UTF-8 macro inside the string
                let filename = decodeURIComponent(filenameMatches[1].replace(/['"]/g, ''));
                if (filename.toLowerCase().startsWith(utf8Macro)) {
                    filename = filename.substring(utf8Macro.length);
                }
    
                // Remove file extension if it exists
                let extensionIndex = filename.lastIndexOf('.');
                if (extensionIndex != -1) {
                    filename = filename.substring(0, extensionIndex);
                }
    
                itemList.push(new QueueItem(`${directStreamMacro}${link}`, filename, 0))
            }
    
            return new MusicWorkerResult(itemList, `${songName} playlist`);
        }
    
        await refreshCredentialsIfNecessary();
    
        validation = await validate(search_query);
        let link;
    
        if (validation === false)
            return undefined;
    
        if (validation === 'search') { // Not a link, search on youtube instead
            let song = await searchTrackOnYoutube(search_query);
    
            if (song == undefined) {
                return undefined;
            }
    
            return new MusicWorkerResult([song]);
        }
        
        if (validation === 'yt_video') {
            link = search_query;
              
            let info: YouTubeVideo | undefined = undefined;
    
            let retryCount = 0;
            while (retryCount < maxYtdlRetries) {
                try {
                    info = (await video_basic_info(link)).video_details;
                    break;
                }
                catch (e: any) {
                    retryCount++;
                    let deltaRetries = maxYtdlRetries - retryCount;
    
                    if (e.message.includes("Sign in to confirm your age")) {
                        let errorMsg = "The video is age restricted, skipping.";
                        console.log(errorMsg);
                        return new MusicWorkerResult([], undefined, 'age');
                    }
    
                    console.log('Exception raised when using ytdl, remaning retries: ' + deltaRetries);
                    console.log(e);
                }
            }
    
            if (info == undefined || retryCount >= maxYtdlRetries) {
                console.log('Failed to get info from this song, something went wrong.');
                return undefined;
            }
    
            return new MusicWorkerResult([new QueueItem(info.url, info.title ?? "", info.durationInSec)]);
        }
    
        if (validation === 'yt_playlist') {
            try {
                const playlist = await playlist_info(search_query, { incomplete : true });
                const videos = await playlist.all_videos();
                
                if (videos.length > maxPlaylistSize) {
                    videos.splice(maxPlaylistSize);
                }
    
                return new MusicWorkerResult(videos.map(x=>new QueueItem(x.url, x.title ?? "", x.durationInSec)), playlist.title);
            }
            catch (err) {
                console.log(err);
                return undefined;
            }
        }
    
        if (validation === 'sp_track') {
    
            let spotifyObj = await spotify(search_query) as SpotifyTrack;
            let song = await searchTrackOnYoutube(convertSpotifyTrackToYoutubeTrackName(spotifyObj));
            
            if (song == undefined) {
                return undefined;
            }
    
            return new MusicWorkerResult([song]);
        }
    
        if (validation === 'sp_album') {
            const album = await spotify(search_query) as SpotifyAlbum;
            const spotifyTracks = await album.all_tracks();
            const trackNameArr = spotifyTracks.map(track => convertSpotifyTrackToYoutubeTrackName(track));
            const youtubeTracks = await searchArrayOfTracksOnYoutube(trackNameArr);
    
            if (youtubeTracks == undefined) {
                return undefined;
            }
    
            return new MusicWorkerResult(youtubeTracks, album.name);
    
        }
      
        if (validation === 'sp_playlist') {
            const playlist = await spotify(search_query) as SpotifyPlaylist;
            const spotifyTracks = await playlist.all_tracks();
            const trackNameArr = spotifyTracks.map(track => convertSpotifyTrackToYoutubeTrackName(track));
            const youtubeTracks = await searchArrayOfTracksOnYoutube(trackNameArr);
    
            if (youtubeTracks == undefined) {
                return undefined;
            }
    
            return new MusicWorkerResult(youtubeTracks, playlist.name);
        }
    }
    catch {
        console.log(`Failed to search ${validation ?? 'undefined'} for the query ${search_query}`);
    }

    return undefined;
}


function convertSpotifyTrackToYoutubeTrackName(track: SpotifyTrack): string {
    // Concatenate all artist names and adds the track name at the end
    return track.artists.map(elem => elem.name).join(' ') + ' - ' + track.name;
}

async function searchTrackOnYoutube(trackName: string): Promise<QueueItem | undefined> {
    try {
        const result = await search(trackName, { source : { youtube : "genericvideo" }, limit: 1, fuzzy: true, language: 'pt-PT' });

        if (result.length === 0) {
            return undefined;
        }

        const firstResult = result[0];

        return new QueueItem(firstResult.url, firstResult.title ?? "", firstResult.durationInSec);
    }
    catch (err) {
        console.log(err);
        return undefined;
    }
}


async function searchArrayOfTracksOnYoutube(trackNameArray: string[]): Promise<QueueItem[] | undefined> {
    try {
        let startTime = performance.now();

        let values: PromiseSettledResult<YouTubeVideo[]>[] = [];
        for (let i = 0; ; i++)
        {
            let startIndex = i*maxYoutubeSearchBatchSize;
            let endIndex = (i+1)*maxYoutubeSearchBatchSize;

            if (startIndex >= trackNameArray.length)
                break;

            if (endIndex >= trackNameArray.length)
                endIndex = trackNameArray.length;

            let trackNameSlice = trackNameArray.slice(startIndex, endIndex);
            let promiseArr: Promise<YouTubeVideo[]>[] = [];
            for (const trackName of trackNameSlice) {
                promiseArr.push(search(trackName, { source : { youtube : "genericvideo" }, limit: 1, fuzzy: true, language: 'pt-PT' }));
            }
    
            values = values.concat(await Promise.allSettled(promiseArr));
        }

        let songArr: QueueItem[] = [];
        let firstResult;
        for (const elem of values) {

            if (elem.status === 'fulfilled') {
                if (elem.value.length > 0) {
                    firstResult = elem.value[0];
                    songArr.push(new QueueItem(firstResult.url, firstResult.title ?? "", firstResult.durationInSec));
                }
            }
            else {
                console.log("erro");
                console.log(JSON.stringify(elem));
            }
        }

        let endTime = performance.now()
        console.log(`searchArrayOfTracksOnYoutube took ${endTime - startTime} milliseconds`)

        return songArr;
    }
    catch (err) {
        console.log(err);
        return undefined;
    }
}

if (!DEBUG_WORKER) {
    // create a worker and register public functions
    workerpool.worker({
        getSong: getSong
    })
}
