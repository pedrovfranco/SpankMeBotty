const { SlashCommandBuilder } = require('discord.js');

const music = require('../common/music');

// module.exports = {
//     name: 'resume',
//     description: 'Resumes the music stream',
//     args: false,
//     alias: 'r',
//     execute,
// };


module.exports = {	
	data: new SlashCommandBuilder()
		.setName('resume')
		.setDescription('Resumes the music stream')
		,

    async execute(interaction) {

        let guild = music.getGuild(interaction);

        if (guild.queue.length === 0) {
            interaction.reply('The queue is empty');
            return;
        }

        if (music.resume(guild)) {
            interaction.reply('Resumed');
        }
        else {
            interaction.reply('The song is already playing');
        }
    }
}