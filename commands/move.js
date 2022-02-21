const { SlashCommandBuilder } = require('@discordjs/builders');

const music = require('../common/music');

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('move')
		.setDescription('Moves a song to a specific position.')
        .addIntegerOption(option => option
            .setName('start_index')
            .setDescription('The index/position of the song to be moved.')
			.setRequired(true)
		)
        .addIntegerOption(option => option
            .setName('end_index')
            .setDescription('The index/position to move to song to.')
			.setRequired(true)
		),

    async execute(interaction) {

        const startIndex = interaction.options.getInteger('start_index');
        const endIndex = interaction.options.getInteger('end_index');

        const guild = music.getGuild(interaction);

        if (!(startIndex > 0)) {
            interaction.reply({ content: 'start_index must be higher than 0.', ephemeral: true });
            return;
        }

        if (!(endIndex > 0)) {
            interaction.reply({ content: 'end_index must be higher than 0.', ephemeral: true });
            return;
        }

        if (startIndex === endIndex) {
            interaction.reply({ content: 'start_index and end_index must be different.', ephemeral: true });
            return;
        }

        if (!(guild.queue.length > 2)) {
            interaction.reply({ content: 'The music queue msut have more than 2 songs to be able to use this command.', ephemeral: true });
            return;
        }

        if (music.move(guild, startIndex, endIndex)) {
            interaction.reply({ content: `Moved song from position ${startIndex} to position ${endIndex} of the music queue.` });
        }
        else {
            interaction.reply({ content: `Failed to move song from position ${startIndex} to position ${endIndex} of the music queue.`, ephemeral: true });
        }
    }
}