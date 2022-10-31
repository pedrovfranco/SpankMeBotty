import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { addGuild, shuffle } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffles the music queue once')


export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.guild == undefined) {
		return;
	}

    let guildData = addGuild(interaction.guild.id);

    if (guildData.queue.length === 0 || guildData.queue.length === 1) {
        interaction.reply('The music queue is too small to shuffle!');
        return;
    }

    if (shuffle(interaction.guild.id))
        interaction.reply('Shuffled');
    else
        interaction.reply('Failed!');
}