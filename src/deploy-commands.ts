import { REST } from 'discord.js';
import { Routes } from 'discord-api-types/v9';

import { commands } from './commandsProcessor';

let initted: boolean = false;
let commamdJsonArr: unknown[];
let rest: REST;

function init() {
	if (initted) {
		return;
	}

	if (require('dotenv').config().error) {
		console.error("Failed to load .env file!");
	}

	if (process.env.DISCORD_TOKEN == undefined) {
		console.error('Missing env variables, failing.');
		return;
	}

	commamdJsonArr = commands.map(x=>x.data.toJSON());
	
	rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);
	initted = true;
}


export async function register() {
	
	init();

	if (process.env.CLIENT_ID == undefined || process.env.GUILD_ID == undefined) {
		console.error('Missing env variables, failing.');
		return;
	}

	// TODO: FIX THIS :))
	// await deleteGuildCommands();

	if (process.env.NODE_ENV === 'development') {
		rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commamdJsonArr })
		.then(() => console.log('Successfully registered guild application commands.'))
		.catch(console.error);
	}
	else if (process.env.NODE_ENV === 'production') {
		rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commamdJsonArr })
		.then(() => console.log('Successfully registered global application commands.'))
		.catch(console.error);
	}
}

export async function deleteGuildCommands() {
	
	init();

	if (process.env.CLIENT_ID == undefined || process.env.GUILD_ID == undefined) {
		console.error('Missing env variables, failing.');
		return;
	}

	try {
		await rest.delete(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
	}
	catch(ex) {
		console.error(ex);
	}
}