import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { addGuild, changeVolume } from '../common/music';


export let data = new SlashCommandBuilder()
    .setName('musicvolume')
    .setDescription('Gets or sets the music volume (100 being default, 50 being half and 0 being mute)')
    .addIntegerOption(option => option
        .setName('new_volume')
        .setDescription('The desired new volume (pick a value between 0 and 100)')
    )

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
        return;
    }

    let guildData = addGuild(guildId);

    let newVolume = interaction.options.getInteger('new_volume');

    if (newVolume == null) {
        interaction.reply('Current music volume is ' + Math.round(guildData.volume*100) + '%');
    }
    else {
        console.log(newVolume);

        if (isNaN(newVolume) || newVolume > 100.0 || newVolume < 0.0){
            interaction.reply('Error setting volume, \"' + newVolume + '\" must be a number between 0 and 100');
            return;
        }

        try {
            changeVolume(guildId, newVolume/100, true);
            interaction.reply('Changed volume to ' + newVolume + '%');
        }
        catch (ex) {
            console.log(ex)
            interaction.reply('Error setting volume');
        }
    }
}