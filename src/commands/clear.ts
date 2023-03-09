import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { clearQueue } from '../common/music';


export let data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears the music queue')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
		return;
	}
    
    if (clearQueue(guildId))
        interaction.reply('Cleared');
    else
        interaction.reply('The queue is empty!');
}
