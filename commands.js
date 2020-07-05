
const common = require('./common.js');

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
			handleExactEmojiMessage(message);
			return;
		}

		const cleanMsg = message.content.slice(common.prefix.length);
		const args = cleanMsg.split(/\s+/g);
		const commandName = args.shift().toLowerCase();

		if (!client.commands.has(commandName)) {
			console.log('Unknown command: ' + commandName);
			return;
		}

		common.printCommand(message);

		const command = client.commands.get(commandName);

		if ((command.args && !args.length) || (command.minargs && args.length < command.minargs)) {
			let reply = `You didn't provide any arguments, ${message.author}!`;
	
			if (command.usage) {
				reply += `\nUsage:`;
				
				let lines = command.usage.split('\n');

				for (const line of lines) {
					reply += `\n\`${common.prefix}${command.name} ${line}\``;
				}

				
			}
		
			return message.channel.send(reply);
		}

		try {
			command.execute(message, args);
		} catch (error) {
			console.error(error);
			message.reply('there was an error trying to execute that command!');
		}

	});
}

async function handleExactEmojiMessage(message) {

	common.sendEmote(message, message.content);

}
