const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');

exports.queue = [];
exports.currentVideoDetails;
exports.progress = 0;

exports.voiceConnection;
exports.currentStream;
exports.streamDispatcher;

const musicDirectory = path.join(__dirname, '..', 'music_files');

exports.addToQueue = async (message, link) => {
    
    return new Promise( async (resolve, reject) => {
        try {

            exports.voiceConnection = await message.member.voice.channel.join();

            await cleanMusicDirectory()
            .catch(err => {
                reject(err);
            });

            exports.currentStream = await ytdl(link, { 
                filter: 'audioonly',
                quality: 'highestaudio',
            });

            exports.currentStream.on('info', (info) => {
                exports.currentVideoDetails = info.videoDetails;

                let filepath = path.join(musicDirectory, exports.currentVideoDetails.videoId + '.webm')
                let videoWritableStream = fs.createWriteStream(filepath);

                let stream = exports.currentStream.pipe(videoWritableStream);

                stream.on('finish', function () {

                    exports.currentStream = fs.createReadStream(filepath);

                    exports.streamDispatcher = exports.voiceConnection.play(exports.currentStream);

                    exports.streamDispatcher.on('error', err => {
                        console.log(err);
                    })

                    resolve(exports.streamDispatcher);
                });
            });
        }
        catch (exception) {
            reject(exception);
        }
    })

}

async function cleanMusicDirectory() {
    return new Promise( async (resolve, reject) => {

        // Prevent read error on already playing stream
        if (exports.streamDispatcher !== undefined) {
            await exports.streamDispatcher.pause();
            await exports.streamDispatcher.destroy();
        }

        if (exports.currentStream !== undefined) {
            exports.currentStream.close();
        }

        fs.readdir(musicDirectory, (err, files) => {
            if (err) {
                reject(err);
                return;
            }

            for (const file of files) {

                if (file !== '.gitkeep') {
                    fs.unlink(path.join(musicDirectory, file), err => {
                        if (err) {
                            reject(err);
                            return;
                        }
                    });
                }
            }

            resolve(true);
        });
    });
}

function playNextSong() {

}