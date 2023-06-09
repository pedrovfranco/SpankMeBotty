import { Client, GatewayIntentBits, Collection, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { generateDependencyReport } from '@discordjs/voice';
import fs from 'fs';
import path from 'path';

fetchEnvVariables();

import * as mongo from './database/mongo';
import GuildSettings from './database/models/guildSettings';
import { changeVolume, initialize } from './common/music';
import { registerBot } from './commandsProcessor';
// import { startServer } from './webserver/web';
import { register } from './deploy-commands';
import { checkForStream } from './routines/inygonAnnouncer';


function fetchEnvVariables()
{
	if (require('dotenv').config().error) {
		console.error("Failed to load .env file!");
	}
	
	if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'production') {
		process.env.NODE_ENV = 'development';
	}
}

function printEnvVariables() {
	console.log('NODE_ENV=' + process.env.NODE_ENV);
	console.log('RECOGNIZER_KEYWORDS=' + process.env.RECOGNIZER_KEYWORDS);
	console.log(`DISCORD_TOKEN = ${process.env.DISCORD_TOKEN}`);
}

function startClient() {
	let client = new Client({
		intents: [
			GatewayIntentBits.DirectMessageTyping,
			GatewayIntentBits.DirectMessageReactions,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.GuildMessageTyping,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildVoiceStates,
			GatewayIntentBits.GuildEmojisAndStickers,
			GatewayIntentBits.GuildBans,
			GatewayIntentBits.Guilds,
		]
	});

	client.once('ready', () => {
		console.log('Ready!');
	});

	return client;
}

async function getCommands() {
	let commands = new Collection<string, {data: SlashCommandBuilder, execute: (interaction: ChatInputCommandInteraction) => Promise<void>}>();

	const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

	for (const file of commandFiles) {
		let command: any = await import(path.join(__dirname, 'commands', file));

		if (command.default != undefined) {
			command = command.default;
		}

		if (command.data?.name == undefined) {
			let a = 0;
			continue;
		}

		commands.set(command.data.name, command);
	}

	return commands;
}

function startInygonRoutine() {
	checkForStream();
	setInterval(() => {
		checkForStream();
	}, 60 * 1000); // Polls twitch every minute
}

function LoadGuildSettings() {
    GuildSettings.find({})
    .then(mappings => {
		for (let i = 0; i < mappings.length; i++) {
			let entry = mappings[i];
		
			console.log('guildId = ' + entry.guildId);
			console.log('musicvolume = ' + entry.musicvolume);

			changeVolume(entry.guildId, entry.musicvolume, false);
		}
    })
    .catch(err => {
        console.log(err);
    })
}

function printDicordjsVoiceDependencyReport() {
	console.log("Printing @discordjs/voice dependency report:");
	console.log(generateDependencyReport());
}

async function main() {
	printEnvVariables();

	await mongo.connect();

	let client = startClient();

	let commandsCollection = await getCommands();
	registerBot(client, commandsCollection);

	client.login(process.env.DISCORD_TOKEN);

	// startServer();

	startInygonRoutine();

	LoadGuildSettings();

	printDicordjsVoiceDependencyReport();

	register();

	initialize();
}

main();