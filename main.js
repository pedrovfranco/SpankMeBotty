const Discord = require('discord.js');
const client = new Discord.Client();

if (require('dotenv').config().error != undefined)
	console.log("Failed to read .env!");

const commands = require('./commands');

client.once('ready', () => {
	console.log('Ready!');
});

commands.registerBot(client);

console.log(`Token = ${process.env.DISCORD_TOKEN}`);
client.login(process.env.DISCORD_TOKEN);