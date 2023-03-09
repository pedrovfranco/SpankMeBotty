import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { skipCurrentSong } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the currently playing song')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    if (interaction.guild == undefined) {
		return;
	}

    await interaction.deferReply();

    if (await skipCurrentSong(interaction.guild.id)) {
        await interaction.editReply('Skipped');
    }
    else {
        await interaction.editReply('The queue is empty!');
    }

}