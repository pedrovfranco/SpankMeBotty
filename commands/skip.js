const { SlashCommandBuilder } = require('@discordjs/builders');

const music = require('../common/music');

// module.exports = {
//     name: 'skip',
//     description: 'Skip the currently playing song',
//     args: false,
//     alias: 's',
//     execute,
// };


module.exports = {	
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skips the currently playing song')
		,

    async execute(interaction) {

        if (await music.skipCurrentSong(music.getGuild(interaction))) {
            interaction.reply('Skipped');
        }
        else {
            interaction.reply('The queue is empty!');
        }
    }
}