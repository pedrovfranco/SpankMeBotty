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

		if (music.destroyGuildConnection(guild)) {
			interaction.reply("Left");
			console.log('Left channel');
		}
		else {
			interaction.reply("I'm not in a voice channel!");
			console.log("I'm not in a voice channel!");
		}
	}}