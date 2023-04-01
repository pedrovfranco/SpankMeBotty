import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { skipCurrentSong } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the currently playing song')
    .addIntegerOption(option => option
        .setName('count')
        .setDescription('The number of songs to skip on the queue.')
    )


export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    if (interaction.guild == undefined) {
		return;
	}

    const count = interaction.options.getInteger('count', false) ?? 1;

    await interaction.deferReply();

    if (await skipCurrentSong(interaction.guild.id, count)) {
        await interaction.editReply('Skipped');
    }
    else {
        await interaction.editReply(`The queue is not big enough to skip ${count} song${count > 1 ? 's' : ''}!`);
    }

}