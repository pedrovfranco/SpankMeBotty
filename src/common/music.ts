import { createAudioPlayer, entersState, VoiceConnectionStatus, joinVoiceChannel, demuxProbe, createAudioResource, AudioPlayerStatus, getVoiceConnection, VoiceConnection, AudioPlayer, StreamType, AudioResource, PlayerSubscription, VoiceConnectionState, AudioPlayerError } from '@discordjs/voice';
import { ChannelType, ChatInputCommandInteraction, GuildMember, Guild, TextChannel, BaseInteraction } from 'discord.js';

import playdl from 'play-dl';
import { YouTubeStream } from 'play-dl';
import { Readable } from "stream";
import workerpool from 'workerpool';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { ReReadable } from 'rereadable-stream';

import ytdlpWrap, { YTDlpReadable } from 'yt-dlp-wrap';
let ytdlpBinaryPath = './binaries/ytdlp';
if (os.platform() == 'win32')
    ytdlpBinaryPath += '.exe';

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
    error?: string;

    constructor(songArr: QueueItem[], playlistTitle?: string, error?: string) {
        this.songArr = songArr;
        this.playlistTitle = playlistTitle;
        this.error = error;
    }
}

export class GuildMusicData {
    queue!: QueueItem[];
    playing!: number;
    paused!: boolean;
    guildId!: string;
    voiceChannelId?: string;
    volume!: number;
    soundboardVolume!: number;
    lastInteraction?: ChatInputCommandInteraction;
    guild?: Guild;
    timeout?: NodeJS.Timeout;

    voiceConnection?: VoiceConnection;

    audioPlayer?: AudioPlayer;
    audioPlayerResource?: AudioResource;
    connectionSubscription?: PlayerSubscription;
    currentStream?: Readable;

    ttsAudioPlayer?: AudioPlayer;
    ttsAudioPlayerResource?: AudioResource;
    ttsConnectionSubscription?: PlayerSubscription;
    ttsShouldPause?: boolean;
}

export const maxYtdlRetries = 3;
export const DEBUG_WORKER = true;
export const directStreamMacro = 'direct://';

const pool = workerpool.pool(path.join(__dirname, 'music_worker.js'), {maxWorkers: 4, workerType: 'thread'});
const defaultMusicVolume = 0.2;
const defaultSoundBoardVolume = defaultMusicVolume; // 0.2
const interpolateSilence = true;

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
            soundboardVolume: defaultSoundBoardVolume
        };

        guilds.set(guildId, guildData);
    }

    return guildData;
}

function addVoiceChannelToGuild(interaction : BaseInteraction, guildData: GuildMusicData) {

    if (interaction.guild == undefined) {
        return;
    }

    if (interaction.isChatInputCommand()) {
        guildData.lastInteraction = interaction;
    }

    if (guildData.guild == null && interaction.guild != null) {
        guildData.guild = interaction.guild;
    }

    if (guildData.voiceChannelId == undefined && interaction.member instanceof GuildMember && interaction.member?.voice?.channel?.id != null) {
        guildData.voiceChannelId = interaction.member.voice.channel.id;
    }
}

export async function addToQueue(interaction : ChatInputCommandInteraction, search_query: string, queue_next: boolean = false): Promise<void> {

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
    // to let the discord API know we got the command successfully. It will also write an "<application> is thinking..." message on the command reply field.
    await interaction.deferReply();

    if (DEBUG_WORKER) {
        const worker = await import('./music_worker');
        let result = await worker.getSong(search_query);
        await handleMusicWorkerResult(interaction, guildData, result, queue_next);
    }
    else {
        pool.exec('getSong', [search_query])
        .then(async function(result: MusicWorkerResult | undefined) {
            await handleMusicWorkerResult(interaction, guildData, result, queue_next);
        })
        .catch((err : Error) => {
            console.log(err);
        });
    }
}

async function handleMusicWorkerResult(interaction : ChatInputCommandInteraction, guildData: GuildMusicData, result: MusicWorkerResult | undefined, queue_next: boolean = false) {
    if (result == undefined) {
        interaction.editReply('Video not found');
        return;
    }

    if (result.error == 'age') {
        let errMsg = 'This video is age resticted!';
        interaction.editReply(errMsg);
        console.log(errMsg);
        return;
    }

    if (interaction.guild == null) {
        interaction.editReply('Something went wrong.');
        return;
    }

    let videoList = result.songArr;
    let playlistTitle = result.playlistTitle;
    let shouldMove = guildData.queue.length >= 2;

    let insertIndex = (shouldMove && queue_next) ? 1 : guildData.queue.length;
    guildData.queue.splice(insertIndex, 0, ...videoList);

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

async function playNextSong(guildId: string): Promise<boolean> {
    let guildData = addGuild(guildId);
    let interaction = guildData.lastInteraction;

    if (!interaction || !interaction.channel || !(interaction.channel instanceof TextChannel) || !guildData.guild || !guildData.voiceChannelId) {
        console.error('No interaction to play next song, failing.');
        return false;
    }

    try {
        if (guildData.queue.length === 0) {
            guildData.playing = -1;
            return false;
        } else {
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
            const directStream = link.startsWith(directStreamMacro);

            let connection = getVoiceConnection(guildData.guildId);

            if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
                // From https://discordjs.guide/voice/voice-connections.html#cheat-sheet
                // If you try to call joinVoiceChannel on another channel in the same guild in which there is already an active voice connection, the existing voice connection switches over to the new channel.
                connection = joinVoiceChannel({
                    channelId: guildData.voiceChannelId,
                    guildId: guildData.guildId,
                    adapterCreator: guildData.guild.voiceAdapterCreator,
                });
                // Checks to see if a voice connection got disconnected because either the bot was kicked or it just switched channels

                connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    try {
                        if (connection) {
                            await Promise.race([
                                entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                                entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                            ]);
                            // Seems to be reconnecting to a new channel - ignore disconnect
                        }
                    } catch (error) {
                        // Seems to be a real disconnect which SHOULDN'T be recovered from
                        destroyGuildConnection(guildId);
                    }
                });

                // Start the idle check loop
                checkIdleStatusAndDisconnect(guildData.audioPlayer, guildId, connection);
            }

            guildData.voiceConnection = connection;

            let player = guildData.audioPlayer;
            if (!player) {
                player = createAudioPlayer();
                guildData.connectionSubscription = connection.subscribe(player);
                guildData.audioPlayer = player;
                player.on('error', onAudioPlayerError.bind(guildData.guildId));

                // Start the idle check loop when player becomes idle
                player.on(AudioPlayerStatus.Playing, () => {
                    checkIdleStatusAndDisconnect( player, guildId, connection);
                });
                player.on(AudioPlayerStatus.Idle, () => {
                    checkIdleStatusAndDisconnect( player, guildId, connection);
                });
            }

            let ytStream: Readable | undefined = undefined;
            let streamType: StreamType | undefined = StreamType.Arbitrary;
            let resource: AudioResource;
            let retryCount = 0;

            if (!directStream) {
                while (retryCount < maxYtdlRetries) {
                    try {
                        // ----------------------------------PLAY-DL---------------------------------------
                        // let strm = (await playdl.stream(link, { quality: 2, discordPlayerCompatibility: false }));
                        // ytStream = strm.stream;
                        // streamType = strm.type;
                        // ----------------------------------PLAY-DL---------------------------------------

                        // ----------------------------------YT-DLP---------------------------------------
                        if (!fs.existsSync(ytdlpBinaryPath)) {
                            let binaryFolderPath = path.dirname(ytdlpBinaryPath);
                            fs.rmSync(binaryFolderPath, { force: true, recursive: true });
                            fs.mkdirSync(binaryFolderPath, { recursive: true });
                            console.log("Downloading ytdlp binary...");
                            await ytdlpWrap.downloadFromGithub(ytdlpBinaryPath);
                        }

                        const ytdlp = new ytdlpWrap(ytdlpBinaryPath);

                        let extension = ".webm";
                        ytStream = ytdlp.execStream([
                            link,
                            '-f',
                            `bestaudio[ext=${extension.substring(1)}][acodec=opus]`,
                            // '--limit-rate',
                            // '50K'
                        ]);

                        ytStream.on('progress', (progress) => console.log(progress.percent, progress.totalSize, progress.currentSpeed, progress.eta))
                            .on('ytDlpEvent', (eventType, eventData) => console.log(eventType, eventData))
                            .on('error', (error) => console.error(error))
                            .on('close', () => console.log('all done'));

                        let bufSize = 8096;
                        ytStream = ytStream.pipe(new ReReadable({ length: bufSize })).rewind();
                        // ----------------------------------YT-DLP---------------------------------------
                        break;
                    } catch (e: any) {
                        retryCount++;
                        let deltaRetries = maxYtdlRetries - retryCount;

                        if (e.message.includes("Sign in to confirm your age")) {
                            let errorMsg = "The video is age restricted, skipping.";
                            console.log(errorMsg);
                            interaction.channel.send(errorMsg);
                            skipCurrentSong(guildId);
                            return false;
                        }

                        ytStream?.destroy();
                        console.log('Exception raised when using ytdl, remaining retries: ' + deltaRetries);
                        console.log(e);
                    }
                }

                if (ytStream == undefined) {
                    let errMsg = 'Failed to play this song, something went wrong.';
                    console.log(errMsg);
                    interaction.channel.send(errMsg);
                    skipCurrentSong(guildId);
                    return false;
                }

                resource = createResource(ytStream, streamType, true, video.title);
            } else {
                resource = createResource(link.substring(directStreamMacro.length), StreamType.Arbitrary, true, video.title);
            }

            let oldStream = guildData.currentStream;
            guildData.currentStream = ytStream;
            guildData.audioPlayerResource = resource;
            resource?.volume?.setVolume(guildData.volume);

            player.play(resource);
            try {
                await entersState(player, AudioPlayerStatus.Playing, 5000);
                console.log('Playback has started');

                player.once(AudioPlayerStatus.Idle, onSongEnd.bind(guildData.guildId));
            } catch (error) {
                console.error(error);
            }

            interaction.channel.send('Playing: ' + video.title);
            console.log('Playing: ' + video.title);

            oldStream?.destroy();
            return true;
        }
    } catch (exception: any) {
        if (exception.message.startsWith('No video id found')) {
            interaction.channel.send("Link must be a video");
            console.log("Link must be a video");
        } else {
            interaction.channel.send("Failed to play, the link is probably broken");
            console.log("Failed to play, the link is probably broken");
            console.log(exception);
        }

        return false;
    }
}

export async function playTTS(interaction: BaseInteraction, readStream: Readable, callback?: (errorType?: string, errorMsg?: string) => void, volume: number = 1.0): Promise<void> {
    
    try {
        if (interaction.guild?.id == undefined || !interaction.isRepliable()) {
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
            newConnection.on(VoiceConnectionStatus.Disconnected, async (/* oldState, newState */) => {
                try {
                    await Promise.race([
                        entersState(newConnection, VoiceConnectionStatus.Signalling, 5000),
                        entersState(newConnection, VoiceConnectionStatus.Connecting, 5000),
                    ]);

                    console.log(newConnection.joinConfig.channelId);
                    // Seems to be reconnecting to a new channel - ignore disconnect
                } catch (error) {
                    // Seems to be a real disconnect which SHOULDN'T be recovered from
                    destroyGuildConnection(guildId);
                }
            });
            // applyKeepAliveHotfix(connection);
            
        }
        
        guildData.voiceConnection = connection;

        let ttsPlayer = guildData.ttsAudioPlayer;
        checkIdleStatusAndDisconnect(ttsPlayer, guildId, connection);

        if (ttsPlayer == undefined) {
            ttsPlayer = createAudioPlayer();
            guildData.ttsAudioPlayer = ttsPlayer;

            // Start the idle check loop when player becomes idle
            ttsPlayer.on(AudioPlayerStatus.Idle, () => {
                checkIdleStatusAndDisconnect( ttsPlayer, guildId, connection);
            });
        }

        let resource = await probeAndCreateResource(readStream, true, 'tts');
        resource?.volume?.setVolume(volume);
        guildData.ttsShouldPause = false;

        if (guildData.audioPlayer != null && guildData.connectionSubscription != null) {
            guildData.connectionSubscription.unsubscribe();
            
            guildData.ttsShouldPause = (guildData.audioPlayer.state.status == AudioPlayerStatus.Buffering || guildData.audioPlayer.state.status == AudioPlayerStatus.Playing);

            if (guildData.ttsShouldPause) {
                guildData.audioPlayer.pause(interpolateSilence);
            }
        }

        guildData.ttsConnectionSubscription = connection.subscribe(ttsPlayer);

        ttsPlayer.play(resource);
        try {
            await entersState(ttsPlayer, AudioPlayerStatus.Playing, 5000);
            // The player has entered the Playing state within 5 seconds
            // console.log('TTS has started');
            
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

const networkStateChangeHandler = (oldNetworkState: any, newNetworkState: any) => {
    const newUdp = Reflect.get(newNetworkState, 'udp');
    clearInterval(newUdp?.keepAliveInterval);
}


function applyKeepAliveHotfix(voiceConnection: VoiceConnection) {
      
    voiceConnection.on('stateChange', (oldState, newState) => {
        const oldNetworking = Reflect.get(oldState, 'networking');
        const newNetworking = Reflect.get(newState, 'networking');
        
        oldNetworking?.off('stateChange', networkStateChangeHandler);
        newNetworking?.on('stateChange', networkStateChangeHandler);
    });
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
    
    if (await skipCurrentSong(guildId)) { 
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

    // console.log("TTS ended");
}

export async function skipCurrentSong(guildId: string, count: number = 1): Promise<boolean> {
    let guildData = addGuild(guildId);

    if (guildData.queue.length - count < 0) {
        return false;
    }
    
    guildData.audioPlayer?.removeAllListeners(AudioPlayerStatus.Idle);
    guildData.queue.splice(guildData.playing, count);
    guildData.audioPlayer?.pause(interpolateSilence);
    // guildData.currentStream.

    guildData.currentStream?.destroy();
    guildData.currentStream = undefined;

    await playNextSong(guildId);

    return true;
}

export function pause(guildId: string): boolean {
    let guildData = addGuild(guildId);

    if (guildData.audioPlayer == undefined) {
        return false;
    }

    return guildData.audioPlayer.pause(interpolateSilence);
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
    let guildData = addGuild(guildId);

    newVolume ??= defaultMusicVolume;

    if (saveToDB) {
        try {
            let mappings = await GuildSettings.find({guildId: guildId});

            if (mappings.length === 0) { 
                const newGuildSettings = new GuildSettings({
                    guildId: guildId,
                    musicvolume: newVolume,
                    soundboardVolume: guildData.soundboardVolume
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

    guildData.audioPlayerResource?.volume?.setVolume(newVolume);
    guildData.volume = newVolume;

    return true;
}

export async function changeSoundboardVolume(guildId: string, newVolume: number, saveToDB: boolean): Promise<boolean> {
    let guildData = addGuild(guildId);

    newVolume ??= defaultSoundBoardVolume;

    if (saveToDB) {
        try {
            let mappings = await GuildSettings.find({guildId: guildId});

            if (mappings.length === 0) { 
                const newGuildSettings = new GuildSettings({
                    guildId: guildId,
                    musicvolume: guildData.volume,
                    soundboardVolume: newVolume
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
                entry.soundboardVolume = newVolume;
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

    guildData.soundboardVolume = newVolume;
    return true;
}


export async function destroyGuildConnection(guildId: string): Promise<boolean> {
    let guildData = addGuild(guildId);
    const connection = getVoiceConnection(guildId);

    if (connection == null || connection.state.status === VoiceConnectionStatus.Destroyed)  {
        return false;
    }

    console.log("Destroying guild voice connection, guildid = " + guildId);
    
    if (guildData.voiceConnection != null && guildData.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed)  {
        guildData.voiceConnection?.destroy();
    }

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

        // Replaces the values to be shuffled with values from the subQueue array
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

function checkIdleStatusAndDisconnect(player: AudioPlayer | undefined, guildId: string, connection: VoiceConnection) {
    const idleCheckInterval = 60000; // 1 minute

    const guildData = guilds.get(guildId);
    if (!guildData) return;

    // Clear existing timeout if it exists
    if (guildData.timeout) {
        clearTimeout(guildData.timeout);
    }

    const checkIdle = () => {
        console.log("1");
        if (connection.state.status === VoiceConnectionStatus.Ready) {
            console.log("2");
            if (!player || player.state.status === AudioPlayerStatus.Idle) {
                console.log("3");
                disconnectFromVoiceChannel(guildId);
                console.log("Disconnected due to inactivity");
                if (guildData.timeout) {
                    clearTimeout(guildData.timeout);
                }
                guildData.timeout = undefined;
            } else {
                console.log("4");
                // Reset the idle check if the player is not idle
                guildData.timeout = setTimeout(checkIdle, idleCheckInterval);
            }
        } else {
            console.log("5");
            // Reset the idle check if the connection is not ready
            guildData.timeout = setTimeout(checkIdle, idleCheckInterval);
        }
    };

    // Set the new timeout
    guildData.timeout = setTimeout(checkIdle, idleCheckInterval);
}

function disconnectFromVoiceChannel(guildId: string) {
    const connection = getVoiceConnection(guildId);
    if (connection) {
        connection.destroy();
        console.log("Bot disconnected due to inactivity.");
    }
}
