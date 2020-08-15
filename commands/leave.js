const common = require('../common/common');

module.exports = {
	name: 'leave',
    description: 'Leaves the voice channel',
	execute,
};

async function execute(message, args) {

	if (args.length !== 0) {
		message.channel.send('Leave command has no arguments!');
		console.log('Leave command has no arguments!');
		return;
	}
	
	if (!common.validObject(message.guild.voice.connection) || message.guild.voice.connection.status === 4) {
		message.channel.send("I'm not in a voice channel!");
		console.log("I'm not in a voice channel!");
		return;
	}

	message.guild.voice.connection.disconnect();

	console.log('Left channel');
}