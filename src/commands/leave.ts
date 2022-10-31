import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { destroyGuildConnection } from '../common/music';


export let data = new SlashCommandBuilder()
	.setName('leave')
	.setDescription('Leaves the voice channel')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

	const guildId = interaction.guild?.id;

    if (guildId == undefined) {
		return;
	}

	if (await destroyGuildConnection(guildId)) {
		interaction.reply("Left");
		console.log('Left channel');
	}
	else {
		interaction.reply("I'm not in a voice channel!");
		console.log("I'm not in a voice channel!");
	}
}