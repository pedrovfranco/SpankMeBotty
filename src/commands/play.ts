import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';

import { alertAndLog, userInVoiceChannel } from '../common/common';
import { addToQueue } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays music from youtube')
    .addStringOption(option => option
        .setName('youtube_video')
        .setDescription('Either a youtube link or the name of the video to search for')
        .setRequired(true)
    )

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    if (!userInVoiceChannel(interaction)) {
        alertAndLog(interaction, 'User not in a voice channel!');
        return;
    }
    
    const search_query = interaction.options.getString('youtube_video', true);
    addToQueue(interaction, search_query);
}
