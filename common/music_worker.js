const workerpool = require('workerpool');
// const ytdl = require('ytdl-core');
// const ytsr = require('ytsr');
// const ytpl = require('ytpl');
const playdl = require('play-dl');

const music = require('./music');

const maxPlaylistSize = 2000;

exports.getSong = getSong;

async function getSong(search_query) {

    await music.refreshCredentialsIfNecessary();

    const youtubeLinkRegex = /^(https?\:\/\/)?(www\.)?youtube\.com/g;
    const videoLinkRegex = /^(https?\:\/\/)?(www\.)?youtube\.com\/watch\?v\=.+/g;
    const playlistLinkRegex = /^(https?\:\/\/)?(www\.)?youtube\.com\/playlist\?list\=.+/g;
    const validation = await playdl.validate(search_query);
    let link;

    if (validation === false)
        return null;

    if (validation === 'search') { // Not a link, search on youtube instead
        return {songArr: [await searchTrackOnYoutube(search_query)]};
    }
    
    if (validation === 'yt_video') {
        link = search_query;
          
        let info;

        let retryCount = 0;
        while (retryCount < music.maxYtdlRetries) {
            try {
                // info = await ytdl.getInfo(link, music.ytdlOptions);
                info = (await playdl.video_basic_info(link)).video_details;
                break;
            }
            catch (e) {
                retryCount++;
                let deltaRetries = music.maxYtdlRetries - retryCount;
                console.log('Exception raised when using ytdl, remaning retries: ' + deltaRetries);
                console.log(e);
            }
        }

        if (retryCount >= music.maxYtdlRetries) {
            console.log('Failed to get info from this song, something went wrong.');
            return null;
        }

        // return {songArr: [generateSongObject(info.videoDetails.video_url, info.videoDetails.title, info.videoDetails.lengthSeconds)]};
        return {songArr: [generateSongObject(info.url, info.title, info.durationInSec)]};
    }

    if (validation === 'yt_playlist') {
        try {
            // const playlist = await ytpl(search_query, { limit: maxPlaylistSize });
            const playlist = await playdl.playlist_info(search_query, { incomplete : true });
            const videos = await playlist.all_videos();
            let resultArr = [];

            // for (let i = 0; i < playlist.items.length; i++) {
            for (let i = 0; i < videos.length && i < maxPlaylistSize; i++) {
                // let item = playlist.items[i];
                let item = videos[i];
                // resultArr.push(generateSongObject(item.shortUrl, item.title, item.durationSec));
                resultArr.push(generateSongObject(item.url, item.title, item.durationInSec));
            }

            return {songArr: resultArr, playlistTitle: playlist.title};
        }
        catch (err) {
            console.log(err);
            return null;
        }
    }

    if (validation === 'sp_track') {

        let spotifyObj = await playdl.spotify(search_query);

        return {songArr: [await searchTrackOnYoutube(convertSpotifyTrackToYoutubeTrack(spotifyObj))]};
    }

    if (validation === 'sp_album') {
        const album = await playdl.spotify(search_query);
        const spotifyTracks = await album.all_tracks();

        return {songArr: await searchArrayOfTracksOnYoutube(spotifyTracks.map(track => convertSpotifyTrackToYoutubeTrack(track))), playlistTitle: album.name};
    }
  
    if (validation === 'sp_playlist') {
        const playlist = await playdl.spotify(search_query);
        // const spotifyTracks = await playlist.all_tracks();

        return {songArr: await searchArrayOfTracksOnYoutube((await playlist.all_tracks()).map(track => convertSpotifyTrackToYoutubeTrack(track))), playlistTitle: playlist.name};
    }

}


function generateSongObject(link, title, lengthSeconds) {
    return {
        link: link,
        title: title,
        lengthSeconds: lengthSeconds
    };
}

function convertSpotifyTrackToYoutubeTrack(spotifyTrack) {

    if (spotifyTrack.type !== 'track') {
        return null;
    }

    // Concatenate all artist names and adds the track name at the end
    return spotifyTrack.artists.map(elem => elem.name).join(' ') + ' - ' + spotifyTrack.name;
}

async function searchTrackOnYoutube(trackName) {
    try {

        // let result = (await ytsr(search_query, { safeSearch: false, limit: 20})).items.filter(value => value.type === 'video');
        const result = await playdl.search(trackName, { source : { youtube : "genericvideo" }, limit: 1, fuzzy: true, language: 'pt-PT' });

        if (result.length === 0)
            return null;

        const firstResult = result[0];

        console.log(firstResult.title);
        console.log(firstResult.url);

        // let info = await ytdl.getInfo(firstResult.url, music.ytdlOptions);
    
        // return {songArr: [generateSongObject(info.videoDetails.video_url, info.videoDetails.title, info.videoDetails.lengthSeconds)]};

        return generateSongObject(firstResult.url, firstResult.title, firstResult.durationInSec);
    }
    catch (err) {
        console.log(err);
        return null;
    }
}


async function searchArrayOfTracksOnYoutube(trackArray) {
    try {

        let promiseArr = [];
        let songArr = [];
        for (const trackName of trackArray) {
            promiseArr.push(playdl.search(trackName, { source : { youtube : "genericvideo" }, limit: 1, fuzzy: true, language: 'pt-PT' }));
            // let result = (await ytsr(search_query, { safeSearch: false, limit: 20})).items.filter(value => value.type === 'video');
        }

        let values = await Promise.allSettled(promiseArr);
        let firstResult;
        for (const elem of values) {
            if (elem.status === 'fulfilled' && elem.value.length > 0) {
                firstResult = elem.value[0];
                
                console.log(firstResult.title);
                console.log(firstResult.url);
        
                songArr.push(generateSongObject(firstResult.url, firstResult.title, firstResult.durationInSec));
            }
        }

        return songArr;
    }
    catch (err) {
        console.log(err);
        return null;
    }
}


// create a worker and register public functions
workerpool.worker({
    getSong: getSong
})
