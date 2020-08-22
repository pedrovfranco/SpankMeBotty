const Discord = require('discord.js');
const fs = require('fs');
const path  = require('path');

if (require('dotenv').config().error && process.env.NODE_ENV !== 'production') {
	console.error("Failed to load .env file!");
}

require('./database/mongo');
const common = require('./common/common')
const commands = require('./commands');
const webServer = require('./webserver/web');
const inygonAnnouncer = require('./routines/inygonAnnouncer');

let client;


function printEnvVariables() {
	console.log('NODE_ENV=' + process.env.NODE_ENV);
	console.log('RECOGNIZER_KEYWORDS=' + process.env.RECOGNIZER_KEYWORDS);
	console.log(`DISCORD_TOKEN = ${process.env.DISCORD_TOKEN}`);

}

function startClient() {
	client = new Discord.Client();

	common.client = client;

	client.once('ready', () => {
		console.log('Ready!');
	});
}

function getCommands() {
	client.commands = new Discord.Collection();

	const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		client.commands.set(command.name, command);
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


function main() {
	printEnvVariables();

	startClient();

	getCommands();
	commands.registerBot(client);

	client.login(process.env.DISCORD_TOKEN);

	webServer.startServer();

	startInygonRoutine();
}

main();