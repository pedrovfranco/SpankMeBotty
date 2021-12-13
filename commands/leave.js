const common = require('../common/common');
const music = require('../common/music');

const { SlashCommandBuilder } = require('@discordjs/builders');

// module.exports = {
// 	name: 'leave',
//     description: 'Leaves the voice channel',
// 	execute,
// };


module.exports = {	
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leaves the voice channel')
        ,


	async execute(interaction) {

		guild = music.getGuild(interaction);

		if (!music.hasVoiceConnection()) {
			interaction.reply("I'm not in a voice channel!");
			console.log("I'm not in a voice channel!");
			return;
		}

		music.destroyGuildCOnnection();
		console.log('Left channel');
	}
}