const common = require('../common/common');
const fs = require('fs');
const emoteConfig = require('./emoteconfig')

module.exports = {
	name: 'emote',
    description: 'Prints an emote to the text channel',
    usage: '<emote_name>',
	execute,
};

async function execute(message, args) {

	if (args.length === 0) {
		emoteConfig.handleList(message, args);
	}
	else if (args.length === 1) {

		common.sendEmote(message, args[0]);

	}
}