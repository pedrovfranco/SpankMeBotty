const fs = require('fs');
const { REST } = require('discord.js');
const { Routes } = require('discord-api-types/v9');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

if (require('dotenv').config().error && process.env.NODE_ENV !== 'production') {
	console.error("Failed to load .env file!");
}

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	if (command.data !== undefined && command.data !== null)
		commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);


if (process.env.NODE_ENV === 'development') {
	rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
	.then(() => console.log('Successfully registered guild application commands.'))
	.catch(console.error);
}
else if (process.env.NODE_ENV === 'production') {
	rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
	.then(() => console.log('Successfully registered global application commands.'))
	.catch(console.error);
}
