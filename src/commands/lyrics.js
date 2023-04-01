import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js';
// import https from 'https';
// import Lyricist from 'lyricist';
import * as lyrics from 'genius-lyrics-api';

import { addGuild } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Shows the lyrics of the currently playing song, if they exist.')

export async function execute(interaction/* : ChatInputCommandInteraction */) {
      
    const guildId = interaction.guild?.id;

    if (guildId == undefined || !(interaction.channel instanceof TextChannel)) {
		return;
	}

    let guildData = addGuild(guildId);

    if (guildData.queue.length == 0) {
        await interaction.reply({ content: 'There must be something on the queue!', ephemeral: true });
        return;
    }

    interaction.deferReply();

    try {
        let currSongTitle = guildData.queue[0].title;
        
        // Remove features
        currSongTitle = currSongTitle.replace(/ft\..*/, '');
        currSongTitle = currSongTitle.replace(/featur.*/, '');

        // Remove Tags
        currSongTitle = currSongTitle.replace(/\[.*\]/, '');

        const accessToken = process.env.GENIUS_API_KEY;
    
        // Titles should be in the 'Artist - Title' format
        const titleFields = currSongTitle.split('-');
        const artistName = titleFields.slice(0, titleFields.length-1).join('-').trim(); // Gets
        const songName = titleFields[titleFields.length-1].trim();
    
        const options = {
            apiKey: accessToken,
            title: songName,
            artist: artistName ?? '',
            optimizeQuery: true
        };
        
        const lyricsStr = await lyrics.getLyrics(options);
        
        const discordMaxMessageSize = 2000;

        if (lyricsStr.length > discordMaxMessageSize * 5) {
            interaction.editReply('The lyrics seem too long for a song, skipping.');
            return;
        }
        
        let lyricsMessageList = lyricsStr.match(/[\s\S]{1,2000}/g);
    
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
