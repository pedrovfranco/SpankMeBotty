const axios = require('axios').default;

const common = require('../common/common');
const InygonAnnounceList = require('../database/models/inygonAnnounceList');

let streams = [{ name: 'inygontv1', live: false }, { name: 'inygontv2', live: false }, { name: 'inygontv3', live: false }];
let firstRun = true;

function requestTwitchToken() {

    console.log("Requesting twitch OAuth token...");

    return new Promise((resolve, reject) => {
        axios({
            url: 'https://id.twitch.tv/oauth2/token',
            method: 'POST',
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        }).then(response => {

            common.registerTwitchToken(response.data);

            resolve(true);

        }).catch(err => {
            console.log(err.message);

            reject(err.message);
        })
    });
}

exports.checkForStream = async () => {
    
    let params = new URLSearchParams();

    for (const stream of streams) {
        params.append('user_login', stream.name);
    }

    axios({
        url: 'https://api.twitch.tv/helix/streams',
        method: 'GET',
        headers: {
            'client-id': process.env.TWITCH_CLIENT_ID,
            'Authorization': `${common.twitchToken.token_type} ${common.twitchToken.access_token}`
        },
        params: params

    }).then(response => {

        let data = response.data.data.filter(element => element.type === 'live');

        for (const element of data) {
            element.user_name = element.user_name.toLowerCase();
        }

        let streamsToBeAnnounced = data.filter(element => !isStreamLive(element.user_name));
        let announceStr = "";

        if (streamsToBeAnnounced.length > 0 && !firstRun) {
       
            if (streamsToBeAnnounced.length === 1) {
                announceStr += streamsToBeAnnounced[0].user_name + " is live";
            }

            else {
                for (let i = 0; i < streamsToBeAnnounced.length; i++) {

                    let stream = streamsToBeAnnounced[i];

                    if (i === streamsToBeAnnounced.length - 1) {
                        announceStr += " and ";
                    }

                    announceStr += stream.user_name;

                    if (i < streamsToBeAnnounced.length - 2) {
                        announceStr += ", "
                    }
                }

                announceStr += " are live";
            }

            announceStr += ".\n";

            InygonAnnounceList.find({}, (err, result) => {

                if (err) {
                    console.log(err);
                    return;
                }

                if (result.length === 0)
                    return;

                for (const user of result) {
                    announceStr += user.name + " ";
                }

                // Send announceStr to announcements channel
                common.client.channels.fetch('754500520936341576')
                    .then(channel => channel.send(announceStr));
            })
        }
        
        // Update streams status according to 'data' array
        for (let i = 0; i < streams.length; i++) {
            const element = streams[i];

            let found = false;
            for (const liveElem of data) {
                if (liveElem.user_name === element.name) {
                    found = true;
                    break;
                }
            }

            element.live = found;
        }

        firstRun = false;

    }).catch(async (err) => {

        if (err.response !== undefined) {
            if (err.response.status === 401) {
                await requestTwitchToken();

                exports.checkForStream();
            }
        }
        else {
            console.log(err.stack);
        }
    })
}


function isStreamLive(name) {
    for (let i = 0; i < streams.length; i++) {
        if (streams[i].name === name)
            return streams[i].live;
    }

    return false;
}
