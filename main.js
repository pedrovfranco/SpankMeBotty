const {Client, Intents, Collection} = require('discord.js');
const { generateDependencyReport } = require('@discordjs/voice');

const fs = require('fs');
const path  = require('path');

if (require('dotenv').config().error && process.env.NODE_ENV !== 'production') {
	console.error("Failed to load .env file!");
}

require('./database/mongo');
const GuildSettings = require('./database/models/guildSettings');
const music = require('./common/music');
const common = require('./common/common')
const commands = require('./commands');
const webServer = require('./webserver/web');
const inygonAnnouncer = require('./routines/inygonAnnouncer');


function printEnvVariables() {
	console.log('NODE_ENV=' + process.env.NODE_ENV);
	console.log('RECOGNIZER_KEYWORDS=' + process.env.RECOGNIZER_KEYWORDS);
	console.log(`DISCORD_TOKEN = ${process.env.DISCORD_TOKEN}`);

}

function startClient() {
	let client = new Client({
		intents: [
			Intents.FLAGS.DIRECT_MESSAGE_TYPING,
			Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
			Intents.FLAGS.DIRECT_MESSAGES,
			Intents.FLAGS.GUILD_MESSAGE_TYPING,
			Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILD_VOICE_STATES,
			Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
			Intents.FLAGS.GUILD_BANS,
			Intents.FLAGS.GUILDS,
		]
	});

	common.discordClient = client;

	client.once('ready', () => {
		console.log('Ready!');
	});

	return client;
}

function getCommands(client) {
	client.commands = new Collection();

	const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const command = require(path.join(__dirname, 'commands', file));

		if (command.data === undefined || command.data.name === undefined || command.execute === undefined)
			continue;

		client.commands.set(command.data.name, command);
	}
}

function startInygonRoutine() {
	setInterval(() => {
		inygonAnnouncer.checkForStream();
	}, 60 * 1000); // Polls twitch every minute
}

function startPingRoutine() {
	// Create recurrent polling of web server every 30 seconds
	setInterval(() => {
		axios.get(common.recognitionServiceEndpoint)
			.then((res) => {
				if (res.status !== 200) {
					console.log('Error pinging python web server!');
				}
			})
			.catch(function (error) {
				// handle error
				console.log(`${error.response.status}: ${error.response.statusText}`);
			});
	}, 30 * 1000)

}


function LoadGuildSettings() {
    GuildSettings.find({})
    .then(mappings => {
		for (let i = 0; i < mappings.length; i++) {
			let entry = mappings[i];
			console.log('guildId = ' + entry.guildId);
			console.log('musicvolume = ' + entry.musicvolume);

			let interaction = {};
			interaction.guild = {};
			interaction.guild.id = entry.guildId;
			music.changeVolume(music.addGuild(interaction), entry.musicvolume);
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

function main() {
	printEnvVariables();

	let client = startClient();

	getCommands(client);
	commands.registerBot(client);

	client.login(process.env.DISCORD_TOKEN);

	webServer.startServer();

	startInygonRoutine();

	LoadGuildSettings();

	printDicordjsVoiceDependencyReport();

	require('./deploy-commands');
}

main();