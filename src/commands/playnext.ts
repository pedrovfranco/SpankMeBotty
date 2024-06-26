import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';

import { alertAndLog } from '../common/common';
import { addToQueue } from '../common/music';


export let data = new SlashCommandBuilder()
    .setName('playnext')
    .setDescription('Adds a song as the next song on the queue')
    .addStringOption(option => option
        .setName('youtube_video')
        .setDescription('Either a youtube link or the name of the video to search for')
        .setRequired(true)
    )

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    if (!(interaction.member instanceof GuildMember) || interaction.memberPermissions == undefined || interaction.guild == undefined) {
		return;
	}

    if (interaction.member == undefined || !(interaction.member instanceof GuildMember) || interaction.member.voice == undefined || interaction.member.voice.channel == undefined) {
        alertAndLog(interaction, 'User not in a voice channel!');
        return;
    }

    const search_query = interaction.options.getString('youtube_video', true);
    await addToQueue(interaction, search_query, true);
}