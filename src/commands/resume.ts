import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { resume, addGuild } from '../common/music';


export let data = new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resumes the music stream')
    

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {

    let guildId = interaction.guild?.id;

    if (guildId == undefined) {
        return;
    }

    let guildData = addGuild(guildId);

    if (guildData.queue.length === 0) {
        interaction.reply('The queue is empty');
        return;
    }

    if (resume(guildId)) {
        interaction.reply('Resumed');
    }
    else {
        interaction.reply('The song is already playing');
    }
}
