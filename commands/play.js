const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const common = require('../common/common');
const music = require('../common/music');

const baseSearchLink = 'https://www.youtube.com/results?search_query=';

let browser;
let page;

module.exports = {
    name: 'play',
    description: 'Plays music from youtube',
    args: true,
    minargs: 1,
    alias: ['p'],
    usage: '<youtube_link_or_search_query>',
    execute,
};


async function execute(message, args) {

    const search_query = args.join(' ');
    const expression = /^(https?\:\/\/)?(www\.)?youtube\.com/g;
    
    if (expression.test(search_query)) {
        music.addToQueue(message, search_query);
    }
    else {

        const searchLink = baseSearchLink + encodeURIComponent(search_query);

        // Fetch youtube's search page
        axios({
            method: 'GET',
            url: searchLink
        })
        .then(response => {

            const $ = cheerio.load(response.data);

            let json = $('body > script:nth-child(16)').html(); // This script tag contains the search results in json
            json = json.split('\n')[1]; // Select second line
            json = json.substr(30); // Remove youtube's js code from the JSON
            json = json.substr(0, json.length - 1); // Remove last character which is a semicolon

            const jsonObject = JSON.parse(json);
            let videos = jsonObject['contents']['twoColumnSearchResultsRenderer']['primaryContents']['sectionListRenderer']['contents'];
            let contentIndex;
            for (contentIndex = 0; contentIndex < videos.length; contentIndex++) {

                if (videos[contentIndex]['itemSectionRenderer']['contents'][0]['carouselAdRenderer'] === undefined) {
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

            music.addToQueue(message, videos[0].link);
        })
    }
}