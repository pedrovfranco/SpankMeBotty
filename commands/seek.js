const { SlashCommandBuilder } = require('discord.js');

const music = require('../common/music');

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('seek')
		.setDescription('Jumps to the specific postition of the current track.')
        .addStringOption(option => option
            .setName('timestamp')
            .setDescription('The position of the song to jump to (minutes:seconds).')
			.setRequired(true)
		),

    async execute(interaction) {

        var timestamp = interaction.options.getString('timestamp');
        timestamp = timestamp.replace(/\s+/g, '');

        const regex = /[0-9]+\:[0-9][0-9]/g;
        const matches = timestamp.match(regex);

        if (!(matches != null && matches.length === 1 && matches[0] === timestamp)) {
            interaction.reply({ content: 'Failed to parse timestamp, the format should be minutes:seconds', ephemeral: true });
            return;
        }

        const split = timestamp.split(':');
        const minutes = Number(split[0]);
        const seconds = Number(split[1]);

        if (minutes === NaN || seconds === NaN) {
            interaction.reply({ content: 'Failed to parse timestamp, the format should be minutes:seconds', ephemeral: true });
            return;
        }

        const newPosition = (minutes * 60 + seconds) * 1000;

        if (music.seek(music.getGuild(interaction), newPosition)) {
            interaction.reply({ content: `Jumped to ${timestamp}.` });
        }
        else {
            interaction.reply({ content: `Failed to jump to ${timestamp}.`, ephemeral: true });
        }
    }
}