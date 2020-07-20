const Discord = require('discord.js');
const fs = require('fs');
const path  = require('path');

const commands = require('./commands');
require('./database/mongo');

if (require('dotenv').config().error) {
	console.error("Failed to load .env file!");
}

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


// Create recurrent polling of python web server every 30 seconds
// setInterval(() => {
// 	axios.get(common.recognitionServiceEndpoint + '/ping')
// 	.then( (res) => {
// 		if (res.status !== 200) {
// 			console.log('Error pinging python web server!');
// 		}
// 	})
// 	.catch(function (error) {
// 		// handle error
// 		console.log(`${error.response.status}: ${error.response.statusText}`);
// 	});
// }, 30 * 1000)

commands.registerBot(client);

console.log(`Token = ${process.env.DISCORD_TOKEN}`);
client.login(process.env.DISCORD_TOKEN);
