import { Client, Collection, SlashCommandBuilder, ChatInputCommandInteraction, BaseInteraction, Message } from 'discord.js';

import {prefix, sendEmote} from './common/common.js';


export let discordClient: Client<boolean>;
export let commands: Collection<string, {data: SlashCommandBuilder, execute: (interaction: ChatInputCommandInteraction) => Promise<void>}>;

const flagExactEmoteMatch = true;
const alertCommandDeprecation = true;

export function registerBot(client: Client<boolean>, commandsCollection: Collection<string, {data: SlashCommandBuilder, execute: (interaction: ChatInputCommandInteraction) => Promise<void>}>): void {

	commands = commandsCollection;
	discordClient = client;
	client.on('interactionCreate', handleInteraction);
	client.on('messageCreate', handleMessage);
}

async function handleInteraction(interaction: BaseInteraction) {
	if (!interaction.isChatInputCommand() || interaction.member?.user == undefined || interaction.member?.user.bot || interaction.guild?.id == undefined || !interaction.guild.available) {
		return;
	}

	console.log('Received command ' + interaction.commandName);
	const command = commands.get(interaction.commandName);
	
	if (command == undefined) {
		console.error('Unable to load file for the specified command');
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}

}

async function handleMessage(message: Message) {

	if (message?.member == null || message.member.user.bot)
		return;


	if (message.content.startsWith(prefix)) {

		if (alertCommandDeprecation) {
			message.reply('This style of command is deprecated, please use discord\'s built-in command system by typing \"/\" on the chat instead');
		}

		return;
	}

	if (flagExactEmoteMatch) {
		sendEmote(message, message.content, false); // If the message is not an emote name this function should fail gracefully
		return;
	}

}