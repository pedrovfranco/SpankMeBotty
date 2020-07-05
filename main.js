const Discord = require('discord.js');
const fs = require('fs');
const path  = require('path');

// if (require('dotenv').config().error != undefined)
// 	console.log("Failed to read .env!");

const commands = require('./commands');
require('./database/mongo');

console.log('NODE_ENV=' + process.env.NODE_ENV);

console.log('RECOGNIZER_KEYWORDS=' + process.env.RECOGNIZER_KEYWORDS);

function getCommands() {
	client.commands = new Discord.Collection();

	const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		client.commands.set(command.name, command);
	}
}

const client = new Discord.Client();
getCommands();

client.once('ready', () => {
	console.log('Ready!');
});

commands.registerBot(client);

console.log(`Token = ${process.env.DISCORD_TOKEN}`);
client.login(process.env.DISCORD_TOKEN);
