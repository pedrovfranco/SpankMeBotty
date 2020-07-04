
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
				reply += `\nUsage: \`${common.prefix}${command.name} ${command.usage}\``;
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

	Emote.findOne({ name: message.content }).orFail()
	.then(result => {

		// Send a local file
		message.channel.send({
			files: [{
				attachment: result.filepath,
			}]
		})
		.then((res) => {
			message.delete()
			.catch(console.error);
		})
		.catch((err) => {
			console.log('Failed to send ' + message.content);
			console.error(err);
		});
	})
	.catch(err => {
	})
}
