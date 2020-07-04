const Emote = require('../database/models/emote');

module.exports = {
	name: 'emote',
    description: 'Prints an emote to the text channel',
    args: true,
    usage: '<emote_name>',
	execute,
};

async function execute(message, args) {

	if (args.length === 0) {
		return;
	}

	if (args.length === 1) {

		Emote.findOne({ name: args[0] }).orFail()
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
				console.log('Failed to send ' + args[0]);
				console.error(err);
			});
		})
		.catch(err => {
			console.log(err);
			message.channel.send('Emote does not exist!');
		})
	}
}