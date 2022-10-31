import { createAudioPlayer, entersState, VoiceConnectionStatus, joinVoiceChannel, demuxProbe, createAudioResource, AudioPlayerStatus, getVoiceConnection, VoiceConnection, AudioPlayer, StreamType, AudioResource, PlayerSubscription, VoiceConnectionState, AudioPlayerError } from '@discordjs/voice';
import { ChannelType, ChatInputCommandInteraction, GuildMember, Guild } from 'discord.js';

import playdl from 'play-dl';
import { YouTubeStream } from 'play-dl';
import { Readable } from "stream";
import workerpool from 'workerpool';
import path from 'path';

import {rollDice} from './common';
import GuildSettings from '../database/models/guildSettings';
import { GetAuthFromDb } from '../database/playdlAuthScript';

export class QueueItem {
    link: string;
    title: string;
    lengthSeconds: number;

    constructor(link: string, title: string, lengthSeconds: number) {
        this.link = link;
        this.title = title;
        this.lengthSeconds = lengthSeconds;
    }
}

export class MusicWorkerResult {
    songArr: QueueItem[];
    playlistTitle?: string;

    constructor(songArr: QueueItem[], playlistTitle?: string) {
        this.songArr = songArr;
        this.playlistTitle = playlistTitle;
    }
}

export class GuildMusicData {
    queue!: QueueItem[];
    playing!: number;
    paused!: boolean;
    guildId!: string;
    voiceChannelId?: string;
    volume!: number;
    lastInteraction?: ChatInputCommandInteraction;
    guild?: Guild;

    voiceConnection?: VoiceConnection;

    audioPlayer?: AudioPlayer;
    audioPlayerResource?: AudioResource;
    connectionSubscription?: PlayerSubscription;
    currentStream?: YouTubeStream;

    ttsAudioPlayer?: AudioPlayer;
    ttsAudioPlayerResource?: AudioResource;
    ttsConnectionSubscription?: PlayerSubscription;
    ttsShouldPause?: boolean;
}



export let maxYtdlRetries = 3;
export const DEBUG_WORKER = true;

const pool = workerpool.pool(path.join(__dirname, 'music_worker.js'), {maxWorkers: 4, workerType: 'thread'});
const defaultMusicVolume = 0.2;

let guilds: Map<string, GuildMusicData> =  new Map<string, GuildMusicData>();

let initialized = false;


export async function initialize() {
	if (!initialized) {
        let auth = await GetAuthFromDb();

        if (auth == undefined) {
            return false;
        }

        let spotifyauth: {client_id: string; client_secret: string; market: string; refresh_token: string} = JSON.parse(auth.spotifyAuth);
        let youtubeAuth: {cookie: {}} = JSON.parse(auth.youtubeAuth);
        await playdl.setToken({
             spotify: {
                client_id: spotifyauth.client_id,
                client_secret: spotifyauth.client_secret,
                market: spotifyauth.market,
                refresh_token: spotifyauth.refresh_token
        }});

        await playdl.setToken({
        youtube: {
            cookie: JSON.stringify(youtubeAuth.cookie)
        }});

        initialized = true;
    }
}

export async function refreshCredentialsIfNecessary() {
    if (playdl.is_expired()) {
        let res = await playdl.refreshToken();
        if (!res) {
            console.log('Failed to refresh playdl token');
        }
        else {
            console.log('Refreshed playdl token');
        }
    }
}


// Saves the guild information object to the guilds array.
// This object contains information about the current state of the guild
// in regards to its voice connection and music playing
export function addGuild(guildId: string) : GuildMusicData {

    let guildData = guilds.get(guildId);

    if (guildData == undefined) {
        guildData = {
            queue: [],
            playing: -1,
            paused: false,
            guildId: guildId,
            volume: defaultMusicVolume,
        };

        guilds.set(guildId, guildData);
    }

    return guildData;
}

function addVoiceChannelToGuild(interaction : ChatInputCommandInteraction, guildData: GuildMusicData) {

    if (interaction.guild == undefined) {
        return;
    }

    guildData.lastInteraction = interaction;

    if (guildData.guild == null && interaction.guild != null) {
        guildData.guild = interaction.guild;
    }

    if (guildData.voiceChannelId == undefined && interaction.member instanceof GuildMember && interaction.member?.voice?.channel?.id != null) {
        guildData.voiceChannelId = interaction.member.voice.channel.id;
    }
}

export async function addToQueue(interaction : ChatInputCommandInteraction, search_query: string) {

    if (interaction.guild == undefined || interaction.channel?.type == null || !(interaction.channel.type === ChannelType.GuildText || 
    interaction.channel.type === ChannelType.GuildVoice || 
    interaction.channel.type === ChannelType.GuildAnnouncement)) {
        interaction.reply('Wrong channel, must be in a server (No DMs or group chats)');
        return;
    }

    if (!(interaction.member instanceof GuildMember) || interaction.member?.voice?.channel?.id == null) {
        interaction.reply('User must be in a voice channel!');
        return;
    }

    let guildData = addGuild(interaction.guild.id);

    addVoiceChannelToGuild(interaction, guildData);

    // Since the "getSong" call of the pool exec call can be either queued or just take along time (looking at you, ytpl...) we will defer the reply
    // to let the discord API know we got the command successfully. It will also an "<application> is thinking..." message on the command reply field.
    await interaction.deferReply();

    if (DEBUG_WORKER) {
        const worker = await import('./music_worker');
        let result = await worker.getSong(search_query);
        await handleMusicWorkerResult(interaction, guildData, result);
    }
    else {
        pool.exec('getSong', [search_query])
        .then(async function(result: MusicWorkerResult | undefined) {
            await handleMusicWorkerResult(interaction, guildData, result);
        })
        .catch(err => {
            console.log(err);
        });
    }
}

async function handleMusicWorkerResult(interaction : ChatInputCommandInteraction, guildData: GuildMusicData, result: MusicWorkerResult | undefined) {
    if (result == undefined) {
        interaction.editReply('Video not found');
        return;
    }

    let videoList = result.songArr;
    let playlistTitle = result.playlistTitle;

    for (let i = 0; i < videoList.length; i++) {
        let videoElement = videoList[i];
        guildData.queue.push(videoElement);
    }

    try {
        if (playlistTitle == null) {
            if (videoList.length === 1)
                interaction.editReply('Added: \"' + videoList[0].title + '\" to the music queue');
                console.log('Added: \"' + videoList[0].title + '\" to the music queue');
        }
        else {
            interaction.editReply('Added playlist: \"' + playlistTitle + '\" with ' + videoList.length + ' songs to the music queue');
            console.log('Added playlist: \"' + playlistTitle + '\" with ' + videoList.length + ' songs to the music queue');
        }
    }
    catch (err) {
        console.log('Failed to reply to interaction!');
        console.log(err);
    }

    // Not playing
    if (guildData.playing === -1) {
        await playNextSong(guildData.guildId);
    }
}

async function playNextSong(guildId: string) : Promise<boolean> {
    let guildData = addGuild(guildId);
    let interaction = guildData.lastInteraction;

    if (interaction == null || interaction.channel == null || guildData.guild == null || guildData.voiceChannelId == null) {
        console.error('No interaction to play next song, failing.');
        return false;
    }

    try {
        if (guildData.queue.length === 0) {
            guildData.playing = -1;
            return false;
        }
        else {

            // If not playing anything go to the start of the queue
            if (guildData.playing === -1) {
                guildData.playing = 0;
            }

            // If hit the end of the queue
            if (guildData.playing >= guildData.queue.length) {
                return false;
            }

            const video = guildData.queue[0];
            const link = video.link;

            let connection = getVoiceConnection(guildData.guildId);

            if (connection == null || connection.state.status === VoiceConnectionStatus.Destroyed) {
                // From https://discordjs.guide/voice/voice-connections.html#cheat-sheet
                // If you try to call joinVoiceChannel on another channel in the same guild in which there is already an active voice connection, the existing voice connection switches over to the new channel.
                
                let newConnection = joinVoiceChannel({
                    channelId: guildData.voiceChannelId,
                    guildId: guildData.guildId,
                    adapterCreator: guildData.guild.voiceAdapterCreator,
                });
                
                connection = newConnection;

                // Checks to see if a voice connection got disconnected because either the bot was kicked or it just switched channels
                newConnection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                    try {
                        await Promise.race([
                            entersState(newConnection, VoiceConnectionStatus.Signalling, 5000),
                            entersState(newConnection, VoiceConnectionStatus.Connecting, 5000),
                        ]);
                        // Seems to be reconnecting to a new channel - ignore disconnect
                    } catch (error) {
                        // Seems to be a real disconnect which SHOULDN'T be recovered from
                        destroyGuildConnection(guildId);
                    }
                });
            }

            guildData.voiceConnection = connection;

            let player = guildData.audioPlayer;
            if (player == null) {
                player = createAudioPlayer();
                guildData.connectionSubscription = connection.subscribe(player);
                guildData.audioPlayer = player;
                player.on('error', onAudioPlayerError.bind(guildData.guildId));
            }

            let ytdlStream: YouTubeStream | undefined = undefined;
            let retryCount = 0;
            while (retryCount < exports.maxYtdlRetries) {
                try {
                    ytdlStream = await playdl.stream(link, { quality: 2, discordPlayerCompatibility: true });
                    break;
                }
                catch (e) {
                    retryCount++;
                    let deltaRetries = exports.maxYtdlRetries - retryCount;
                    console.log('Exception raised when using ytdl, remaning retries: ' + deltaRetries);
                    console.log(e);
                }
            }

            if (ytdlStream == undefined) {
                let errMsg = 'Failed to play this song, something went wrong.';
                console.log(errMsg);
                interaction.channel.send(errMsg);
                exports.skipCurrentSong(guildData);
                return false;
            }

            guildData.currentStream = ytdlStream;

            const resource = createResource(ytdlStream.stream, ytdlStream.type, true, video.title);
            guildData.audioPlayerResource = resource;
            resource?.volume?.setVolume(guildData.volume);

            player.play(resource);
            try {
                await entersState(player, AudioPlayerStatus.Playing, 5000);
                // The player has entered the Playing state within 5 seconds
                console.log('Playback has started');

                player.once(AudioPlayerStatus.Idle, onSongEnd.bind(guildData.guildId));
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
    }
    catch (exception: any) {
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

export async function playTTS(interaction: ChatInputCommandInteraction, readStream: Readable, callback?: (errorType?: string, errorMsg?: string) => void): Promise<void> {
    
    try {
        if (interaction.guild == null) {
            console.error('No interaction to play next song, failing.');
            callback?.call(undefined, undefined, 'No interaction to play next song, failing.');
            return;
        }
        
        let guildId = interaction.guild?.id;
        let guildData = addGuild(guildId);
        addVoiceChannelToGuild(interaction, guildData);

        if (guildData.guild == null || guildData.voiceChannelId == null) {
            console.error('No interaction to play next song, failing.');
            callback?.call(undefined, undefined, 'No interaction to play next song, failing.');
            return;
        }

        let connection = getVoiceConnection(guildData.guildId);

        if (connection == null || connection.state.status === VoiceConnectionStatus.Destroyed) {
            // From https://discordjs.guide/voice/voice-connections.html#cheat-sheet
            // If you try to call joinVoiceChannel on another channel in the same guild in which there is already an active voice connection, the existing voice connection switches over to the new channel.
            let newConnection = joinVoiceChannel({
                channelId: guildData.voiceChannelId,
                guildId: guildData.guildId,
                adapterCreator: guildData.guild.voiceAdapterCreator,
            });

            connection = newConnection;

            // Checks to see if a voice connection got disconnected because either the bot was kicked or it just switched channels
            newConnection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                try {
                    await Promise.race([
                        entersState(newConnection, VoiceConnectionStatus.Signalling, 5000),
                        entersState(newConnection, VoiceConnectionStatus.Connecting, 5000),
                    ]);

                    console.log(newConnection.joinConfig.channelId);
                    // Seems to be reconnecting to a new channel - ignore disconnect
                } catch (error) {
                    // Seems to be a real disconnect which SHOULDN'T be recovered from
                    exports.destroyGuildConnection(guildData);
                }
            });
        }

        guildData.voiceConnection = connection;

        let ttsPlayer = guildData.ttsAudioPlayer;

        if (ttsPlayer == undefined) {
            ttsPlayer = createAudioPlayer();
            guildData.ttsAudioPlayer = ttsPlayer;
        }

        let resource = await probeAndCreateResource(readStream, false, 'tts'); // Disable inlinevolume since the volume will always be max (1.0)

        guildData.ttsShouldPause = false;

        if (guildData.audioPlayer != null && guildData.connectionSubscription != null) {
            guildData.connectionSubscription.unsubscribe();
            
            guildData.ttsShouldPause = (guildData.audioPlayer.state.status == AudioPlayerStatus.Buffering || guildData.audioPlayer.state.status == AudioPlayerStatus.Playing);

            if (guildData.ttsShouldPause) {
                guildData.audioPlayer.pause();
            }
        }

        guildData.ttsConnectionSubscription = connection.subscribe(ttsPlayer);

        ttsPlayer.play(resource);
        try {
            await entersState(ttsPlayer, AudioPlayerStatus.Playing, 5000);
            // The player has entered the Playing state within 5 seconds
            console.log('TTS has started');
            
            callback?.call(null); // Success

            ttsPlayer.once(AudioPlayerStatus.Idle, onTTSEnd.bind(guildData.guildId));
        } catch (error) {
            // The player has not entered the Playing state and either:
            // 1) The 'error' event has been emitted and should be handled
            // 2) 5 seconds have passed
            callback?.call(undefined, undefined, JSON.stringify(error)); // Failed
        }
    }
    catch (err) {
        callback?.call(undefined, undefined, JSON.stringify(err));
    }
}

async function onAudioPlayerError(this: string, error: AudioPlayerError): Promise<boolean> {
    let guildId = this;

    console.error(`Error: ${error.message} with resource ${error.resource.metadata}`);
    console.error(`Error name: ${error.name}`);
    console.error(`Error stack: ${error.stack}`)

    return playNextSong(guildId);
}

async function probeAndCreateResource(readableStream: Readable, inlineVolume: boolean = true, title: string = 'A good song!') {
	const { stream, type } = await demuxProbe(readableStream);
	return createResource(stream, type, inlineVolume, title)
}

function createResource(stream: Readable | string, type: StreamType, inlineVolume: boolean = true, title: string = 'A good song!') {
    return createAudioResource(stream, {
        metadata: {
            title: title,
        },
        inputType: type,
        inlineVolume: inlineVolume,
    });
}

async function onSongEnd(this: string, oldState: VoiceConnectionState, newState: VoiceConnectionState): Promise<void> {
    let guildId = this;
    
    if (await exports.skipCurrentSong(guildId)) { 
        console.log("Song ended, playing next...");
    }
    else {
        console.log("Reached end of queue!");
    }
}

async function onTTSEnd(this: string, oldState: VoiceConnectionState, newState: VoiceConnectionState): Promise<void> {            
    let guildId = this;
    let guildData = addGuild(guildId);

    guildData.ttsConnectionSubscription?.unsubscribe();
    guildData.ttsConnectionSubscription = undefined;
    guildData.ttsAudioPlayer = undefined;

    let connection = getVoiceConnection(guildData.guildId);

    if (guildData.audioPlayer != null) { 
        guildData.connectionSubscription = connection?.subscribe(guildData.audioPlayer);
        
        if (guildData.ttsShouldPause) {
            guildData.audioPlayer.unpause();
        }
    }

    console.log("TTS ended");
}

export async function skipCurrentSong(guildId: string): Promise<boolean> {
    let guildData = addGuild(guildId);

    if (guildData.queue.length == 0) {
        return false;
    }

    guildData.audioPlayer?.removeListener(AudioPlayerStatus.Idle, onSongEnd);
    guildData.queue.splice(guildData.playing, 1);
    guildData.audioPlayer?.pause();

    return playNextSong(guildId);
}

export function pause(guildId: string): boolean {
    let guildData = addGuild(guildId);

    if (guildData.audioPlayer == undefined) {
        return false;
    }

    return guildData.audioPlayer.pause();
}

export function resume(guildId: string): boolean {
    let guildData = addGuild(guildId);

    if (guildData.audioPlayer == undefined) {
        return false;
    }

    return guildData.audioPlayer.unpause();
}


export function clearQueue(guildId: string): boolean {
    let guildData = addGuild(guildId);

    if (guildData.queue.length === 0) {
        return false;
    }

    if (guildData.playing === -1) {
        guildData.queue = [];
    }
    else {
        guildData.queue.splice(1);
    }

    return true;
}

export function stop(guildId: string): boolean {
    let guildData = addGuild(guildId);

    if (guildData.audioPlayer == undefined) {
        return false;
    }

    guildData.playing = -1;

    clearQueue(guildId);

    guildData.audioPlayer.stop();
    guildData.audioPlayer = undefined;

    return true;
}

export async function changeVolume(guildId: string, newVolume: number, saveToDB: boolean): Promise<boolean> {

    if (saveToDB) {
        try {
            let mappings = await GuildSettings.find({guildId: guildId});

            if (mappings.length === 0) { 
                const newGuildSettings = new GuildSettings({
                    guildId: guildId,
                    musicvolume: newVolume
                });
    
                try {
                    await newGuildSettings.save()
                    console.log('Saved guildSettings for guildId ' + guildId);
                }
                catch(err: any) {
                    let errorMsg = 'Failed to save guildSettings';
        
                    if (err.code === 11000) {
                        errorMsg += ', name already exists';
                    }
                    else {
                        errorMsg += ', unknown error';
                    }

                    console.error(err);
                    return false;
                };
            }
            else if (mappings.length === 1){
                let entry = mappings[0];
                entry.musicvolume = newVolume;
                entry.save();
            }
            else {
                console.error('Found multiple entries for a single guildId');
                return false;
            }
        }
        catch(err: any) {
            console.error(err);
            return false;
        };
    }

    let guildData = addGuild(guildId);
    guildData.audioPlayerResource?.volume?.setVolume(newVolume);
    guildData.volume = newVolume;

    return true;
}

export async function destroyGuildConnection(guildId: string): Promise<boolean> {
    let guildData = addGuild(guildId);
    const connection = getVoiceConnection(guildId);

    if (connection == null || connection.state.status === VoiceConnectionStatus.Destroyed)  {
        return false;
    }

    console.log("Destroying guild voice connection, guildid = " + guildId);

    connection.destroy();
    guildData.voiceConnection?.destroy();

    guildData.audioPlayer?.stop();
    guildData.connectionSubscription?.unsubscribe();
    guildData.currentStream?.pause();

    guildData.ttsAudioPlayer?.stop();
    guildData.ttsConnectionSubscription?.unsubscribe();

    guilds.delete(guildId);

    return true;
};

export function hasVoiceConnection(guildId: string): boolean {
    const connection = getVoiceConnection(guildId);
    return connection != undefined;
}

export function shuffle(guildId: string): boolean {

    let guildData = addGuild(guildId);

    try {
        if (guildData.queue.length === 0 || guildData.queue.length === 1) {
            return false;
        }
    
        let startIndex = 0;
    
        if (guildData.playing === 0) {
            startIndex = 1;
        }
    
        let queueDelta = []; // An array of the indexes of the queue that map to an object of the queue that should be shuffled, = [startIndex, startIndex+1, startIndex+2, ..., guild.queue.length-1]
        let subQueue = []; // The queue that's going to be shuffled, contains only the elements of the queue that should be shuffled. subQueue.length === (guild.queue.length - startIndex)
    
        for (let i = startIndex; i < guildData.queue.length; i++) {
            queueDelta.push(i);
        }
    
        // Generates random numbers to get a random index of guild.queue to add to the subqueue, after that the index is removed from the queueDelta
        while (queueDelta.length > 0) {
            let randomIndex = rollDice(0, queueDelta.length-1);

            if (randomIndex == undefined) { // Will never happens but TSC is dumb :)
                return false;
            }
    
            subQueue.push(JSON.parse(JSON.stringify(guildData.queue[queueDelta[randomIndex]]))); // Copies random element from queue
            queueDelta.splice(randomIndex, 1);
        }

        // Replaces the values to be shuffle with values from the subQueue array
        for (let i = startIndex; i < guildData.queue.length; i++) {
            guildData.queue[i] = subQueue[i-startIndex];
        }

        return true;
    }
    catch (err) {
        console.log(err);
        return false;
    }
}

export function move(guildId: string, startIndex: number, endIndex: number): boolean {
    let guildData = addGuild(guildId);

    try {
        let removed = guildData.queue.splice(startIndex, 1);
        guildData.queue.splice(endIndex, 0, removed[0]);
        return true;
    }
    catch (err) {
        console.error(err);
        return false;
    }
}

export function remove(guildId: string, index: number): boolean {
    let guildData = addGuild(guildId);

    try {
        guildData.queue.splice(index, 1);
        return true;
    }
    catch (err) {
        console.error(err);
        return false;
    }
}

export function seek(guildId: string, newPosition: number): boolean {
    let guildData = addGuild(guildId);

    if (guildData.queue.length === 0)
        return false;

    if (newPosition > guildData.queue[0].lengthSeconds*1000)
        return false;

    let resource = guildData.audioPlayerResource;
    if (resource == undefined) {
        return false;
    }

    resource.playbackDuration = newPosition;
    return true;
}
