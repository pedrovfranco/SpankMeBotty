import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { addGuild, skipCurrentSong, remove } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Removes a specific song.')
    .addIntegerOption(option => option
        .setName('index')
        .setDescription('The index/position of the song to be removed.')
        .setRequired(true)
    )

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
        return;
    }

    const index = interaction.options.getInteger('index', true);
    const guildData = addGuild(guildId);

    if (!(index > 0)) {
        interaction.reply({ content: 'index must be higher than -1.', ephemeral: true });
        return;
    }

    if (!(guildData.queue.length > 0)) {
        interaction.reply({ content: 'The music queue must have at least 1 song to be able to use this command.', ephemeral: true });
        return;
    }

    if (!(index <= guildData.queue.length)) {
        interaction.reply({ content: 'Index can\'t be larger than the queue size.', ephemeral: true });
        return;
    }

    const successMsg = { content: `Removed song from position ${index} of the music queue.` };
    const failMsg = { content: `Failed to remove song from position ${index} of the music queue.`, ephemeral: true };
    if (index === 1) {
        if (await skipCurrentSong(guildId)) {
            interaction.reply(successMsg);
        }
        else {
            interaction.reply(failMsg);
        }
    }
    else {
        if (remove(guildId, index-1)) {
            interaction.reply(successMsg);
        }
        else {
            interaction.reply(failMsg);
        }
    }
}