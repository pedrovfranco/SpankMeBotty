import fs from 'fs';
import playdlAuth from './models/playdlAuth';
import path from 'path';

const basePath = path.join(__dirname, '..', '..', '.data',);

const saveToFiles = false;

export async function UploadAuth() {

    let spotifyAuthStr: string | undefined = undefined;
    try {
        spotifyAuthStr = fs.readFileSync(path.join(basePath, 'spotify.data'), {encoding: 'utf8'});
    }
    catch(e){
        console.log('Failed to read spotify.data');
    }

    let youtubeAuthStr: string | undefined = undefined;
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
            let errorMsg = 'Failed to save ';

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

export async function GetAuthFromDb() {
    try {
        let result = await playdlAuth.findOne({}).orFail();

        if (saveToFiles) {
            fs.mkdirSync(basePath, {recursive: true});
            if (result.spotifyAuth != null) {
                fs.writeFileSync(path.join(basePath, 'spotify.data'), result.spotifyAuth, {encoding: 'utf8'});
            }
            if (result.youtubeAuth != null) {
                fs.writeFileSync(path.join(basePath, 'youtube.data'), result.youtubeAuth, {encoding: 'utf8'});
            }
            console.log('Successfully saved play-dl auth');
        }

        return result;
    }
    catch(err) {
        console.log(err);
        return undefined;
    }
}
