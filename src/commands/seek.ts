import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { seek } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Jumps to the specific postition of the current track.')
    .addStringOption(option => option
        .setName('timestamp')
        .setDescription('The position of the song to jump to (minutes:seconds).')
        .setRequired(true)
    )

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    if (interaction.guild == undefined) {
        return;
    }

    var timestamp = interaction.options.getString('timestamp', true);
    timestamp = timestamp.replace(/\s+/g, '');

    const regex = /[0-9]+\:[0-9][0-9]/g;
    const matches = timestamp.match(regex);

    if (!(matches != null && matches.length === 1 && matches[0] === timestamp)) {
        interaction.reply({ content: 'Failed to parse timestamp, the format should be minutes:seconds', ephemeral: true });
        return;
    }

    const split = timestamp.split(':');
    const minutes: number = parseInt(split[0]);
    const seconds: number = parseInt(split[1]);

    if (minutes == undefined || seconds == undefined) {
        interaction.reply({ content: 'Failed to parse timestamp, the format should be minutes:seconds', ephemeral: true });
        return;
    }

    const newPosition = (minutes * 60 + seconds) * 1000;

    if (seek(interaction.guild.id, newPosition)) {
        interaction.reply({ content: `Jumped to ${timestamp}.` });
    }
    else {
        interaction.reply({ content: `Failed to jump to ${timestamp}.`, ephemeral: true });
    }
}
