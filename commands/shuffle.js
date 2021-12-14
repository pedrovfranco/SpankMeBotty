const { SlashCommandBuilder } = require('@discordjs/builders');

const music = require('../common/music');

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('Shuffles the music queue once')
		,


	async execute(interaction) {
        let guild = music.getGuild(interaction);

        if (guild.queue.length === 0 || guild.queue.length === 1) {
            return false;
        }

        if (music.shuffle(guild))
            interaction.reply('Shuffled');
        else
            interaction.reply('Failed!');

	}
}