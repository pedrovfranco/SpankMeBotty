const common = require('./common/common');

const flagExactEmoteMatch = true;
const alertCommandDeprecation = true;

exports.registerBot = function registerBot(client) {

	client.on('interactionCreate', async interaction => {
		if (!interaction.isCommand() || interaction.member.user.bot)
			return;

		console.log('Received command ' + interaction.commandName);

		const command = client.commands.get(interaction.commandName);

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}

	});

	client.on('messageCreate', async message => {

		if (message?.member == null || message.member.user.bot)
			return;


		if (message.content.startsWith(common.prefix)) {

			if (alertCommandDeprecation) {
				message.reply('This style of command is deprecated, please use discord\'s built-in command system by typing \"/\" on the chat instead');
			}

			return;
		}

		if (flagExactEmoteMatch) {
			common.sendEmote(message, message.content, false); // If the message is not an emote name this function should fail gracefully
			return;
		}

	});
}
