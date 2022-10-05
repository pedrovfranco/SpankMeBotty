const { SlashCommandBuilder } = require('discord.js');

const common = require('../common/common');
const music = require('../common/music');


// module.exports = {
//     name: 'play',
//     description: 'Plays music from youtube',
//     args: true,
//     minargs: 1,
//     alias: ['p'],
//     usage: '<youtube_link_or_search_query>',
//     execute,
// };


module.exports = {	
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Plays music from youtube')
        .addStringOption(option => option
            .setName('youtube_video')
            .setDescription('Either a youtube link or the name of the video to search for')
			.setRequired(true)
		),

    async execute(interaction) {

        if (!common.validObject(interaction.member) || !common.validObject(interaction.member.voice) || !common.validObject(interaction.member.voice.channel)) {
            common.alertAndLog(interaction, 'User not in a voice channel!');
            return;
        }

        const search_query = interaction.options.getString('youtube_video');

        music.addToQueue(interaction, search_query);
    }
}