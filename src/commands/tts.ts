import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';

import { alertAndLog, playTTS} from '../common/common';


export let data = new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Reads text in voice channel')
    .addStringOption(option => option
        .setName('text')
        .setDescription('The text to be read')
        .setRequired(true)
    )
    .addStringOption(option => option
        .setName('voice')
        .setDescription('The voice that reads the text (defaults to Brian)')
    )


export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    
    if (interaction.member == undefined || !(interaction.member instanceof GuildMember) || interaction.member?.voice == undefined || interaction.member.voice.channel == undefined) {
        alertAndLog(interaction, 'User not in a voice channel!');
        return;
    }

    const text = interaction.options.getString('text', true);

    if (text == undefined) {
        interaction.reply('Must supply text!');
        return;
    }

    let voice = interaction.options.getString('voice');

    if (voice == null)
        voice = 'Brian';

    await interaction.deferReply();

    playTTS(interaction, text, voice, function (errorType?: string, errorMsg?: string) {
        if (errorType == undefined && errorMsg == undefined) {
            interaction.editReply('TTS: ' + text);
        }
        else if (errorType === 'permissionError' && errorMsg != undefined) {
            interaction.editReply(errorMsg);
            console.log('TTS permission error');
        }
        else {
            try {
                interaction.editReply('Failed!');
                console.log('TTS error = ' + JSON.stringify({errorType, errorMsg}));
            }
            catch (err) {
                interaction.editReply('Failed!');
                console.log('TTS error = ' + JSON.stringify({errorType, errorMsg}));
            }
        }
    });
}