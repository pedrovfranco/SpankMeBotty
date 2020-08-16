
const common = require('./common/common');

const Emote = require('./database/models/emote');

// Flags
const flagExactEmoteMatch = true;

let client;

exports.registerBot = function registerBot(inputBot) {
	client = inputBot;

	client.on('message', (message) => {
		
		if (message.author.bot)
			return;

		if (!message.content.startsWith(common.prefix) && flagExactEmoteMatch) {
			handleExactEmoteMessage(message);
			return;
		}

		const cleanMsg = message.content.slice(common.prefix.length);
		const args = cleanMsg.split(/\s+/g);
		const commandName = args.shift().toLowerCase();

		// Find command with name or alias
		const command = client.commands.find(element => {

			if (element.name === commandName)
				return true;

			if (element.alias === undefined)
				return false;

			if (element.alias === commandName )
				return true;

			if (Array.isArray(element.alias) && element.alias.find(alias => alias === commandName))
				return true;
		});

		if (command === undefined) {
			console.log('Unknown command: ' + commandName);
			return;
		}

		common.printCommand(message);

		if (command.disabled) {
			common.alertAndLog(message, 'That command is disabled!');
			return;
		}

		if ((command.args && !args.length) || (command.minargs && args.length < command.minargs)) {
	
			common.printUsage(message, command);
		
			return;
		}

		try {
			command.execute(message, args);
		} catch (error) {
			console.error(error);
			message.reply('there was an error trying to execute that command!');
		}

	});
}

async function handleExactEmoteMessage(message) {

	common.sendEmote(message, message.content);

}
