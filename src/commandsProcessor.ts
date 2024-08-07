import { Client, Collection, SlashCommandBuilder, ChatInputCommandInteraction, BaseInteraction, Message, AutocompleteInteraction } from 'discord.js';

import { sendEmote } from './common/common.js';
import { take } from './rateLimiter.js';

export type CommandFile = {
	data: SlashCommandBuilder, 
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>,
	autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>
};

export let discordClient: Client<boolean>;
export let commands: Collection<string, CommandFile>;

const flagExactEmoteMatch = true;
// const alertCommandDeprecation = true;

export function registerBot(client: Client<boolean>, commandsCollection: Collection<string, CommandFile>): void {
	commands = commandsCollection;
	discordClient = client;
	client.on('interactionCreate', handleInteraction);
	client.on('messageCreate', handleMessage);
}

async function handleInteraction(interaction: BaseInteraction) {
	if (interaction.member?.user == undefined || interaction.member?.user.bot || interaction.guild?.id == undefined || !interaction.guild.available) {
		return;
	}
	const userId = interaction.member.user.id;
    const rateLimitKey = `${userId}_interaction`;

    if (take(rateLimitKey)) {
        if (interaction.isRepliable()) {
            await interaction.reply({ content: 'You are being rate limited. Please wait before using commands again.', ephemeral: true });
        }
        return;
    }

	if (interaction.isChatInputCommand()) {
		console.log(`Received ChatInput interaction for command ${interaction.commandName} from guildId ${interaction.guildId} (${interaction.guild.name})`);
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
	else if (interaction.isAutocomplete()) {
		let commandName = interaction.commandName;
		console.log(`Received Autocomplete interaction for command ${commandName} from guildId ${interaction.guildId} (${interaction.guild.name})`);
		const command = commands.get(commandName);
		
		if (command == undefined) {
			console.error('Unable to load file for the specified command');
			return;
		}

		if (command.autocomplete == undefined) {
			console.error('This command does not have an autocomplete function.');
			return;
		}
	
		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
		}
	}
}

async function handleMessage(message: Message) {

	if (message?.member == null || message.member.user.bot)
		return;


	// if (message.content.startsWith(prefix)) {

	// 	if (alertCommandDeprecation) {
	// 		message.reply('This style of command is deprecated, please use discord\'s built-in command system by typing \"/\" on the chat instead');
	// 	}

	// 	return;
	// }
	

	if (flagExactEmoteMatch) {
		const userId = message.author.id;
		const rateLimitKey = `${userId}_message`;

		if (take(rateLimitKey)) {
			await message.reply('You are being rate limited. Please wait before sending more messages.');
			return;
		}
		sendEmote(message, message.content, false); // If the message is not an emote name this function should fail gracefully
		return;
	}

}