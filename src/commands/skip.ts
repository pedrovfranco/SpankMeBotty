import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { skipCurrentSong } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the currently playing song')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    if (interaction.guild == undefined) {
		return;
	}

    if (await skipCurrentSong(interaction.guild.id)) {
        interaction.reply('Skipped');
    }
    else {
        interaction.reply('The queue is empty!');
    }

}