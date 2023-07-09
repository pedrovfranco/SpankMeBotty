import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, APIApplicationCommandOptionChoice, AutocompleteInteraction } from 'discord.js';

import { alertAndLog, playTTS, readableNameVoices } from '../common/common';

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
        // .addChoices(...readableNameVoices.slice(0, 24).map<APIApplicationCommandOptionChoice<string>>(x=>({name: x, value: x})))
        .setAutocomplete(true)
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

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    console.log(focusedValue);
    const filtered = readableNameVoices.filter(voice => voice.toLowerCase().startsWith(focusedValue)).slice(0, 25); // Gets the first 25 results, this is the discord API limit for choises.
    await interaction.respond(
        filtered.map(choice => ({ name: choice, value: choice })),
    );
}
