const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');

exports.queue = [];
exports.currentVideoDetails;
exports.progress = 0;

exports.voiceConnection;
exports.currentStream;
exports.streamDispatcher;

exports.addToQueue = async (message, link) => {
    
    return new Promise( async (resolve, reject) => {
        try {

            exports.voiceConnection = await message.member.voice.channel.join();
            exports.currentStream = await ytdl(link, { 
                filter: 'audioonly',
                quality: 'highestaudio',
            });

            exports.currentStream.on('info', (info) => {
                exports.currentVideoDetails = info.videoDetails;

                let filepath = path.join(__dirname, '..', 'music_files', exports.currentVideoDetails.videoId + '.webm')
                let videoWritableStream = fs.createWriteStream(filepath);

                let stream = exports.currentStream.pipe(videoWritableStream);

                stream.on('finish', function () {

                    stream = fs.createReadStream(filepath);

                    exports.streamDispatcher = exports.voiceConnection.play(stream);

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

function playNextSong() {

}