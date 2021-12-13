const { SlashCommandBuilder } = require('@discordjs/builders');

const common = require('../common/common');
const pauseCommand = require('./pause');
const music = require('../common/music');


// module.exports = {
// 	name: 'stop',
//     description: 'Stops voice output',
//     usage: '',
// 	execute
// };

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stops voice output'),

	async execute(interaction) {

		let guild = music.getGuild(interaction);

		if (!common.validObject(guild.audioPlayer)) {
			interaction.reply("I'm not in a voice channel!");
			return;
		}

		music.stop();
	}
}