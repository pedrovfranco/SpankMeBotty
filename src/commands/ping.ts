import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';


export let data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies with Pong!')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.reply('Pong!');
}