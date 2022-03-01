const workerpool = require('workerpool');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');
const playdl = require('play-dl');

const music = require('./music');

const maxPlaylistSize = 2000;

exports.getSong = getSong;

async function getSong(search_query) {

    const youtubeLinkRegex = /^(https?\:\/\/)?(www\.)?youtube\.com/g;
    const videoLinkRegex = /^(https?\:\/\/)?(www\.)?youtube\.com\/watch\?v\=.+/g;
    const playlistLinkRegex = /^(https?\:\/\/)?(www\.)?youtube\.com\/playlist\?list\=.+/g;
    let link;

    if (youtubeLinkRegex.test(search_query)) {

        if (videoLinkRegex.test(search_query)) {
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
        else if (playlistLinkRegex.test(search_query)) {

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
        else {  // Unknown youtube link
            return null;
        }
    }
    else {
        try {
                
            //---------------------------LEGACY SEARCH---------------------------

            // const baseSearchLink = 'https://www.youtube.com/results?search_query=';
            // const searchLink = baseSearchLink + encodeURIComponent(search_query);
    
            // console.log(searchLink);
    
            // // Fetch youtube's search page
            // let response = await axios({
            //     method: 'GET',
            //     url: searchLink
            // });
    
            // // const $ = cheerio.load(response.data);
            // let lines = response.data.split('\n');
    
            // // let json = $('body > script:nth-child(16)').html(); // This script tag contains the search results in json
            // let json = lines[190];
    
            // // json = json.split('\n')[1]; // Select second line
            // json = json.substr(30); // Remove youtube's js code from the JSON
            // json = json.substr(0, json.length - 1); // Remove last character which is a semicolon
    
            // const jsonObject = JSON.parse(json);
            // let videos = jsonObject['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents'];
            // let contentIndex;
            // let foundContentIndex = false;
            // for (contentIndex = 0; contentIndex < videos.length; contentIndex++) {
    
            //     // Search for video renderer object
            //     for (const item of videos[contentIndex]['itemSectionRenderer']['contents']) {
            //         if (item['videoRenderer'] !== undefined) {
            //             foundContentIndex = true;
            //             break;
            //         }
            //     }
    
            //     if (foundContentIndex) {
            //         break;
            //     }
            // }
    
            // videos = videos[contentIndex]['itemSectionRenderer']['contents']; // Select search results
            // videos = videos.filter(value => value['videoRenderer'] !== undefined); // Select only youtube videos (ignore playlists and such)
            // videos = videos.map(element => {
            //     let cleanElement = element['videoRenderer'];
    
            //     let newElement = {};
            //     newElement['title'] = cleanElement['title']['runs'][0]['text'];
            //     newElement['videoId'] = cleanElement['videoId'];
            //     newElement['link'] = 'https://www.youtube.com/watch?v=' + newElement['videoId'];
            //     newElement['length'] = cleanElement['lengthText']['simpleText'];
    
            //     return newElement;
            // })
    
            // if (videos.length === 0) {
            //     return null;
            // }
    
            // link = videos[0]['link'];
    
            //---------------------------YTSR package---------------------------

            // let result = (await ytsr(search_query, { safeSearch: false, limit: 20})).items.filter(value => value.type === 'video');
            const result = await playdl.search(search_query, { source : { youtube : "video" }, limit: 20, fuzzy: true, language: 'pt-PT' });

            if (result.length === 0)
                return null;

            const firstResult = result[0];

            console.log(firstResult.title);
            console.log(firstResult.url);

            // let info = await ytdl.getInfo(firstResult.url, music.ytdlOptions);
        
            // return {songArr: [generateSongObject(info.videoDetails.video_url, info.videoDetails.title, info.videoDetails.lengthSeconds)]};

            return {songArr: [generateSongObject(firstResult.url, firstResult.title, firstResult.durationInSec)]};
        }
        catch (err) {
            console.log(err);
            return null;
        }
    }
}


function generateSongObject(link, title, lengthSeconds) {
    return {
        link: link,
        title: title,
        lengthSeconds: lengthSeconds
    };
}

// create a worker and register public functions
workerpool.worker({
    getSong: getSong
})