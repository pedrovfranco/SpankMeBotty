import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { addGuild, move } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('move')
    .setDescription('Moves a song to a specific position.')
    .addIntegerOption(option => option
        .setName('start_index')
        .setDescription('The index/position of the song to be moved.')
        .setRequired(true)
    )
    .addIntegerOption(option => option
        .setName('end_index')
        .setDescription('The index/position to move to song to.')
        .setRequired(true)
    )

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
		return;
	}

    const startIndex = interaction.options.getInteger('start_index', true);
    const endIndex = interaction.options.getInteger('end_index', true);

    const guildData = addGuild(guildId);

    if (!(startIndex > 1)) {
        interaction.reply({ content: 'start_index must be higher than 1.', ephemeral: true });
        return;
    }

    if (!(endIndex > 1)) {
        interaction.reply({ content: 'end_index must be higher than 1.', ephemeral: true });
        return;
    }

    if (startIndex === endIndex) {
        interaction.reply({ content: 'start_index and end_index must be different.', ephemeral: true });
        return;
    }

    if (!(guildData.queue.length > 2)) {
        interaction.reply({ content: 'The music queue must have more than 2 songs to be able to use this command.', ephemeral: true });
        return;
    }

    if (move(guildId, startIndex-1, endIndex-1)) {
        interaction.reply({ content: `Moved song from position ${startIndex} to position ${endIndex} of the music queue.` });
    }
    else {
        interaction.reply({ content: `Failed to move song from position ${startIndex} to position ${endIndex} of the music queue.`, ephemeral: true });
    }
}