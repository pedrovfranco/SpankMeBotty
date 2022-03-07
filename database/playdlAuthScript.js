
const fs = require('fs');
const playdlAuth = require('./models/playdlAuth');
const path = require('path');
require('./mongo');

const basePath = path.join(__dirname, '..', '.data',);

async function UploadAuth() {

    let spotifyAuthStr = undefined;
    try {
        spotifyAuthStr = fs.readFileSync(path.join(basePath, 'spotify.data'), {encoding: 'utf8'});
    }
    catch(e){
        console.log('Failed to read spotify.data');
    }

    let youtubeAuthStr = undefined;
    try {
        youtubeAuthStr = fs.readFileSync(path.join(basePath, 'youtube.data'), {encoding: 'utf8'});
    }
    catch(e){
        console.log('Failed to read youtube.data');
    }

    playdlAuth.findOneAndUpdate({}, { spotifyAuth: spotifyAuthStr, youtubeAuth: youtubeAuthStr }).orFail()
    .then((result) => {

        console.log('Successfully updated auth');

    })
    .catch((err) => {
        const newAuth = new playdlAuth({
            spotifyAuth: spotifyAuthStr,
            youtubeAuth: youtubeAuthStr
        });

        newAuth.save()
        .then(mapping => {
            console.log('Saved playdl auth');
        })
        .catch(err => {
            let errorMsg = 'Failed to save ' + emoteName;

            if (err.code === 11000) {
                errorMsg += ', name already exists';
            }
            else {
                errorMsg += ', unknown error';
                console.log(err);
            }
        });
    })
}

async function GetAuthFromDb() {
    playdlAuth.findOne({}).orFail()
    .then((result) => {

        fs.mkdir(basePath, (err) => {
            try {
                if (result.spotifyAuth != null) {
                    fs.writeFileSync(path.join(basePath, 'spotify.data'), result.spotifyAuth, {encoding: 'utf8'});
                }
                if (result.youtubeAuth != null) {
                    fs.writeFileSync(path.join(basePath, 'youtube.data'), result.youtubeAuth, {encoding: 'utf8'});
                }

                console.log('Successfully saved play-dl auth');
            }
            catch (e) {
                console.log(e);
            }
        })
    })
    .catch((err) => {
        console.log(err);
    })
}

exports.UploadAuth = UploadAuth;
exports.GetAuthFromDb = GetAuthFromDb;