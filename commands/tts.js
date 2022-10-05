const { SlashCommandBuilder } = require('discord.js');

const common = require('../common/common');


module.exports = {	
	data: new SlashCommandBuilder()
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
		),


    async execute(interaction) {
        
        if (!common.validObject(interaction.member) || !common.validObject(interaction.member.voice) || !common.validObject(interaction.member.voice.channel)) {
            common.alertAndLog(interaction, 'User not in a voice channel!');
            return;
        }

        const text = interaction.options.getString('text');
        let voice = interaction.options.getString('voice');

        if (voice == null)
            voice = 'Brian';

        await interaction.deferReply();

        common.playTTS(interaction, text, voice, (err) => {
            if (err == null) {
                interaction.editReply('TTS: ' + text);
            }
            else if (err?.errorType != null && err?.errorType === 'permissionError' && err?.errorMsg != null) {
                interaction.editReply(err.errorMsg);
                console.log('TTS permission error');
            }
            else {
                try {
                    interaction.editReply('Failed!');
                    console.log('TTS error = ' + JSON.stringify(err));
                }
                catch (err) {
                    interaction.editReply('Failed!');
                    console.log('TTS error = ' + JSON.stringify(err));
                }
            }
        });
    }
}