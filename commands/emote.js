const common = require('../common');
const fs = require('fs');

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

		common.sendEmote(message, args[0]);

	}
}