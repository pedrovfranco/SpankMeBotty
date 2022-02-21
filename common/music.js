const {createAudioPlayer, entersState, VoiceConnectionStatus, joinVoiceChannel, demuxProbe, createAudioResource, AudioPlayerStatus, getVoiceConnection} = require("@discordjs/voice");
const { ChannelTypes } = require("discord.js/src/util/Constants");

const ytdl = require('ytdl-core');
const path = require('path');
const workerpool = require('workerpool');

const common = require('./common');
const GuildSettings = require('../database/models/guildSettings');


exports.guilds = [];
exports.ytdlOptions = { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 5 * 1024 * 1024 }; // Buffer size of 5 MB

const DEBUG_WORKER = false;
const musicDirectory = path.join(__dirname, '..', 'music_files');
const pool = workerpool.pool(path.join(__dirname, 'music_worker.js'), {maxWorkers: 4, workerType: 'thread'});
exports.maxYtdlRetries = 3;


// Saves the guild information object to the exports.guilds array.
// This object contains information about the current state of the guild
// in regards to its voice connection and music playing
exports.addGuild = (interaction) => {

    const guildId = interaction.guild.id;
    let guild;

    if (exports.guilds[guildId] === undefined) {
        guild = {};

        guild.queue = [];
        guild.playing = -1;
        guild.paused = false;
        guild.guildId = guildId;
        guild.volume = 1.0;

        guild.voiceConnection;
        guild.audioPlayer;
        guild.ttsAudioPlayer;

        guild.currentStream;

        exports.guilds[guildId] = guild;
    }
    else {
        guild = exports.guilds[guildId];
    }

    guild.interaction = interaction;

    return guild;
}

exports.getGuild = (interaction) => {

    return exports.addGuild(interaction);
}

exports.addToQueue = async (interaction, search_query) => {

    if (!(ChannelTypes[interaction.channel.type] === ChannelTypes.GUILD_TEXT || 
        ChannelTypes[interaction.channel.type] === ChannelTypes.GUILD_VOICE || 
        ChannelTypes[interaction.channel.type] === ChannelTypes.GUILD_CATEGORY || 
        ChannelTypes[interaction.channel.type] === ChannelTypes.GUILD_NEWS || 
        ChannelTypes[interaction.channel.type] === ChannelTypes.GUILD_STORE || 
        ChannelTypes[interaction.channel.type] === ChannelTypes.GUILD_NEWS_THREAD || 
        ChannelTypes[interaction.channel.type] === ChannelTypes.GUILD_PUBLIC_THREAD || 
        ChannelTypes[interaction.channel.type] === ChannelTypes.GUILD_PRIVATE_THREAD || 
        ChannelTypes[interaction.channel.type] === ChannelTypes.GUILD_STAGE_VOICE)) {
        interaction.reply('Wrong channel, must be in a server (No DMs or group chats)');
        return;
    }

    if (interaction?.member?.voice?.channel?.id == null) {
        interaction.reply('User must be in a voice channel!');
        return;
    }

    let guild = exports.addGuild(interaction);

    // Since the "getSong" call of the pool exec call can be either queued or just take along time (looking at you, ytpl...) we will defer the reply
    // to let the discord API know we got the command successfully. It will also an "<application> is thinking..." message on the command reply field.
    await interaction.deferReply();

    if (DEBUG_WORKER) {
        const worker = require('./music_worker');

        worker.getSong(search_query);
    }
    else {
        pool.exec('getSong', [search_query])
        .then(async result => {

            if (result == null) {
                interaction.editReply('Video not found');
                return;
            }

            let videoList = result.songArr;
            let playlistTitle = result.playlistTitle;

            for (let i = 0; i < videoList.length; i++) {
                let videoElement = videoList[i];
                // console.log(videoElement);
                guild.queue.push(videoElement);
            }

            try {
                if (playlistTitle == null) {
                    if (videoList.length === 1)
                        interaction.editReply('Added: \"' + videoList[0].title + '\" to the music queue');
                }
                else {
                    interaction.editReply('Added playlist: \"' + playlistTitle + '\" with ' + videoList.length + ' songs to the music queue');
                }
            }
            catch (err) {
                console.log('Failed to reply to interaction!');
                console.log(err);
            }

            // Not playing
            if (guild.playing === -1) {
                await playNextSong(interaction, guild);
            }
        })
        .catch(err => {
            console.log(err);
        });
    }

}


async function playNextSong(interaction, guild) {

    if (interaction == null) {
        interaction = guild.interaction;
    }

    try {
        if (guild.queue.length !== 0) {

            // If not playing anything go to the start of the queue
            if (guild.playing === -1) {
                guild.playing = 0;
            }

            // If hit the end of the queue
            if (guild.playing >= guild.queue.length) {
                return false;
            }

            const video = guild.queue[0];
            const link = video.link;

            let connection = getVoiceConnection(guild.guildId);

            if (connection == null) {
                // From https://discordjs.guide/voice/voice-connections.html#cheat-sheet
                // If you try to call joinVoiceChannel on another channel in the same guild in which there is already an active voice connection, the existing voice connection switches over to the new channel.
                connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                // Checks to see if a voice connection got disconnected because either the bot was kicked or it just switched channels
                connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                        ]);
                        // Seems to be reconnecting to a new channel - ignore disconnect
                    } catch (error) {
                        // Seems to be a real disconnect which SHOULDN'T be recovered from
                        exports.destroyGuildConnection(guild);
                    }
                });
            }

            guild.voiceConnection = connection;

            let player = guild.audioPlayer;
            if (player == null) {
                player = createAudioPlayer();
                player.guildId = guild.guildId;
                player.guild = guild;
                player.connectionSubscription = connection.subscribe(player);
                guild.audioPlayer = player;
                    
                player.on('error', onAudioPlayerError);
            }

            let ytdlStream;
            let retryCount = 0;
            while (retryCount < exports.maxYtdlRetries) {
                ytdlStream = ytdl(link, exports.ytdlOptions)
                .catch(err => {
                    retryCount++;
                    let deltaRetries = exports.maxYtdlRetries - retryCount;
                    console.log('Exception raised when using ytdl, remaning retries: ' + deltaRetries);
                    console.log(e);
                    continue;
                });
                break;
            }

            if (retryCount >= exports.maxYtdlRetries) {
                let errMsg = 'Failed to play this song, something went wrong.';
                console.log(errMsg);
                interaction.channel.send(errMsg);

                exports.skipCurrentSong(guild);
            }

            guild.currentStream = ytdlStream;

            const resource = await probeAndCreateResource(ytdlStream);
            player.currentResource = resource;
            resource.volume.setVolume(guild.volume);

            player.play(resource);
            try {
                await entersState(player, AudioPlayerStatus.Playing, 5_000);
                // The player has entered the Playing state within 5 seconds
                console.log('Playback has started');

                player.once(AudioPlayerStatus.Idle, onSongEnd)
            } catch (error) {
                // The player has not entered the Playing state and either:
                // 1) The 'error' event has been emitted and should be handled
                // 2) 5 seconds have passed
                console.error(error);
            }

            interaction.channel.send('Playing: ' + video.title);
            console.log('Playing: ' + video.title);
            
            return true;
        }
        else {
            guild.playing = -1;
        }
    }
    catch (exception) {
        if (exception.message.startsWith('No video id found')) {
            interaction.channel.send("Link must be a video");
            console.log("Link must be a video");
        }
        else {
            interaction.channel.send("Failed to play, the link is probably broken");
            console.log("Failed to play, the link is probably broken");
            console.log(exception);
        }

        return false;
    }
}

exports.playTTS = async (interaction, guild, readStream, callback = null) => {
    
    try {

        if (!common.validObject(guild))
            return false;

        let connection = getVoiceConnection(guild.guildId);

        if (connection == null) {
            // From https://discordjs.guide/voice/voice-connections.html#cheat-sheet
            // If you try to call joinVoiceChannel on another channel in the same guild in which there is already an active voice connection, the existing voice connection switches over to the new channel.
            connection = joinVoiceChannel({
                channelId: interaction.member.voice.channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            // Checks to see if a voice connection got disconnected because either the bot was kicked or it just switched channels
            connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                    // Seems to be reconnecting to a new channel - ignore disconnect
                } catch (error) {
                    // Seems to be a real disconnect which SHOULDN'T be recovered from
                    exports.destroyGuildConnection(guild);
                }
            });
        }

        guild.voiceConnection = connection;

        let ttsPlayer = guild.ttsAudioPlayer;

        if (!common.validObject(ttsPlayer)) {

            ttsPlayer = createAudioPlayer();
            ttsPlayer.guildId = guild.guildId;
            guild.ttsAudioPlayer = ttsPlayer;

        }

        let resource = await probeAndCreateResource(readStream, false); // Disable inlinevolume since the volume will always be max (1.0)
        ttsPlayer.shouldPause = false;

        if (guild.audioPlayer != null && guild.audioPlayer.connectionSubscription != null) {
            guild.audioPlayer.connectionSubscription.unsubscribe();
            
            ttsPlayer.shouldPause = (guild.audioPlayer.state == AudioPlayerStatus.Buffering || guild.audioPlayer.state == AudioPlayerStatus.Playing);

            if (ttsPlayer.shouldPause)
                guild.audioPlayer.pause();
        }

        ttsPlayer.connectionSubscription = connection.subscribe(ttsPlayer);

        ttsPlayer.play(resource);
        try {
            await entersState(ttsPlayer, AudioPlayerStatus.Playing, 5_000);
            // The player has entered the Playing state within 5 seconds
            console.log('TTS has started');
            callback(null); // Success

            ttsPlayer.once(AudioPlayerStatus.Idle, onTTSEnd);
        } catch (error) {
            // The player has not entered the Playing state and either:
            // 1) The 'error' event has been emitted and should be handled
            // 2) 5 seconds have passed
            callback(error); // Failed
        }
    }
    catch (err) {
        callback(err);
    }
}

async function onSongEnd(oldState, newState) {

    let guild = exports.guilds[this.guildId];

    if (await exports.skipCurrentSong(guild)) { 
        console.log("Song ended, playing next...");
        return true;
    }
    else {
        console.log("Reached end of queue!");
        return false;
    }
}

async function onTTSEnd(oldState, newState) {

    let guild = exports.guilds[this.guildId];

    guild.ttsAudioPlayer.connectionSubscription.unsubscribe();
    guild.ttsAudioPlayer.connectionSubscription = undefined;
    guild.ttsAudioPlayer = undefined;

    let connection = getVoiceConnection(guild.guildId);

    if (guild.audioPlayer != null) { 
        guild.audioPlayer.connectionSubscription = connection.subscribe(guild.audioPlayer);
        
        if (this.shouldPause) {
            guild.audioPlayer.resume();
        }
    }

    console.log("TTS ended");
}

async function onAudioPlayerError(error) {
    console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
    console.error(`Error name: ${error.name}`);
    console.error(`Error stack: ${error.stack}`);

    return playNextSong(null, exports.guilds[this.guildId]);
}

async function probeAndCreateResource(readableStream, inlineVolume = true) {
	const { stream, type } = await demuxProbe(readableStream);
	return createAudioResource(stream, {
        metadata: {
            title: 'A good song!',
        },
        inputType: type,
        inlineVolume: inlineVolume,
    });
}


exports.skipCurrentSong = async (guild) => {
    if (guild.queue.length == 0)
        return false;

    guild.audioPlayer.removeListener(AudioPlayerStatus.Idle, onSongEnd);
    guild.queue.splice(guild.playing, 1);
    guild.audioPlayer.pause();

    playNextSong(undefined, guild);

    return true;
}

exports.pause = (guild) => {
    return guild.audioPlayer.pause();
}

exports.resume = (guild) => {
    return guild.audioPlayer.unpause();
}


exports.clearQueue = (guild) => {

    if (guild.queue.length === 0)
        return false;

    if (guild.playing === -1) {
        guild.queue = [];
    }
    else {
        guild.queue.splice(1);
    }

    return true;
}

exports.stop = (guild) => {

    guild.playing = -1;

    exports.clearQueue(guild);

    guild.audioPlayer.stop();
    guild.audioPlayer = undefined;
}

exports.printGuild = (interaction) => {
    let guild = exports.getGuild(interaction);
    let prunedGuild = {};

    prunedGuild.queue = guild.queue
    prunedGuild.playing = guild.playing;
    prunedGuild.paused = guild.paused;
    prunedGuild.guildId = guild.guildId;
    prunedGuild.volume = guild.volume;

    console.log(JSON.stringify(prunedGuild, null, 2));

    return prunedGuild;
}

exports.changeVolume = (guild, new_volume, saveToDB)  => {
    try {
        guild.volume = new_volume;

        if (guild?.audioPlayer?.currentResource?.volume != null && guild?.audioPlayer?.currentResource?.volume != undefined)
            guild.audioPlayer.currentResource.volume.setVolume(guild.volume);

        if (saveToDB === true) {

            GuildSettings.find({guildId: guild.guildId})
            .then(mappings => {

                if (mappings.length === 0) { 
                    const newGuildSettings = new GuildSettings({
                        guildId: guild.guildId,
                        musicvolume: new_volume
                    });
        
                    newGuildSettings.save()
                    .then(mapping => {
                        console.log('Saved guildSettings for guildId ' + guild.guildId);
                    })
                    .catch(err => {
                        let errorMsg = 'Failed to save guildSettings';
            
                        if (err.code === 11000) {
                            errorMsg += ', name already exists';
                        }
                        else {
                            errorMsg += ', unknown error';
                            console.log(err);
                        }
                    });
                }
                else {

                    for (let i = 0; i < mappings.length; i++) {
                        let entry = mappings[i];

                        entry.musicvolume = new_volume;
                        entry.save();
                    }
                }
            })
            .catch(err => {
                console.log(err);
            });
            
    
        }
    }
    catch (err) {
        let errorMsg = 'Failed to apply volume change!';
        console.log(err);
    }
}

exports.destroyGuildConnection = async (guild) => {
    const connection = getVoiceConnection(guild.guildId);

    if (connection == null)  {
        return false;
    }

    console.log("Destroying guild voice connection, guildid = " + guild.guildId.toString());

    connection.destroy();
    exports.guilds[guild.guildId].voiceConnection = undefined;

    exports.guilds[guild.guildId].audioPlayer.stop();
    exports.guilds[guild.guildId].audioPlayer = undefined;

    return true;
};

exports.hasVoiceConnection = async (guild) => {
    const connection = getVoiceConnection(guild.guildId);

    return (connection != null && connection != undefined);
}

exports.shuffle = (guild) => {

    try {
        if (guild.queue.length === 0 || guild.queue.length === 1) {
            return false;
        }
    
        let startIndex = 0;
    
        if (guild.playing === 0) {
            startIndex = 1;
        }
    
        let queueDelta = []; // An array of the indexes of the queue that map to an object of the queue that should be shuffled, = [startIndex, startIndex+1, startIndex+2, ..., guild.queue.length-1]
        let subQueue = []; // The queue that's going to be shuffled, contains only the elements of the queue that should be shuffled. subQueue.length === (guild.queue.length - startIndex)
    
        for (let i = startIndex; i < guild.queue.length; i++) {
            queueDelta.push(i);
        }
    
        // Generates random numbers to get a random index of guild.queue to add to the subqueue, after that the index is removed from the queueDelta
        while (queueDelta.length > 0) {
            let randomIndex = common.rollDice(0, queueDelta.length-1);
    
            subQueue.push(JSON.parse(JSON.stringify(guild.queue[queueDelta[randomIndex]]))); // Copies random element from queue
            queueDelta.splice(randomIndex, 1);
        }

        // Replaces the values to be shuffle with values from the subQueue array
        for (let i = startIndex; i < guild.queue.length; i++) {
            guild.queue[i] = subQueue[i-startIndex];
        }

        return true;
    }
    catch (err) {
        console.log(err);
        return false;
    }
}
