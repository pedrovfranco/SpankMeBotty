const common = require('../common');

module.exports = {
	name: 'stop',
    description: 'Stops voice output',
    usage: '',
	execute
};

async function execute(message, args) {
    
    if (args.length !== 0) {
		message.channel.send('Stop command has no arguments!');
		console.log('Stop command has no arguments!');
		return;
	}
	
	if (!common.validObject(message.guild.voice.connection) || message.guild.voice.connection.status === 4) {
		message.channel.send("I'm not in a voice channel!");
		console.log("I'm not in a voice channel!");
		return;
	}

	if (common.validObject(message.guild.voice.connection.dispatcher)) {
		message.guild.voice.connection.dispatcher.pause();
		console.log('Stopped audio');
	}

}