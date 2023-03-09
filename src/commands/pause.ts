import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { addGuild, pause } from '../common/music';


export let data = new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pauses the music stream')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    
    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
		return;
	}

    let guildData = addGuild(guildId);

    if (guildData.queue.length === 0) {
        interaction.reply('The queue is empty');
        return;
    }

    if (pause(guildId)) {
        interaction.reply('Paused');
    }
    else {
        interaction.reply('The song is already paused');
    }
}
