const common = require('../common/common');
const pauseCommand = require('./pause');


module.exports = {
	name: 'stop',
    description: 'Stops voice output',
    usage: '',
	execute
};

async function execute(message, args) {
    
    if (args.length !== 0) {
		common.alertAndLog(message, 'Stop command has no arguments!');
		return;
	}

	if (!common.validObject(message.guild.voice)) {
		common.alertAndLog(message, "I'm not playing anything!")
		return;
	}
	
	if (!common.validObject(message.guild.voice.connection) || message.guild.voice.connection.status === 4) {
		common.alertAndLog(message, "I'm not in a voice channel!")
		return;
	}

	if (common.validObject(message.guild.voice.connection.dispatcher)) {
		pauseCommand.execute(message, []);
		message.guild.voice.connection.dispatcher.pause();
		common.alertAndLog(message, "Stopped audio")
	}

}