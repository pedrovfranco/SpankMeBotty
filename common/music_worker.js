const workerpool = require('workerpool');
const axios = require('axios').default;
const path = require('path');
const cheerio = require('cheerio');
const ytdl = require('ytdl-core');

const music = require('./music');

const baseSearchLink = 'https://www.youtube.com/results?search_query=';


async function getSong(search_query) {

    const linkRegex = /^(https?\:\/\/)?(www\.)?youtube\.com/g;
    let link;

    if (linkRegex.test(search_query)) {
        link = search_query;
    }
    else {

        const searchLink = baseSearchLink + encodeURIComponent(search_query);

        console.log(searchLink);

        // Fetch youtube's search page
        let response = await axios({
            method: 'GET',
            url: searchLink
        });

        // const $ = cheerio.load(response.data);
        let lines = response.data.split('\n');

        // let json = $('body > script:nth-child(16)').html(); // This script tag contains the search results in json
        let json = lines[190];

        // json = json.split('\n')[1]; // Select second line
        json = json.substr(30); // Remove youtube's js code from the JSON
        json = json.substr(0, json.length - 1); // Remove last character which is a semicolon

        const jsonObject = JSON.parse(json);
        let videos = jsonObject['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents'];
        let contentIndex;
        let foundContentIndex = false;
        for (contentIndex = 0; contentIndex < videos.length; contentIndex++) {

            // Search for video renderer object
            for (const item of videos[contentIndex]['itemSectionRenderer']['contents']) {
                if (item['videoRenderer'] !== undefined) {
                    foundContentIndex = true;
                    break;
                }
            }

            if (foundContentIndex) {
                break;
            }
        }

        videos = videos[contentIndex]['itemSectionRenderer']['contents']; // Select search results
        videos = videos.filter(value => value['videoRenderer'] !== undefined); // Select only youtube videos (ignore playlists and such)
        videos = videos.map(element => {
            let cleanElement = element['videoRenderer'];

            let newElement = {};
            newElement['title'] = cleanElement['title']['runs'][0]['text'];
            newElement['videoId'] = cleanElement['videoId'];
            newElement['link'] = 'https://www.youtube.com/watch?v=' + newElement['videoId'];
            newElement['length'] = cleanElement['lengthText']['simpleText'];

            return newElement;
        })

        if (videos.length === 0) {
            return null;
        }

        link = videos[0]['link'];
    }

    let info = await ytdl.getInfo(link, music.ytdlOptions);
    
    return info;
}


// create a worker and register public functions
workerpool.worker({
    getSong: getSong
})