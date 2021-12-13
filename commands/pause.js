const { SlashCommandBuilder } = require('@discordjs/builders');

const music = require('../common/music');

// module.exports = {
//     name: 'pause',
//     description: 'Pauses the music stream',
//     args: false,
//     execute,
// };


module.exports = {	
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Pauses the music stream')
    ,

    async execute(interaction) {
        
        let guild = music.getGuild(interaction);

        if (guild.queue.length === 0) {
            interaction.reply('The queue is empty');
            return;
        }

        if (music.pause(guild)) {
            interaction.reply('Paused');
        }
        else {
            interaction.reply('The song is already paused');
        }
    }
}