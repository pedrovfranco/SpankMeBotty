const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');
const workerpool = require('workerpool');

const common = require('./common');

exports.guilds = [];
exports.ytdlOptions = { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 5 * 1024 * 1024 }; // Buffer size of 5 MB

const musicDirectory = path.join(__dirname, '..', 'music_files');
const pool = workerpool.pool(path.join(__dirname, 'music_worker.js'), {maxWorkers: 4, workerType: 'thread'});

exports.addToQueue = async (message, search_query) => {

    addGuild(message);

    const guildId = message.guild.id;
    let guild = exports.guilds[guildId];

    pool.exec('getSong', [search_query])
    .then(result => {

        let info = result;

        if (info === null) {
            message.channel.send('Video not found');
            return;
        }

        guild.queue.push({ link: info.videoDetails.video_url, info: info.videoDetails, playing: false });

        // Not playing
        if (guild.playing === -1) {
            playNextSong(guild);
        }

    })
    .catch(err => {
        console.log(err);
    });
}


async function playNextSong(guild) {

    return new Promise(async (resolve, reject) => {
        try {
            if (guild.queue.length !== 0) {

                // If not playing anything go to the start of the queue
                if (guild.playing === -1) {
                    guild.playing = 0;
                }

                // If hit the end of the queue
                if (guild.playing >= guild.queue.length) {
                    return;
                }

                const video = guild.queue[0];
                const link = video.link;

                guild.voiceConnection = await guild.message.member.voice.channel.join();

                // await cleanMusicDirectory(guild)
                // .catch(err => {
                //     reject(err);
                // });

                guild.currentStream = await ytdl(link, exports.ytdlOptions);
                guild.currentVideoDetails = video.info;

                guild.message.channel.send('Playing: ' + video.info.title);

                // const guildMusicDirectory = path.join(musicDirectory, guild.guildId);
                // fs.mkdirSync(guildMusicDirectory, { recursive: true });

                // const filepath = path.join(guildMusicDirectory, guild.currentVideoDetails.videoId + '.webm')
                // let videoWritableStream = fs.createWriteStream(filepath);
                // let stream = guild.currentStream.pipe(videoWritableStream);

                // stream.on('finish', function () {

                //     guild.currentStream = fs.createReadStream(filepath);

                guild.streamDispatcher = guild.voiceConnection.play(guild.currentStream/* , { highWaterMark: 1 } */);
                    guild.streamDispatcher.guild = guild;

                    guild.streamDispatcher.on('error', err => {
                        console.log(err);
                    })

                    guild.streamDispatcher.on('start', () => {
                        guild.streamDispatcher.on('speaking', onSongPlayingOrStopping);
                    })

                    resolve(guild.streamDispatcher);
                // });
            }
            else {

                console.log();

                guild.playing = -1;
            }
        }
        catch (exception) {
            if (exception.message.startsWith('No video id found')) {
                common.alertAndLog(guild.message, "Link must be a video");
            }
            else {
                common.alertAndLog(guild.message, "Failed to play, the link is probably broken");
            }

            reject(exception);
        }
    });
}

// this evaluates to the streamDispatcher
async function onSongPlayingOrStopping(speaking) {

    const guild = this.guild;
    const video = guild.queue[guild.playing];

    if (speaking === 1) {
        video.playing = true;
        return;
    }

    if (video.playing && !guild.paused && speaking === 0) {

        await exports.skipCurrentSong(this.guild);
    }
}

exports.skipCurrentSong = (guild) => {
    return new Promise( async (resolve, reject) => {
        await exports.stopPlaying(guild);

        guild.queue.splice(guild.playing, 1);

        playNextSong(guild);

        resolve(true);
    });
}

exports.pause = (guild) => {

    if (guild.streamDispatcher !== undefined) {
        if (guild.paused) {
            return false;
        }
        else {
            guild.paused = true;
            guild.streamDispatcher.pause(false);
            return true;
        }
    }
}

exports.resume = (guild) => {

    if (guild.streamDispatcher !== undefined) {
        if (guild.paused) {
            guild.paused = false;
            guild.streamDispatcher.resume();
            return true; 
        }
        else {
            return false;
        }
    }
}


exports.stopPlaying = (guild) => {
    return new Promise(async (resolve, reject) => {

        if (guild.streamDispatcher !== undefined) {
            await guild.streamDispatcher.removeListener('speaking', onSongPlayingOrStopping);
            
            await guild.streamDispatcher.pause();
            await guild.streamDispatcher.destroy();
        }

        if (guild.currentStream !== undefined) {
            await guild.currentStream.pause();
            await guild.currentStream.destroy();
        }

        resolve(true);
    });
}

exports.clearQueue = (guild) => {
    return new Promise(async (resolve, reject) => {

        if (guild.playing === -1) {
            guild.queue.length = 0;
        }
        else {
            guild.queue = [guild.queue[guild.playing]];
            guild.playing = 0;
        }

        resolve(true);

    });
}


async function cleanMusicDirectory(guild) {
    return new Promise(async (resolve, reject) => {

        const guildMusicDirectory = path.join(musicDirectory, guild.guildId);

        // Prevent read error on already playing stream
        await exports.stopPlaying(guild);

        fs.readdir(guildMusicDirectory, (err, files) => {
            if (err) {
                resolve(true);
                return;
            }

            for (const file of files) {

                if (file !== '.gitkeep') {
                    fs.unlink(path.join(guildMusicDirectory, file), err => {
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

function addGuild(message) {

    const guildId = message.guild.id;
    let guild;

    if (exports.guilds[guildId] === undefined) {
        guild = {};

        guild.queue = [];
        guild.currentVideoDetails;
        guild.playing = -1;
        guild.paused = false;
        guild.guildId = guildId;

        guild.voiceConnection;
        guild.currentStream;
        guild.streamDispatcher;

        exports.guilds[guildId] = guild;
    }
    else {
        guild = exports.guilds[guildId];
    }

    guild.message = message;
}

exports.getGuild = (message) => {

    addGuild(message);

    return exports.guilds[message.guild.id];
}