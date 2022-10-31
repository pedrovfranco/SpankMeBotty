import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { sendEmote } from '../common/common';
import { handleList } from './emoteconfig';

export let data = new SlashCommandBuilder()
	.setName('emote')
	.setDescription('Prints an emote to the text channel')
	.addStringOption(option =>
		option.setName('emote_name')
			.setDescription('The name of the emote'))

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	let emoteName = interaction.options.getString('emote_name');

	if (emoteName == null) {
		handleList(interaction);
	}
	else {
		sendEmote(interaction, emoteName, true);
	}
}