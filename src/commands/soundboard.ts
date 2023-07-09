import { SlashCommandBuilder, ChatInputCommandInteraction, User, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, BaseInteraction, GuildMember, AutocompleteInteraction } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { http, https } from 'follow-redirects';
import ffmpeg from 'fluent-ffmpeg';
import playdl from 'play-dl';

import SoundBite from '../database/models/soundBite';
import { playTTS, addGuild, changeSoundboardVolume } from '../common/music';
import { PermissionType, hasPermission } from '../common/permissions';
import {  Readable } from 'stream';
import { spawn } from 'child_process';
import { ReReadable } from 'rereadable-stream';
import { alertAndLog, userInVoiceChannel } from '../common/common';

const maxFileSize = 1 << 19; // 512 KB
const maxSoundbiteDuration = 10; // 5 seconds
const soundBitesFolderName = 'soundbites';
const moreButtonId = 'morebuttonID';
const backButtonId = 'backbuttonID';

export class Duration {
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;

    public constructor(Hours: number, Minutes: number, Seconds: number, Milliseconds: number)
    {
        this.hours = Hours;
        this.minutes = Minutes;
        this.seconds = Seconds;
        this.milliseconds = Milliseconds;
    }

    static parse(inputStr: string) : Duration | null
    {
        try {
            const split = inputStr.split(':');
            const splitLength = split.length;

            if (split.length > 3) {
                return null;
            }

            const rightHandPart = split[splitLength-1];
            const rightHandSplit = rightHandPart.split('.');

            if (rightHandSplit.length > 2) {
                return null;
            }

            const seconds = parseInt(rightHandSplit[0], 10);

            if (rightHandSplit.length > 1 && rightHandSplit[1].length > 3) {
                return null;
            }

            const milliseconds = rightHandSplit.length > 1 ? Math.round(parseFloat(`0.${rightHandSplit[1]}`)*1000.0) : 0;
       
            const minutes = splitLength > 1 ? parseInt(split[splitLength-2], 10) : 0;
            const hours = splitLength > 2 ? parseInt(split[splitLength-3], 10) : 0;
    
            return new Duration(hours, minutes, seconds, milliseconds);
        } catch (error) {
            return null;
        }
    }

    toString(): string {
        return `${this.hours.toString().padStart(2, '0')}:${this.minutes.toString().padStart(2, '0')}:${this.seconds.toString().padStart(2, '0')}.${this.milliseconds}`;
    }

    toTotalSeconds(): number {
        return (this.hours * 60 + this.minutes) * 60 + this.seconds + this.milliseconds/1000;
    }

    add(other: Duration): Duration {
        const milliseconds = this.milliseconds + other.milliseconds;
        const seconds = this.seconds + other.seconds + Math.floor(milliseconds / 1000);
        const minutes = this.minutes + other.minutes + Math.floor(seconds / 60);
        const hours = this.hours + other.hours + Math.floor(minutes / 60);

        return new Duration(
            hours % 24,
            minutes % 60,
            seconds % 60,
            milliseconds % 1000
        );
    }
    
    subtract(other: Duration): Duration {
        const milliseconds = this.milliseconds - other.milliseconds;
        const seconds = this.seconds - other.seconds + Math.floor(milliseconds / 1000);
        const minutes = this.minutes - other.minutes + Math.floor(seconds / 60);
        const hours = this.hours - other.hours + Math.floor(minutes / 60);

        return new Duration(
            (hours + 24) % 24,
            (minutes + 60) % 60,
            (seconds + 60) % 60,
            (milliseconds + 1000) % 1000
        );
    }

    private compare(other: Duration): number {
        if (this.hours !== other.hours) {
          return this.hours - other.hours;
        }
        if (this.minutes !== other.minutes) {
          return this.minutes - other.minutes;
        }
        if (this.seconds !== other.seconds) {
          return this.seconds - other.seconds;
        }
        if (this.milliseconds !== other.milliseconds) {
          return this.milliseconds - other.milliseconds;
        }
        return 0;
    }
    
    lessThan(other: Duration): boolean {
        return this.compare(other) < 0;
    }
    
    lessThanOrEqual(other: Duration): boolean {
        return this.compare(other) <= 0;
    }
    
    greaterThan(other: Duration): boolean {
        return this.compare(other) > 0;
    }
    
    greaterThanOrEqual(other: Duration): boolean {
        return this.compare(other) >= 0;
    }
    
    equals(other: Duration): boolean {
        return this.compare(other) === 0;
    }
    
}

export let data = new SlashCommandBuilder()
    .setName('soundboard')
    .setDescription('Manages the soundboard')
    .addSubcommand(subcommand => subcommand
        .setName('play')
        .setDescription('Plays a sound bite')
        .addStringOption(option => option
            .setName('name')
            .setDescription('The sound bite\'s name')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('register')
        .setDescription('Registers a sound bite')
        .addStringOption(option => option
            .setName('name')
            .setDescription('The name of the sound bite')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('link')
            .setDescription('A link that points to an audio file')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('start_time')
            .setDescription('The timestamp of where the sound bite should start')
            .setRequired(false)
        )
        .addStringOption(option => option
            .setName('end_time')
            .setDescription('The timestamp of where the sound bite should end')
            .setRequired(false)
        )
        .addNumberOption(option => option
            .setName('volume_scale')
            .setDescription('A number to multiply the volume of the sound bite with. Defaults to 1.0')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Removes a sound bite')
        .addStringOption(option => option
            .setName('name')
            .setDescription('The name of the sound bite')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('list')
        .setDescription('Lists all the sound bites registered on this server')
    )
    .addSubcommand(subcommand => subcommand
        .setName('volume')
        .setDescription('Gets or sets the volume for the soundboard')
        .addNumberOption(option => option
            .setName('newvalue')
            .setDescription('The new value of the soundboard volume')
            .setRequired(false)
        )
);

async function checkPermission(interaction: BaseInteraction) {
    let type = PermissionType.soundboard;
    let {userHasPermission, roles} = await hasPermission(interaction, type);

	if (!userHasPermission) {
		let errMsg = `You dont have the required permission to use the ${type} command. `;
		
		if (roles.length === 1) {
            errMsg += 'You need the ' + roles[0] + ' role.';
        }
		else {
			errMsg += 'You need one of the following roles: ';

			for (let i = 0; i < roles.length; i++) {
				errMsg += roles[i];

				if (i < roles.length - 1)  { // Last element of the 'roles' array
                    errMsg += ', ';
			    }
		    }
	    }

        console.error(errMsg);
        if (interaction.isRepliable())
            await interaction.editReply(errMsg);
        return false;
    }

    return true;
} 

export async function autocomplete(interaction: AutocompleteInteraction) {
    if (interaction.guild?.id == undefined) {
        return;
    }

    if (!checkPermission(interaction))
        return;

    let guildId = interaction.guild.id;
    let commandType = interaction.options.getSubcommand();

    if (commandType === 'play' || commandType === 'remove') {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        console.log(focusedValue);

        // The sound bite's name starts with the focused value, we can use regex directly in the query to simplify this
        SoundBite.find({guildId: guildId, name: new RegExp(`^${focusedValue}`)})
        .select('name guildId')
        .then(async mappings => {
            const filtered = mappings.slice(0, 25); // Gets the first 25 results, this is the discord API limit for choises.
            await interaction.respond(
                filtered.map(entry => ({ name: entry.name, value: entry.name })),
            );
        })
        .catch(async err => {
            console.log(err);
            await interaction.respond([]);
        })
    }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let commandType = interaction.options.getSubcommand();

    if (interaction.guild?.id == undefined) {
        return;
    }

    await interaction.deferReply();

    if (!userInVoiceChannel(interaction)) {
        await alertAndLog(interaction, 'User not in a voice channel!');
        return;
    }

    if (!checkPermission(interaction))
        return;

    if (commandType === 'play') {
        let name = interaction.options.getString('name', true);

        handlePlay(interaction, name);
    }
    else if (commandType === 'register') {
        let name = interaction.options.getString('name', true);
        let link = interaction.options.getString('link', true);
     
        let startTime = interaction.options.getString('start_time', false);
        let endTime = interaction.options.getString('end_time', false);
        
        let volumeScale = interaction.options.getNumber('volume_scale', false);

        handleRegister(interaction, name, link, startTime, endTime, volumeScale);
    }

    else if (commandType === 'remove') {
        let name = interaction.options.getString('name', true);

        handleRemove(interaction, name);
    }
    else if (commandType === 'list') {
        handleList(interaction);
    }
    else if (commandType === 'volume') {
        let newValue = interaction.options.getNumber('newvalue');
        handleVolume(interaction, newValue);
    }
}

async function handlePlay(interaction: BaseInteraction, name: string) {

    if (interaction.guild?.id == undefined || !interaction.isRepliable()) {
        let errMsg = 'Something went wrong';
        console.error(errMsg);
        return;
    }

    if (interaction.member == undefined || !(interaction.member instanceof GuildMember) || interaction.member.voice == undefined || interaction.member.voice.channel == undefined) {
        alertAndLog(interaction, 'User not in a voice channel!');
        return;
    }

    let guildId = interaction.guild.id;
    let guildData = addGuild(guildId);

    SoundBite.findOne({ name: name, guildId: interaction.guild.id }).orFail()
    .then(async result => {
		let folderPath = path.join(__dirname, '..', soundBitesFolderName, guildId);
		let filePath = path.join(folderPath, name + result.extension);
		
		if (!fs.existsSync(filePath)) {
            try {
                await downloadAndNormaliseAudioFile(name, result.extension, result.data, filePath, folderPath);
            } catch (error) {
                console.error(error);
            }
        }

        // Play sound
        await playTTS(interaction,
            fs.createReadStream(filePath, {autoClose: true }),
            async (errType, errMsg) => {
            if (errType == undefined && errMsg == undefined) {
                await interaction.editReply(`Playing ${name} on the soundboard.`);
            }
            else if (errType === 'permissionError' && errMsg != undefined) {
                await interaction.editReply(errMsg);
                console.log('TTS permission error');
            }
            else {
                try {
                    await interaction.editReply('Failed!');
                    console.log('soundboard error = ' + JSON.stringify({errType, errMsg}));
                }
                catch (err) {
                    await interaction.editReply('Failed!');
                    console.log('soundboard error = ' + JSON.stringify({errType, errMsg}));
                }
            }
        }, guildData.soundboardVolume);
    
    })
    .catch(async (err) => {
        let errMsg = `No sound bite with the name '${name}' was found for this server.`;
        console.log(errMsg);
        interaction.editReply(errMsg);
    });
}

async function downloadAndNormaliseAudioFile(soundBiteName: string, extension: string, data: Buffer, filePath: string, folderPath: string) {
    return new Promise<void>((resolve, reject) => {
        let normFilePath = path.join(folderPath, soundBiteName + '_normalised' + extension);

        if (!fs.existsSync(folderPath))
            fs.mkdirSync(folderPath, { recursive: true});
        
        fs.writeFileSync(filePath, data, {encoding: 'binary'});

        ffmpeg()
            .input(filePath)
            // .outputOptions('-c copy')
            .audioFilters('loudnorm=I=-18:LRA=7:TP=-2:print_format=json')
            .output(normFilePath)
            .on('end', async () => {
                console.log('Conversion completed successfully');
                fs.unlinkSync(filePath);
                fs.renameSync(normFilePath, filePath);
                resolve();
            })
            .on('error', async (err) => {
                reject(err);
            })
            .run();
    });
}

async function handleRegister(interaction: ChatInputCommandInteraction, name: string, link: string, startTime: string | null, endTime: string | null, volumeScale: number | null) {
    if (interaction.guild?.id == undefined || interaction.member?.user.id == undefined || !(interaction.member?.user instanceof User)) {
        interaction.editReply('Something went wrong.');
        return;
    }

    let guildId = interaction.guild.id;
    let creatorId = interaction.member.user.tag;
    let filename: string;
    let folderPath = path.join(__dirname, '..', soundBitesFolderName, interaction.guild.id);

    if (name.startsWith(moreButtonId) || name.startsWith(backButtonId)) {
        let errMsg = 'That name is reserved, choose something else.';
        console.error(errMsg);
        await interaction.editReply(errMsg);
        return;
    }

    try {
        await SoundBite.findOne({ name: name, guildId: guildId }).orFail();
        interaction.editReply('An emote with that name already exists in this server!');
    }
    catch (e) {

        try {
            const url = new URL(link);
            const protocol = url.protocol === 'https:' ? https : http;
    
            if (await playdl.validate(link) == 'yt_video') {
                let ytdlStream = await playdl.stream(link, { quality: 2, discordPlayerCompatibility: true  });
    
                let extension = '.webm';
                
                if (ytdlStream.type.includes('webm')) {
                    extension = '.webm';
                }
                else if (ytdlStream.type.includes('ogg')) {
                    extension = '.ogg';
                }
    
                WriteStreamToFile(interaction, guildId, creatorId, name, startTime, endTime, extension, folderPath, ytdlStream.stream, volumeScale);
            }
            else {
                const request = protocol.get(url, (response) => {
                    const contentDisposition = response.headers['content-disposition'];
                    filename = path.basename(response.responseUrl) // Default file name if content-disposition header is not available
        
                    if (contentDisposition) {
                        // ChatGPT secret sauce
                        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                        if (match && match[1]) {
                            filename = match[1].replace(/['"]/g, '');
                        }
                    }
        
                    WriteStreamToFile(interaction, guildId, creatorId, name, startTime, endTime, filename, folderPath, response, volumeScale);
                });
    
                request.on('error', (error) => {
                    let errMsg = 'Error fetching sound bite.';
                    console.error(errMsg, error);
                    interaction.editReply(errMsg);
                });
                
                request.end();
            }
    
        } catch (error) {
            let errMsg = 'Wrong URL.';
            console.log(errMsg);
            await interaction.editReply(errMsg);
            return;
        }
    }
}

async function WriteStreamToFile(interaction: ChatInputCommandInteraction, guildId: string, creatorId: string, name: string, startTime: string | null, endTime: string | null, fileExtension: string, folderPath: string, stream: Readable, volumeScale: number | null) {
    let start = performance.now();
    const bufSize = 8096;

    if (fileExtension === "") {
        let errMsg = 'Failed to get sound bite file extension.';
        console.log(errMsg);
        interaction.editReply(errMsg);
        return;
    }

    const filePath = path.join(folderPath, name + fileExtension);
    // let bufArr = new Array<any>();

    if (!fs.existsSync(folderPath))
        fs.mkdirSync(folderPath, { recursive: true});

    // stream.on('data', chunk => bufArr.push(chunk));
    stream.on('error', async (x) => {
        let errMsg = `Something went wrong while downloading the sound bite.`;
        console.log(errMsg, x);
        await interaction.editReply(errMsg);
        return;
    });

    let rereadable = stream.pipe(new ReReadable({length: bufSize}));

    const ffprobe = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', '-']);
    let ffprobeData = "";
    stream.pipe(ffprobe.stdin);
    
    
    ffprobe.stderr.on('data', (data) => {
        console.error('Error analyzing video:', data.toString());
    });

    ffprobe.stdout.on('data', (data) => {
        ffprobeData += data.toString(); // Decode the data to string
    });


    ffprobe.stdout.on('end', async () => {
        let duration: number;
        try {
            const ffprobeOutput = JSON.parse(ffprobeData);
            duration = parseFloat(ffprobeOutput.format.duration);
            console.log('Video duration:', duration);
    
        } catch {
            let errMsg = `Failed to get sound bite duration.`;
            console.log(errMsg);
            await interaction.editReply(errMsg);
            return;
        }

        ffprobe.kill();

        let ffmpegStartTime = startTime == null ? new Duration(0, 0, 0, 0) : Duration.parse(startTime);
        let ffmpegEndTime = endTime == null ? Duration.parse(duration.toFixed(3)) : Duration.parse(endTime);

        if (ffmpegStartTime == null || ffmpegEndTime == null) {
            let errMsg = `Failed to get sound bite duration.`;
            console.log(errMsg);
            await interaction.editReply(errMsg);
            return;
        }

        let desiredDuration = ffmpegEndTime.subtract(ffmpegStartTime);

        if (desiredDuration.toTotalSeconds() > maxSoundbiteDuration) {
            let errMsg = `The sound bite is too long, it should be shorter than ${maxSoundbiteDuration} seconds.`;
            console.log(errMsg);
            await interaction.editReply(errMsg);
            return;
        }

        // let newFilePath = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + 'temp' + path.extname(filePath));
        let inputOptions = [];

        if (startTime != null) {
            inputOptions.push(`-ss ${ffmpegStartTime.toTotalSeconds()}`);
        }

        if (endTime != null) {
            inputOptions.push(`-to ${ffmpegEndTime.toTotalSeconds()}`);
        }

        let command = ffmpeg()
        .input(rereadable.rewind())
        .inputOptions(inputOptions);

        if (volumeScale != null) {
            command = command.audioFilters(`volume=${volumeScale}`);
        }

        command
        .outputOptions(['-map', 'a:0'])
        .output(filePath)
        // .outputOptions('-c copy') // Disabled due to inaccuracies when using timestamps and -c copy. See https://trac.ffmpeg.org/wiki/Seeking#Seekingwhiledoingacodeccopy
        .on('end', async () => {
            console.log('Conversion completed successfully');
            console.log(`Took ${performance.now()-start} ms.`);
            let buffer = fs.readFileSync(filePath);

            if (buffer.length > maxFileSize) {
                let errMsg = `The file should be smaller than ${maxFileSize/(1 << 10)} KB.`;
                console.log(errMsg);
                await interaction.editReply(errMsg);
                if (fs.existsSync(filePath))
                    fs.unlinkSync(filePath);
                return;
            }

            const newSoundBite = new SoundBite({
                name: name,
                data: buffer,
                guildId: guildId,
                extension: fileExtension,
                creator: creatorId,
            });

            newSoundBite.save()
            .then(_ => {
                let successMsg = `Saved '${name}'`;
                console.log(successMsg);
                interaction.editReply(successMsg);
            })
            .catch(err => {
                let errorMsg = `Failed to save '${name}'`;

                if (err.code === 11000) {
                    errorMsg += ', name already exists';
                }
                else {
                    errorMsg += ', unknown error';
                    console.log(err);
                }

                interaction.editReply(errorMsg);
            });

        })
        .on('error', async (err) => {
            let errMsg = 'Error during conversion';
            console.log(errMsg, err);
            await interaction.editReply(errMsg);
            if (fs.existsSync(filePath))
                fs.unlinkSync(filePath);
            return;
        })
        .run();
    });
}

async function handleRemove(interaction: ChatInputCommandInteraction, name: string) {
    
    if (interaction.guild?.id == undefined) {
        interaction.editReply('Something went wrong.');
        return;
    }

    let guildId = interaction.guild?.id;

    SoundBite.findOneAndDelete({ name: name, guildId: interaction.guild.id}).orFail()
    .then(async result => {
        await interaction.editReply(`Removed sound bite '${result.name}'.`);
		let folderPath = path.join(__dirname, '..', soundBitesFolderName, guildId);
		let filePath = path.join(folderPath, name + result.extension);
        fs.unlinkSync(filePath);
    })
    .catch(async err => {
        let errMsg = `Sound bite with name '${name}' does not exist!`;
        console.log(errMsg, err);
        await interaction.editReply(errMsg);
        return;
    });
}

async function handleList(interaction: ChatInputCommandInteraction) {
    
    if (interaction.guild == undefined) {
        interaction.editReply('Something went wrong.');
        return;
    }

    const maxRowSize = 5;
    const maxNumRows = 5;

    let guildId = interaction.guild.id;

    SoundBite.find({guildId: guildId})
    .select('name guildId')
    .then(async mappings => {

        let buttons = [];
        let list = 'Soundbites:';
        let moreButtonCounter = 0;
        if (mappings.length !== 0) {

            // list += '\n\`';
            for (let i = 0; i < mappings.length; i++) {
                const entry = mappings[i];

                if ((i+1) % (maxRowSize*maxNumRows) == 0) { // The "more" button
                    buttons.push(new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId(`${guildId}-${moreButtonId}${moreButtonCounter}`)
                        .setLabel("More...")
                    );

                    buttons.push(new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId(`${guildId}-${backButtonId}${moreButtonCounter}`)
                        .setLabel("Back...")
                    );

                    moreButtonCounter++;
                }

                // list += entry.name;
                let newButton = new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(`${guildId}-${entry.name}`)
                    .setLabel(entry.name)

                buttons.push(newButton);
                // if (i < mappings.length-1) {
                //     list += '\n';
                // }
            }
            // list += '\`';
        }


        let pages = arrayChunks(buttons, maxNumRows*maxRowSize).map(x=>arrayChunks(x, maxNumRows).map(x=>new ActionRowBuilder<ButtonBuilder>().addComponents(...x)));
        let page = pages[0];
        const response = await interaction.editReply({ content: list, components: page});
        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, /* time: 3_600_000 */ });

        collector.on('collect', async buttonInteraction => {
            const id = buttonInteraction.customId;
            const buttonName = id.split('-')[1];

            if (buttonName.startsWith(moreButtonId)) {
                let buttonId = parseInt(buttonName.replace(moreButtonId, ''));
                await response.edit({ content: list, components: pages[buttonId+1]});
                await buttonInteraction.deferUpdate();
                return;
            }
            else if (buttonName.startsWith(backButtonId)) {
                let buttonId = parseInt(buttonName.replace(backButtonId, ''));
                await response.edit({ content: list, components: pages[buttonId]});
                await buttonInteraction.deferUpdate();
                return;
            }

            await buttonInteraction.deferReply();
            await handlePlay(buttonInteraction, buttonName);
        });
    })
    .catch(err => {
        console.log(err);
        interaction.editReply("Something went wrong!");
    })
}

async function handleVolume(interaction : ChatInputCommandInteraction, newValue: number | null) {
    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
        return;
    }

    let guildData = addGuild(guildId);

    if (newValue == null) {
        await interaction.editReply('Current soundboard volume is ' + Math.round(guildData.soundboardVolume*100) + '%');
    }
    else {
        console.log(newValue);

        if (isNaN(newValue) || newValue > 100.0 || newValue < 0.0){
            await interaction.editReply('Error setting soundboard volume, \"' + newValue + '\" must be a number between 0 and 100');
            return;
        }

        try {
            changeSoundboardVolume(guildId, newValue/100, true);
            await interaction.editReply('Changed soundboard volume to ' + newValue + '%');
        }
        catch (ex) {
            let errMsg = 'Error setting soundboard volume';
            await interaction.editReply(errMsg);
            console.log(errMsg, ex);
        }
    }
}

const arrayChunks = (array: Array<any>, chunk_size: number) => Array(Math.ceil(array.length / chunk_size)).fill(null).map((_, index) => index * chunk_size).map(begin => array.slice(begin, begin + chunk_size));