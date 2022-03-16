const { SlashCommandBuilder } = require('@discordjs/builders');

const music = require('../common/music');

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Removes a specific song.')
        .addIntegerOption(option => option
            .setName('index')
            .setDescription('The index/position of the song to be removed.')
			.setRequired(true)
		),

    async execute(interaction) {

        const index = interaction.options.getInteger('index');
        const guild = music.getGuild(interaction);

        if (!(index > 0)) {
            interaction.reply({ content: 'index must be higher than -1.', ephemeral: true });
            return;
        }

        if (!(guild.queue.length > 0)) {
            interaction.reply({ content: 'The music queue must have at least 1 song to be able to use this command.', ephemeral: true });
            return;
        }

        if (!(index <= guild.queue.length)) {
            interaction.reply({ content: 'Index can\'t be larger than the queue size.', ephemeral: true });
            return;
        }

        const successMsg = `Removed song from position ${startIndex} of the music queue.`;

        if (index === 1) {
            if (await music.skipCurrentSong(music.getGuild(interaction))) {
                interaction.reply({ content: successMsg });
            }
            else {
                interaction.reply({ content: `Failed to remove song from position ${startIndex} of the music queue.`, ephemeral: true });
            }
        }
        else {
            if (music.remove(guild, index-1)) {
                interaction.reply({ content: successMsg });
            }
            else {
                interaction.reply({ content: `Failed to remove song from position ${startIndex} of the music queue.`, ephemeral: true });
            }
        }
    }
}