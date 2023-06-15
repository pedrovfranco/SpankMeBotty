import { SlashCommandBuilder, TextChannel } from 'discord.js';
import * as lyrics from 'genius-lyrics-api';

import { addGuild } from '../common/music';

const discordMaxMessageSize = 2_000;

export let data = new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Shows the lyrics of the currently playing song, if they exist.')
    .addStringOption(option => option
        .setName('customtrackname')
        .setDescription('The track name in the format "artist name - song name"')
        .setRequired(false)
    )

export async function execute(interaction) {
      
    const guildId = interaction.guild?.id;

    if (guildId == undefined || !(interaction.channel instanceof TextChannel)) {
		return;
	}

    let guildData = addGuild(guildId);

    if (guildData.queue.length == 0) {
        await interaction.reply({ content: 'There must be something on the queue!', ephemeral: true });
        return;
    }

    await interaction.deferReply();

    try {
    
        let currSongTitle = interaction.options.getString('customtrackname', false) ?? guildData.queue[0].title;

        // Titles should be in the 'Artist - Title' format, but the Artist's name could have an '-' character as well.
        const titleFields = currSongTitle.split(' - ');

        let artistName;
        let songName;

        if (titleFields.length == 1)
        {
            artistName = "";
            songName = cleanSongString(titleFields[0]).trim();
        }
        else if (titleFields.length == 2)
        {
            artistName = cleanSongString(titleFields[0]).trim();
            songName = cleanSongString(titleFields[1]).trim();
        }
        else if (titleFields.length > 2)
        {
            console.log(`titleFields has length ${titleFields.length}!`);
            interaction.editReply('Failed to fetch lyrics for this song, unexpected format.');
            return;
        }
    
        const options = {
            apiKey: process.env.GENIUS_API_KEY,
            title: songName,
            artist: artistName ?? '',
            optimizeQuery: true
        };
        
        const lyricsStr = await lyrics.getLyrics(options);
        if (lyricsStr.length > discordMaxMessageSize * 5) {
            interaction.editReply('The lyrics seem too long for a song, skipping.');
            return;
        }
        
        let lyricsMessageList = lyricsStr.match(/[\s\S]{1,2000}/g); // Break lyrics into chunks of 2000 chars
    
        await interaction.editReply(lyricsMessageList[0]);
    
        for (let i = 1; i < lyricsMessageList.length; i++) {
            await interaction.channel.send(lyricsMessageList[i]);
        }
    }
    catch (e) {
        console.log(e);
        interaction.editReply('Failed to fetch lyrics for this song.');
    }
}

function cleanSongString(input)
{
    let cleanInput = input.slice();
        
    // Remove features
    cleanInput = cleanInput.replace(/ft\..*/, '');
    cleanInput = cleanInput.replace(/feat\..*/, '');
    cleanInput = cleanInput.replace(/featur.*/, '');

    // Remove Tags
    cleanInput = cleanInput.replace(/\[.*\]/, '');

    // Remove Parenthesis
    cleanInput = cleanInput.replace(/\(.*\)/, '');

    return cleanInput;
}
