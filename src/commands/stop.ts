import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { addGuild, stop } from '../common/music';


export let data = new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stops voice output')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
		return;
	}

	let guildData = addGuild(guildId);

	if (guildData.audioPlayer == undefined) {
		interaction.reply("I'm not in a voice channel!");
		return;
	}

	stop(guildId);
}