const axios = require('axios').default;

const common = require('../common');


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
    params.append('user_login', 'inygontv1');
    params.append('user_login', 'inygontv2');
    params.append('user_login', 'inygontv3');

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
        let announceStr = "";

        if (data.length === 0) {
            return;
        }

        else if (data.length === 1) { 
            announceStr += data[0].user_name + " is live";
        }

        else {
            for (let i = 0; i < data.length; i++) {

                let stream = data[i];

                if (i === data.length - 1) {
                    announceStr += " and ";
                }

                announceStr += stream.user_name;

                if (i < data.length - 2) {
                    announceStr += ", "
                }
            }

            announceStr += " are live";
        }

        console.log(announceStr);

    }).catch(async (err) => {

        if (err.response.status === 401) {
            await requestTwitchToken();

            exports.checkForStream();
        }
    })


}